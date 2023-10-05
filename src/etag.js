import {lru} from "tiny-lru";
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
	NO_CACHE,
	NO_STORE,
	RANGE,
	TEXT_PLAIN
} from "./constants.js";

import {clone, hash, keep, parse} from "./utils.js";

export class ETag {
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

		return header.length === INT_0 || header.includes(NO_CACHE) === false && header.includes(NO_STORE) === false;
	}
}

export function etag ({cacheSize = INT_DETAULT_CACHE, cacheTTL = INT_0, mimetype = TEXT_PLAIN} = {}) {
	const obj = new ETag(cacheSize, cacheTTL, mimetype);

	obj.middleware = obj.middleware.bind(obj);

	return obj;
}
