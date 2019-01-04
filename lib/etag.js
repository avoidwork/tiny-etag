"use strict";

const lru = require("tiny-lru"),
	mmh3 = require("murmurhash3js").x86.hash32,
	{URL} = require("url");

function clone (arg) {
	return JSON.parse(JSON.stringify(arg, null, 0));
}

function keep (arg) {
	return arg === "cache-control" || arg === "content-location" || arg === "date" || arg === "etag" || arg === "expires" || arg === "vary";
}

function parse (arg) {
	return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}

class ETag {
	constructor (cacheSize, cacheTTL, seed, mimetype) {
		this.cache = lru(cacheSize, cacheTTL);
		this.mimetype = mimetype;
		this.seed = seed;
	}

	create (arg) {
		return `"${mmh3(arg, this.seed)}"`;
	}

	middleware (req, res, next) {
		if (req.method === "GET") {
			const uri = (req.parsed || parse(req)).href,
				key = this.hash(uri, req.headers.accept),
				cached = this.cache.get(key);

			res.on("finish", () => {
				const headers = res.getHeaders(),
					status = res.statusCode;

				if ((status === 200 || status === 304) && this.valid(headers)) {
					this.register(key, {
						etag: headers.etag,
						headers: headers,
						timestamp: cached ? cached.timestamp : Math.floor(new Date().getTime() / 1000)
					});
				}
			});

			if (cached !== void 0 && req.headers.range === void 0 && req.headers["if-none-match"] === cached.etag) {
				const headers = clone(cached.headers);

				headers.age = Math.floor(new Date().getTime() / 1000) - cached.timestamp;
				res.send("", 304, headers);
			} else {
				next();
			}
		} else {
			next();
		}
	}

	hash (arg = "", mimetype = "") {
		return this.create(`${arg}_${mimetype || this.mimetype}`);
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

	unregister (key) {
		this.cache.remove(key);
	}

	valid (headers) {
		const header = headers["cache-control"];
		let result;

		if (headers.etag !== void 0 && header === void 0) {
			result = true;
		} else {
			result = header.indexOf("no-cache") === -1 && header.indexOf("no-store") === -1;
		}

		return result;
	}
}

module.exports = ETag;
