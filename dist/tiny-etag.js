/**
 * tiny-etag
 *
 * @copyright 2023 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 4.0.0
 */
import {lru}from'tiny-lru';import {createHash}from'node:crypto';const BASE64 = "base64";
const SHA1 = "sha1";
const CACHE_CONTROL = "cache-control";
const CONTENT_LOCATION = "content-location";
const DATE = "date";
const ETAG = "etag";
const EXPIRES = "expires";
const VARY = "vary";
const TEXT_PLAIN = "text/plain";

const INT_DETAULT_CACHE = 1e3;
const INT_0 = 0;
const INT_200 = 200;
const INT_304 = 304;
const INT_1000 = 1000;

const GET = "GET";
const FINISH = "finish";
const RANGE = "range";
const IF_NONE_MATCH = "if-none-match";
const EMPTY = "";
const NO_CACHE = "no-cache";
const NO_STORE = "no-store";const clone = typeof structuredClone === "function" ? structuredClone : arg => JSON.parse(JSON.stringify(arg));

function hash (arg = "") {
	return createHash(SHA1).update(arg).digest(BASE64);
}

function keep (arg) {
	return arg === CACHE_CONTROL || arg === CONTENT_LOCATION || arg === DATE || arg === ETAG || arg === EXPIRES || arg === VARY;
}

function parse (arg) {
	return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}class ETag {
	constructor (cacheSize, cacheTTL, mimetype) {
		this.cache = lru(cacheSize, cacheTTL);
		this.mimetype = mimetype;
	}

	create (arg = EMPTY, mimetype = this.mimetype) {
		return `"${this.hash(arg, mimetype)}"`;
	}

	hash (arg = EMPTY, mimetype = this.mimetype) {
		return hash(`${arg}_${mimetype}`);
	}

	middleware (req, res, next) {
		if (req.method === GET) {
			const uri = (req.parsed || this.parse(req)).href,
				key = this.hash(uri, req.headers.accept),
				cached = this.cache.get(key);

			res.on(FINISH, () => {
				const headers = res.getHeaders(),
					status = res.statusCode;

				if ((status === INT_200 || status === INT_304) && ETAG in headers && this.valid(headers)) {
					this.register(key, {
						etag: headers.etag,
						headers: headers,
						timestamp: cached ? cached.timestamp : Math.floor(Date.now() / INT_1000)
					});
				}
			});

			if (cached !== void 0 && ETAG in cached && RANGE in req.headers === false && req.headers[IF_NONE_MATCH] === cached.etag) {
				const headers = clone(cached.headers);

				headers.age = Math.floor(Date.now() / INT_1000) - cached.timestamp;
				res.removeHeader(CACHE_CONTROL);
				res.send(EMPTY, INT_304, headers);
			} else {
				next();
			}
		} else {
			next();
		}
	}

	parse (arg) {
		return parse(arg);
	}

	register (key, arg) {
		const state = clone(arg);

		state.headers = Object.keys(state.headers).filter(i => keep(i.toLowerCase())).reduce((a, v) => {
			a[v] = state.headers[v];

			return a;
		}, {});

		this.cache.set(key, state);

		return this;
	}

	valid (headers) {
		const header = headers[CACHE_CONTROL] || EMPTY;

		return (header.includes(NO_CACHE) === false && header.includes(NO_STORE) === false) || header.length === INT_0; // eslint-disable-line no-extra-parens
	}
}

function etag ({cacheSize = INT_DETAULT_CACHE, cacheTTL = INT_0, mimetype = TEXT_PLAIN} = {}) {
	const obj = new ETag(cacheSize, cacheTTL, mimetype);

	obj.middleware = obj.middleware.bind(obj);

	return obj;
}export{ETag,etag};