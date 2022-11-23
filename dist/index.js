import fs from "node:fs/promises";
import got from "got";
import semver from "semver";
import { CookieJar } from "tough-cookie";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import FormData from "form-data";
const __dirname = dirname(fileURLToPath(import.meta.url)), packageJson = JSON.parse(await fs.readFile(join(__dirname, "../package.json"), "utf8"));
export default class MWBot {
    state;
    loggedIn;
    editToken;
    createAccountToken;
    mwVersion;
    counter;
    options;
    requestOptions;
    constructor(options, requestOptions = {}) {
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
            sparqlEndpoint: "https://query.wikidata.org/bigdata/namespace/wdq/sparql",
        };
        this.setOptions(options);
        this.requestOptions = {
            method: "POST",
            headers: {
                "User-Agent": `mwbot/${packageJson.version}`,
            },
            resolveBodyOnly: false,
            form: {},
            searchParams: {
                format: "json",
            },
            timeout: {
                request: 120000,
            },
            cookieJar: new CookieJar(),
        };
        this.setRequestOptions(requestOptions);
    }
    setOptions(options) {
        this.options = merge(this.options, options);
    }
    setRequestOptions(requestOptions) {
        delete requestOptions.resolveBodyOnly;
        this.requestOptions = merge(this.requestOptions, requestOptions);
    }
    setApiUrl(apiUrl) {
        this.options.apiUrl = apiUrl;
    }
    async getSiteInfo() {
        const response = await this.request({
            action: "query",
            meta: "siteinfo",
            siprop: "general",
        });
        if (response.query?.general) {
            this.state = merge(this.state, response.query.general);
            return this.state;
        }
        else {
            throw new Error("Could not get siteinfo");
        }
    }
    async getEditToken() {
        if (this.editToken)
            return this.editToken;
        await this.refreshEditToken();
        return this.editToken;
    }
    async refreshEditToken() {
        const response = await this.request({
            action: "query",
            meta: "tokens",
            type: "csrf",
        });
        if (response.query?.tokens?.csrftoken) {
            this.editToken = response.query.tokens.csrftoken;
            this.state = merge(this.state, response.query.tokens);
            return this.state;
        }
        else {
            this.log("Could not get edit token");
            const err = new Error("Could not get edit token");
            err.response = response;
            throw err;
        }
    }
    async getCreateAccountToken() {
        if (this.createAccountToken)
            return this.createAccountToken;
        await this.refreshCreateAccountToken();
        return this.createAccountToken;
    }
    async refreshCreateAccountToken() {
        const response = await this.request({
            action: "query",
            meta: "tokens",
            type: "createaccount",
        });
        if (response.query?.tokens?.createaccount) {
            this.editToken = response.query.tokens.createaccount;
            this.state = merge(this.state, response.query.tokens);
            return this.state;
        }
        else {
            this.log("Could not get account creation token");
            const err = new Error("Could not get account creation token");
            err.response = response;
            throw err;
        }
    }
    login(options) {
        this.options = merge(this.options, options);
        const { username, password, apiUrl } = this.options;
        if (!username || !password || !apiUrl) {
            throw new Error("Missing login credentials.");
        }
        const loginForm = {
            action: "login",
            lgname: username,
            lgpassword: password,
        };
        const loginString = `${username}@${apiUrl.split("/api.php").join("")}`;
        return this.request(loginForm)
            .then((loginResponse) => {
            if (!loginResponse.login?.result) {
                this.log(`Login failed with invalid response: ${loginString}`);
                throw new Error("Invalid response from API.");
            }
            else {
                this.state = merge(this.state, loginResponse.login);
                loginForm.lgtoken = loginResponse.login.token;
                return this.request(loginForm);
            }
        })
            .then((tokenResponse) => {
            if (tokenResponse.login?.result === "Success") {
                this.state = merge(this.state, tokenResponse.login);
                this.loggedIn = true;
            }
            else {
                this.log(`Login failed: ${loginString}`);
                throw new Error(`Could not login: ${tokenResponse.login?.result ?? "Unknown reason"}`);
            }
        })
            .then(() => this.getSiteInfo())
            .then(() => {
            this.mwVersion = semver.coerce(this.state.generator);
            if (!semver.valid(this.mwVersion)) {
                throw new Error(`Invalid MediaWiki version: ${JSON.stringify(this.mwVersion)}`);
            }
            else {
                return this.state;
            }
        });
    }
    async loginGetEditToken(loginOptions) {
        await this.login(loginOptions);
        await this.refreshEditToken();
        return this.getEditToken();
    }
    async loginGetCreateAccountToken(loginOptions) {
        await this.login(loginOptions);
        await this.refreshCreateAccountToken();
        return this.getCreateAccountToken();
    }
    async update(title, content, summary, customRequestOptions) {
        return this.request({
            action: "edit",
            title,
            text: content,
            summary: summary ?? this.options.defaultSummary,
            token: await this.getEditToken(),
            nocreate: true,
            bot: true,
        }, customRequestOptions);
    }
    async updateFromID(pageid, content, summary, customRequestOptions) {
        return this.request({
            action: "edit",
            pageid,
            text: content,
            summary: summary ?? this.options.defaultSummary,
            token: await this.getEditToken(),
            nocreate: true,
            bot: true,
        }, customRequestOptions);
    }
    async delete(title, reason, customRequestOptions) {
        return this.request({
            action: "delete",
            title,
            reason: reason ?? this.options.defaultSummary,
            token: await this.getEditToken(),
            bot: true,
        }, customRequestOptions);
    }
    async protect(title, reason, customRequestOptions) {
        return this.request({
            action: "protect",
            title,
            protections: "edit=sysop",
            expiry: "infinite",
            reason: reason ?? this.options.defaultSummary,
            token: await this.getEditToken(),
        }, customRequestOptions);
    }
    async move(oldTitle, newTitle, reason, customRequestOptions) {
        return this.request({
            action: "move",
            from: oldTitle,
            to: newTitle,
            reason: reason ?? this.options.defaultSummary,
            token: await this.getEditToken(),
            bot: true,
        }, customRequestOptions);
    }
    async upload(title, file, comment = "", formOptions, customRequestOptions) {
        if (typeof file === "string") {
            if (!title)
                title = basename(file);
            file = await fs.readFile(file, null);
        }
        if (!title)
            throw new Error("No title provided for upload");
        const form = merge({
            action: "upload",
            filename: title,
            comment,
            file,
            token: await this.getEditToken(),
        }, formOptions), formData = new FormData();
        for (const [name, value] of Object.entries(form)) {
            formData.append(name, value);
        }
        const uploadOptions = merge(this.requestOptions, customRequestOptions, {
            method: "POST",
            body: formData,
            form: null,
        });
        return this.request({}, uploadOptions);
    }
    uploadOverwrite(title, file, comment, formOptions, customRequestOptions) {
        return this.upload(title, file, comment, merge({ ignorewarnings: 1 }, formOptions), customRequestOptions);
    }
    async edit(title, content, summary, customRequestOptions) {
        return this.request({
            action: "edit",
            title,
            text: content,
            summary: summary ?? this.options.defaultSummary,
            token: await this.getEditToken(),
            bot: true,
        }, customRequestOptions);
    }
    async create(title, content, summary, customRequestOptions) {
        const editForm = {
            action: "edit",
            title,
            text: content,
            token: await this.getEditToken(),
            summary: summary ?? this.options.defaultSummary,
            createonly: true,
            bot: true,
        };
        return this.request(editForm, customRequestOptions);
    }
    read(title, redirect = true, customRequestOptions) {
        return this.readWithProps(title, "content", redirect, customRequestOptions);
    }
    readWithProps(title, props, redirect = true, customRequestOptions) {
        const form = {
            action: "query",
            prop: "revisions",
            rvprop: props,
            titles: title,
        };
        if (semver.gte(this.mwVersion, "1.32.0"))
            form.rvslots = "main";
        if (redirect)
            form.redirects = "true";
        return this.request(form, customRequestOptions);
    }
    readFromID(pageid, redirect = true, customRequestOptions) {
        return this.readWithPropsFromID(pageid, "content", redirect, customRequestOptions);
    }
    readWithPropsFromID(pageid, props, redirect = true, customRequestOptions) {
        const form = {
            action: "query",
            prop: "revisions",
            rvprop: props,
            pageids: pageid,
        };
        if (semver.gte(this.mwVersion, "1.32.0"))
            form.rvslots = "main";
        if (redirect)
            form.redirects = "true";
        return this.request(form, customRequestOptions);
    }
    request(params, customRequestOptions = {}) {
        return this.requestJSON(params, customRequestOptions);
    }
    requestJSON(params, customRequestOptions = {}) {
        const requestOptions = this.prepareRequest(params, customRequestOptions);
        return this.rawRequestJSON(requestOptions);
    }
    requestText(params, customRequestOptions = {}) {
        const requestOptions = this.prepareRequest(params, customRequestOptions);
        return this.rawRequestText(requestOptions);
    }
    prepareRequest(params, customRequestOptions) {
        if (!this.requestOptions.url)
            this.requestOptions.url = this.options.apiUrl;
        const requestOptions = merge(this.requestOptions, customRequestOptions);
        requestOptions.form = merge(requestOptions.form, params);
        return requestOptions;
    }
    async rawRequestJSON(requestOptions) {
        this.counter.total++;
        this.counter.resolved++;
        try {
            const body = await this.rawRequest(requestOptions).json();
            this.counter.fulfilled++;
            return body;
        }
        catch (error) {
            this.counter.rejected++;
            throw error;
        }
    }
    async rawRequestText(requestOptions) {
        this.counter.total++;
        this.counter.resolved++;
        try {
            const body = await this.rawRequest(requestOptions).text();
            this.counter.fulfilled++;
            return body;
        }
        catch (error) {
            this.counter.rejected++;
            throw error;
        }
    }
    rawRequest(requestOptions) {
        return got(requestOptions);
    }
    log(log) {
        if (this.options.verbose)
            console.log(`[mwbot] ${log}`);
    }
    askQuery(query, apiUrl, customRequestOptions) {
        apiUrl = apiUrl ?? this.options.apiUrl;
        const form = {
            action: "ask",
            query,
        }, requestOptions = merge({
            url: apiUrl,
            form,
        }, customRequestOptions);
        return this.rawRequest(requestOptions);
    }
    sparqlQuery(query, apiUrl, customRequestOptions) {
        apiUrl = apiUrl ?? this.options.apiUrl;
        const form = {
            query,
            format: "json",
        }, requestOptions = merge({
            url: apiUrl,
            form,
        }, customRequestOptions);
        return this.rawRequest(requestOptions);
    }
    get version() {
        return packageJson.version;
    }
}
export function merge(...items) {
    return Object.assign({}, ...items);
}
export function getFirstValue(object) {
    return Object.values(object)[0];
}
