import { OptionsInit } from "got";
import {
  BotOptions,
  BotState,
  MWVersion,
  Counter,
  RequestOptions,
  MWForm,
  MWQueryResponse,
  GotRequest,
} from "./types.js";

export default mwbot;

declare class mwbot {
  state: BotState;
  loggedIn: boolean;
  editToken: string;
  createAccountToken: string;
  mwVersion: MWVersion;
  counter: Counter;
  options: BotOptions;
  requestOptions: RequestOptions;
  version: string;

  constructor(options: BotOptions);
  constructor(options: BotOptions, requestOptions: RequestOptions);

  setOptions(options: BotOptions): void;
  setRequestOptions(requestOptions: RequestOptions): void;

  setApiUrl(apiUrl: string): void;
  getSiteInfo(): Promise<BotState>;
  getEditToken(): Promise<string>;
  refreshEditToken(): Promise<BotState>;
  getCreateAccountToken(): Promise<string>;
  refreshCreateAccountToken(): Promise<BotState>;

  login(options: BotOptions): Promise<BotState>;
  loginGetEditToken(loginOptions: BotOptions): Promise<string>;
  loginGetCreateAccountToken(loginOptions: BotOptions): Promise<string>;

  update(title: string, content: string): Promise<unknown>;
  update(title: string, content: string, summary: string): Promise<unknown>;
  update(
    title: string,
    content: string,
    summary: string,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;
  updateFromID(pageid: number, content: string): Promise<unknown>;
  updateFromID(
    pageid: number,
    content: string,
    summary: string
  ): Promise<unknown>;
  updateFromID(
    pageid: number,
    content: string,
    summary: string,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;

  delete(title: string): Promise<unknown>;
  delete(title: string, reason: string): Promise<unknown>;
  delete(
    title: string,
    reason: string,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;

  protect(title: string): Promise<unknown>;
  protect(title: string, reason: string): Promise<unknown>;
  protect(
    title: string,
    reason: string,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;

  move(oldTitle: string, newTitle: string): Promise<unknown>;
  move(oldTitle: string, newTitle: string, reason: string): Promise<unknown>;
  move(
    oldTitle: string,
    newTitle: string,
    reason: string,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;

  upload(title: string, file: string | Buffer): Promise<unknown>;
  upload(
    title: string,
    file: string | Buffer,
    content: string
  ): Promise<unknown>;
  upload(
    title: string,
    file: string | Buffer,
    content: string,
    formOptions: MWForm
  ): Promise<unknown>;
  upload(
    title: string,
    file: string | Buffer,
    content: string,
    formOptions: MWForm,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;
  uploadOverwrite(title: string, file: string | Buffer): Promise<unknown>;
  uploadOverwrite(
    title: string,
    file: string | Buffer,
    content: string
  ): Promise<unknown>;
  uploadOverwrite(
    title: string,
    file: string | Buffer,
    content: string,
    formOptions: MWForm
  ): Promise<unknown>;
  uploadOverwrite(
    title: string,
    file: string | Buffer,
    content: string,
    formOptions: MWForm,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;

  edit(title: string, content: string): Promise<unknown>;
  edit(title: string, content: string, summary: string): Promise<unknown>;
  edit(
    title: string,
    content: string,
    summary: string,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;

  create(title: string, content: string): Promise<unknown>;
  create(title: string, content: string, summary: string): Promise<unknown>;
  create(
    title: string,
    content: string,
    summary: string,
    customRequestOptions: RequestOptions
  ): Promise<unknown>;

  read(title: string): Promise<MWQueryResponse>;
  read(title: string, redirect: boolean): Promise<MWQueryResponse>;
  read(
    title: string,
    redirect: boolean,
    customRequestOptions: RequestOptions
  ): Promise<MWQueryResponse>;
  readWithProps(title: string, props: string): Promise<MWQueryResponse>;
  readWithProps(
    title: string,
    props: string,
    redirect: boolean
  ): Promise<MWQueryResponse>;
  readWithProps(
    title: string,
    props: string,
    redirect: boolean,
    customRequestOptions: RequestOptions
  ): Promise<MWQueryResponse>;
  readWithPropsFromID(pageid: number, props: string): Promise<MWQueryResponse>;
  readWithPropsFromID(
    pageid: number,
    props: string,
    redirect: boolean
  ): Promise<MWQueryResponse>;
  readWithPropsFromID(
    pageid: number,
    props: string,
    redirect: boolean,
    customRequestOptions: RequestOptions
  ): Promise<MWQueryResponse>;

  request<E>(params: any): Promise<E>;
  request<E>(params: any, customRequestOptions: RequestOptions): Promise<E>;
  requestJSON<E>(params: any): Promise<E>;
  requestJSON<E>(params: any, customRequestOptions: RequestOptions): Promise<E>;
  requestText(params: any): Promise<string>;
  requestText(
    params: any,
    customRequestOptions: RequestOptions
  ): Promise<string>;

  prepareRequest(
    params: any,
    customRequestOptions: RequestOptions
  ): Promise<OptionsInit>;

  rawRequestJSON<E>(requestOptions: RequestOptions): Promise<E>;
  rawRequestText(requestOptions: RequestOptions): Promise<string>;
  rawRequest(requestOptions: RequestOptions): GotRequest;

  log(log: string): void;

  askQuery(query: string): GotRequest;
  askQuery(query: string, apiUrl: string): GotRequest;
  askQuery(
    query: string,
    apiUrl: string,
    customRequestOptions: RequestOptions
  ): GotRequest;

  sparqlQuery(query: string): GotRequest;
  sparqlQuery(query: string, apiUrl: string): GotRequest;
  sparqlQuery(
    query: string,
    apiUrl: string,
    customRequestOptions: RequestOptions
  ): GotRequest;
}

export declare function merge<E>(...items: E[]): E;
export declare function getFirstValue(object: any): unknown;
