"use strict";

const lru = require("tiny-lru"),
	mmh3 = require("murmurhash3js").x86.hash32,
	{URL} = require("url"),
	regex = {
		implicitGet: /^(HEAD|GET|OPTIONS)$/,
		explicitGet: /^GET$/i,
		etag: /ETag:\s/i,
		headers: /^(cache-control|content-location|date|etag|expires|vary)$/,
		valid: /^(200|304)$/,
		nonCachable: /(no-cache|no-store)/
	};

function clone (arg) {
	return JSON.parse(JSON.stringify(arg, null, 0));
}

function parse (arg) {
	return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}

class ETag {
	constructor (cacheSize, cacheTTL, seed, notify) {
		this.cache = lru(cacheSize, notify, 0, cacheTTL);
		this.seed = seed;
	}

	create (arg) {
		return `"${this.hash(arg)}"`;
	}

	middleware (req, res, next) {
		const uri = (req.parsed || parse(req)).href,
			implicit = regex.implicitGet.test(req.method),
			cached = this.cache.get(this.hash(uri));

		res.on("finish", () => {
			const headers = res.getHeaders();

			if (implicit && regex.valid.test(res.statusCode) && this.valid(headers)) {
				this.register(uri, {
					etag: headers.etag,
					headers: headers,
					timestamp: cached ? cached.timestamp : Math.floor(new Date().getTime() / 1000)
				});
			}
		});

		if (cached !== void 0 && regex.explicitGet.test(req.method) && req.headers.range === void 0 && req.headers["if-none-match"] === cached.etag) {
			const headers = clone(cached.headers);

			headers.age = Math.floor(new Date().getTime() / 1000) - cached.timestamp;
			res.send("", 304, headers);
		} else {
			next();
		}
	}

	hash (arg) {
		return mmh3(arg, this.seed);
	}

	register (uri, arg) {
		const state = clone(arg);

		state.headers = Object.keys(state.headers).filter(i => regex.headers.test(i)).reduce((a, v) => {
			a[v] = state.headers[v];

			return a;
		}, {});

		this.cache.set(this.hash(uri), state);

		return this;
	}

	unregister (uri) {
		this.cache.remove(this.hash(uri));
	}

	valid (headers) {
		return headers.etag !== void 0 && (headers["cache-control"] === void 0 || regex.nonCachable.test(headers["cache-control"]) === false);
	}
}

module.exports = ETag;
