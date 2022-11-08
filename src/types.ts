import { CancelableRequest, OptionsInit, Request } from "got";
import { SemVer } from "semver";

export interface BotOptions {
  apiUrl?: string;
  verbose?: boolean;
  defaultSummary?: string;
  concurrency?: number;
  sparqlEndpoint?: string;
  username?: string;
  password?: string;
}
export interface BotState {
  generator?: string;
  result?: string;
  token?: string;
}
export interface BotError extends Error {
  response?: MWQueryResponse;
}
export type MWVersion = SemVer;
export interface MWForm {
  action?: string;
  [x: string]: any;
}
export interface MWLoginForm extends MWForm {
  action: string;
  lgname: string;
  lgpassword: string;
  lgtoken?: string;
}
export interface MWLoginResponse {
  login?: {
    result?: string;
    token?: string;
  };
}
export interface MWQueryResponse {
  query?: any;
}
export interface Counter {
  total: number;
  resolved: number;
  fulfilled: number;
  rejected: number;
}
export type RequestOptions = OptionsInit;
export type GotRequest = CancelableRequest<Request>;
