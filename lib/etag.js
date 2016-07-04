"use strict";

const path = require("path"),
	lru = require("tiny-lru"),
	mmh3 = require("murmurhash3js").x86.hash32,
	parse = require("tiny-parse"),
	regex = require(path.join(__dirname, "regex.js")),
	max = 1000,
	random = Math.floor(Math.random() * max) + 1;

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

class ETag {
	constructor ({cacheSize = max, seed = random} = {}) {
		this.cache = lru(cacheSize);
		this.seed = seed;
	}

	create (arg) {
		return "\"" + this.hash(arg) + "\"";
	}

	hash (arg) {
		return mmh3(arg, this.seed);
	}

	middleware (req, res, next) {
		const parsed = parse(req),
			implicit = regex.implicitGet.test(req.method);

		let cached, headers;

		res.on("finish", () => {
			if (implicit && !cached && res.statusCode < 400 && res._headers.etag) {
				this.register(parsed.href, {
					etag: res._headers.etag.replace(/"/g, ""),
					headers: clone(res._headers),
					timestamp: parseInt(new Date().getTime() / 1000, 10)
				});
			}
		});

		if (implicit && !req.headers.range && req.headers["if-none-match"] !== undefined) {
			cached = this.cache.get(this.hash(parsed.href));

			if (regex.explicitGet.test(req.method) && cached && (req.headers["if-none-match"] || "").replace(/\"/g, "") === cached.etag) {
				headers = clone(cached.headers);
				headers.age = parseInt(new Date().getTime() / 1000 - cached.timestamp, 10);
				res.writeHead(304, headers);
				res.end("");
			} else {
				next();
			}
		} else {
			next();
		}
	}

	register (uri, state) {
		let newState = {};

		Object.keys(state).forEach(key => {
			if (key !== "headers") {
				newState[key] = state[key];
			} else {
				newState[key] = {};
				Object.keys(state[key]).forEach(header => {
					if (!regex.invalid.test(header)) {
						newState[key][header] = state[key][header];
					}
				});
			}
		});

		this.cache.set(this.hash(uri), newState);

		return this;
	}
}

module.exports = ETag;
