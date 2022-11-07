import fs from "node:fs/promises";
import got from "got";
import semver, { SemVer } from "semver";
import {
  Counter,
  BotOptions,
  BotState,
  MWVersion,
  RequestOptions,
  GotRequest,
  MWLoginResponse,
  MWLoginForm,
  MWQueryResponse,
  BotError,
} from "./types.js";
import { CookieJar } from "tough-cookie";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url)),
  packageJson = JSON.parse(
    await fs.readFile(join(__dirname, "../package.json"), "utf8")
  );

export default class MWBot {
  state: BotState;
  loggedIn: boolean;
  editToken: string;
  createAccountToken: string;
  mwVersion: MWVersion;
  counter: Counter;
  options: BotOptions;
  requestOptions: RequestOptions;

  constructor(options: BotOptions, requestOptions: RequestOptions) {
    this.state = {};
    this.loggedIn = false;
    this.editToken = null;
    this.createAccountToken = null;
    this.mwVersion = semver.coerce("0.0.0");
    this.counter = {
      total: 0,
      resolved: 0,
      fulfilled: 0,
      rejected: 0,
    };
    this.options = {
      verbose: false,
      defaultSummary: "MWBot",
      concurrency: 1,
      apiUrl: null,
      sparqlEndpoint: "https://query.wikidata.org/bigdata/namespace/wdq/sparql", // Wikidata
    };
    this.setOptions(options);

    this.requestOptions = {
      method: "POST",
      headers: {
        "User-Agent": `mwbot/${packageJson.version}`,
      },
      resolveBodyOnly: false,
      form: {},
      timeout: {
        request: 120000,
      },
      cookieJar: new CookieJar(),
    };
    this.setRequestOptions(requestOptions);
  }

  /**
   * Sets and overwrites mwbot options.
   *
   * @param options
   */
  setOptions(options: BotOptions): void {
    this.options = MWBot.merge(this.options, options);
  }

  /**
   * Sets and overwrites request options.
   *
   * @param requestOptions
   */
  setRequestOptions(requestOptions: RequestOptions): void {
    delete requestOptions.resolveBodyOnly;
    this.requestOptions = MWBot.merge(this.requestOptions, requestOptions);
  }

  setApiUrl(apiUrl: string): void {
    this.options.apiUrl = apiUrl;
  }

  request<E>(params: Object, customRequestOptions: RequestOptions = {}) {
    return this.requestJSON<E>(params, customRequestOptions);
  }

  requestJSON<E>(params: Object, customRequestOptions: RequestOptions = {}) {
    const requestOptions = this.prepareRequest(params, customRequestOptions);
    return this.rawRequestJSON<E>(requestOptions);
  }

  requestText(params: Object, customRequestOptions: RequestOptions = {}) {
    const requestOptions = this.prepareRequest(params, customRequestOptions);
    return this.rawRequestText(requestOptions);
  }

  prepareRequest(params: Object, customRequestOptions: RequestOptions) {
    if (!this.requestOptions.url) this.requestOptions.url = this.options.apiUrl;
    let requestOptions = MWBot.merge(this.requestOptions, customRequestOptions);
    requestOptions.form = MWBot.merge(requestOptions.form, params);
    return requestOptions;
  }

