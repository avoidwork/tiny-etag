/**
 * tiny-etag
 *
 * @copyright 2023 Jason Mulligan <jason.mulligan@avoidwork.com>
 * @license BSD-3-Clause
 * @version 4.0.1
 */
'use strict';

var tinyLru = require('tiny-lru');
var node_crypto = require('node:crypto');

const BASE64 = "base64";
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
const NO_STORE = "no-store";
const PRIVATE = "private";
const MAX_AGE_0 = "max-age=0";
const STRING = "string";

class ETag {
	constructor (cacheSize, cacheTTL, mimetype) {
		this.cache = tinyLru.lru(cacheSize, cacheTTL);
		this.mimetype = mimetype;
	}

	create (arg = EMPTY, mimetype = this.mimetype) {
		return `"${this.hash(arg, mimetype)}"`;
	}

	hash (arg = EMPTY, mimetype = this.mimetype) {
		const input = `${typeof arg === STRING ? arg : JSON.stringify(arg)}_${mimetype}`;

		return node_crypto.createHash(SHA1).update(input).digest(BASE64);
	}

	keep (arg) {
		return arg === CACHE_CONTROL || arg === CONTENT_LOCATION || arg === DATE || arg === ETAG || arg === EXPIRES || arg === VARY;
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
				const headers = structuredClone(cached.headers);

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
		return new URL(typeof arg === STRING ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
	}

	register (key, arg) {
		const state = structuredClone(arg);

		state.headers = Object.keys(state.headers).filter(i => this.keep(i.toLowerCase())).reduce((a, v) => {
			a[v] = state.headers[v];

			return a;
		}, {});

		this.cache.set(key, state);

		return this;
	}

	valid (headers) {
		const header = headers[CACHE_CONTROL] || EMPTY;

		return header.length === INT_0 || header.includes(NO_CACHE) === false && header.includes(NO_STORE) === false && header.includes(PRIVATE) === false && header.includes(MAX_AGE_0) === false;
	}
}

function etag ({cacheSize = INT_DETAULT_CACHE, cacheTTL = INT_0, mimetype = TEXT_PLAIN} = {}) {
	const obj = new ETag(cacheSize, cacheTTL, mimetype);

	obj.middleware = obj.middleware.bind(obj);

	return obj;
}

exports.ETag = ETag;
exports.etag = etag;
