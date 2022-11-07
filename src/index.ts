import fs from "node:fs/promises";
import got from "got";
import semver from "semver";
import {
  Counter,
  BotOptions,
  BotState,
  MWVersion,
  RequestOptions,
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
  customOptions: BotOptions;
  options: BotOptions;
  customRequestOptions: RequestOptions;
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
    this.customOptions = options ?? {};
    this.options = MWBot.merge(
      {
        verbose: false,
        silent: false,
        defaultSummary: "MWBot",
        concurrency: 1,
        apiUrl: false,
        sparqlEndpoint:
          "https://query.wikidata.org/bigdata/namespace/wdq/sparql", // Wikidata
      },
      this.customOptions
    );
    this.customRequestOptions = requestOptions ?? {};
    this.requestOptions = MWBot.merge<RequestOptions>(
      {
        method: "POST",
        headers: {
          "User-Agent": `mwbot/${packageJson.version}`,
        },
        responseType: "json",
        form: {},
        timeout: {
          request: 120000,
        },
        cookieJar: new CookieJar(),
      },
      this.customRequestOptions
    );
  }

  static merge<E>(a: E, b: E): E {
    return {
      ...a,
      ...b,
    };
  }
}
