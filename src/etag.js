import {lru} from "tiny-lru";
import {createHash} from "node:crypto";
import {
	CACHE_CONTROL,
	EMPTY,
	ETAG,
	FINISH,
	GET,
	IF_NONE_MATCH,
	INT_0,
	INT_1000,
	INT_200,
	INT_304,
	INT_DETAULT_CACHE,
	PRIVATE,
	NO_CACHE,
	NO_STORE,
	RANGE,
	TEXT_PLAIN, SHA1, BASE64, CONTENT_LOCATION, DATE, EXPIRES, VARY, MAX_AGE_0
} from "./constants.js";

export class ETag {
	constructor (cacheSize, cacheTTL, mimetype) {
		this.cache = lru(cacheSize, cacheTTL);
		this.mimetype = mimetype;
	}

	create (arg = EMPTY, mimetype = this.mimetype) {
		return `"${this.hash(arg, mimetype)}"`;
	}

	hash (arg = "") {
		return createHash(SHA1).update(arg).digest(BASE64);
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
		return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
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

export function etag ({cacheSize = INT_DETAULT_CACHE, cacheTTL = INT_0, mimetype = TEXT_PLAIN} = {}) {
	const obj = new ETag(cacheSize, cacheTTL, mimetype);

	obj.middleware = obj.middleware.bind(obj);

	return obj;
}
