import fs from "node:fs/promises";
import got, { GotOptions } from "got";
import semver from "semver";
import { Counter, BotOptions, BotState, MWVersion } from "./types.js";

export default class MWBot {
  state: BotState;
  loggedIn: boolean;
  editToken: string;
  createAccountToken: string;
  mwVersion: MWVersion;
  counter: Counter;
  defaultOptions: BotOptions;
  customOptions: BotOptions;
  options: BotOptions;

  constructor(options: BotOptions, requestOptions: GotOptions<string>) {
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
  }

  static merge(a: Object, b: Object): Object {
    return {
      ...a,
      ...b,
    };
  }
}
