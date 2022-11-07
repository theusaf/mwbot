import fs from "node:fs/promises";
import got from "got";
import semver from "semver";
import {
  Counter,
  BotOptions,
  BotState,
  MWVersion,
  RequestOptions,
  GotRequest,
  MWLoginResponse,
  MWLoginForm,
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
    this.mwVersion = {};
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

  async login(options: BotOptions): Promise<void> {
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

    const loginResponse = await this.request<MWLoginResponse>(loginForm);
    if (!loginResponse.login?.result) {
      this.log(
        `Login failed with invalid response: ${username}@${apiUrl
          .split("/api.php")
          .join("")}`
      );
      throw new Error("Invalid response from API.");
    } else {
      this.state = MWBot.merge(this.state, loginResponse.login);
      loginForm.lgtoken = loginResponse.login.token;
      return this.request(loginForm);
    }
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