  login(options: BotOptions): Promise<BotState> {
    this.options = MWBot.merge(this.options, options);
    const { username, password, apiUrl } = this.options;
    if (!username || !password || !apiUrl) {
      throw new Error("Missing login credentials.");
    }
    const loginForm: MWLoginForm = {
      action: "login",
      lgname: username,
      lgpassword: password,
    };

    const loginString = `${username}@${apiUrl.split("/api.php").join("")}`;

    return this.request<MWLoginResponse>(loginForm)
      .then((loginResponse) => {
        if (!loginResponse.login?.result) {
          this.log(`Login failed with invalid response: ${loginString}`);
          throw new Error("Invalid response from API.");
        } else {
          this.state = MWBot.merge(this.state, loginResponse.login);
          loginForm.lgtoken = loginResponse.login.token;
          return this.request<MWLoginResponse>(loginForm);
        }
      })
      .then((tokenResponse) => {
        if (tokenResponse.login?.result === "Success") {
          this.state = MWBot.merge(this.state, tokenResponse.login);
          this.loggedIn = true;
        } else {
          this.log(`Login failed: ${loginString}`);
          throw new Error(
            `Could not login: ${
              tokenResponse.login?.result ?? "Unknown reason"
            }`
          );
        }
      })
      .then(() => this.getSiteInfo())
      .then(() => {
        this.mwVersion = semver.coerce(this.state.generator);
        if (!semver.valid(this.mwVersion)) {
          throw new Error(
            `Invalid MediaWiki version: ${JSON.stringify(this.mwVersion)}`
          );
        } else {
          return this.state;
        }
      });
  }

  async getSiteInfo() {
    const response = await this.request<MWQueryResponse>({
      action: "query",
      meta: "siteinfo",
      siprop: "general",
    });
    if (response.query?.general) {
      return this.state;
    } else {
      throw new Error("Could not get siteinfo");
    }
  }

  async getEditToken() {
    if (this.editToken) return this.editToken;
    await this.refreshEditToken();
    return this.editToken;
  }

  async refreshEditToken() {
    const response = await this.request<MWQueryResponse>({
      action: "query",
      meta: "tokens",
      type: "csrf",
    });
    if (response.query?.tokens?.csrftoken) {
      this.editToken = response.query.tokens.csrftoken;
      this.state = MWBot.merge(this.state, response.query.tokens);
      return this.state;
    } else {
      this.log("Could not get edit token");
      const err: BotError = new Error("Could not get edit token");
      err.response = response;
      throw err;
    }
  }

  async getCreateAccountToken() {
    if (this.createAccountToken) return this.createAccountToken;
    await this.refreshCreateAccountToken();
    return this.createAccountToken;
  }

  async refreshCreateAccountToken() {
    const response = await this.request<MWQueryResponse>({
      action: "query",
      meta: "tokens",
      type: "createaccount",
    });
    if (response.query?.tokens?.createaccount) {
      this.editToken = response.query.tokens.createaccount;
      this.state = MWBot.merge(this.state, response.query.tokens);
      return this.state;
    } else {
      this.log("Could not get account creation token");
      const err: BotError = new Error("Could not get account creation token");
      err.response = response;
      throw err;
    }
  }

  async loginGetEditToken(loginOptions: BotOptions) {
    await this.login(loginOptions);
    await this.refreshEditToken();
    return this.getEditToken();
  }

  async loginGetCreateAccountToken(loginOptions: BotOptions) {
    await this.login(loginOptions);
    await this.refreshCreateAccountToken();
    return this.getCreateAccountToken();
  }

  async rawRequestJSON<E = Object>(requestOptions: RequestOptions): Promise<E> {
    this.counter.total++;
    this.counter.resolved++;
    try {
      const body = await this.rawRequest(requestOptions).json();
      this.counter.fulfilled++;
      return body as E;
    } catch (error) {
      this.counter.rejected++;
      throw error;
    }
  }

  async rawRequestText(requestOptions: RequestOptions): Promise<string> {
    this.counter.total++;
    this.counter.resolved++;
    try {
      const body = await this.rawRequest(requestOptions).text();
      this.counter.fulfilled++;
      return body as string;
    } catch (error) {
      this.counter.rejected++;
      throw error;
    }
  }

  rawRequest(requestOptions: RequestOptions): GotRequest {
    return got(requestOptions) as GotRequest;
  }

  log(log: string) {
    if (this.options.verbose) console.log(`[mwbot] ${log}`);
  }

  get version(): string {
    return packageJson.version;
  }

  static merge<E>(a: E, b: E): E {
    return {
      ...a,
      ...b,
    };
  }
}
