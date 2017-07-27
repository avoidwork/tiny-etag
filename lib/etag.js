"use strict";

const lru = require("tiny-lru"),
	mmh3 = require("murmurhash3js").x86.hash32,
	parse = require("tiny-parse"),
	each = require("retsu").each,
	max = 1000,
	random = Math.floor(Math.random() * max) + 1,
	getHeaders = Number(process.version.replace("v", "").split(".")[0]) >= 7,
	regex = {
		implicitGet: /^(HEAD|GET|OPTIONS)$/,
		explicitGet: /^GET$/i,
		etag: /ETag:\s/i,
		invalid: /^(a|cache|connection|content-(d|e|l|m|r)|d|ex|l|p|r|s|t|u|v|w|x)/,
		valid: /^(200|304)$/,
		nonCachable: /no-cache|no-store|private/
	};

function clone (arg) {
	return JSON.parse(JSON.stringify(arg, null, 0));
}

function trim (obj) {
	return obj.replace(/^(\s+|\t+|\r+|\n+)|(\s+|\t+|\r+|\n+)$/g, "");
}

class ETag {
	constructor ({cacheSize = max, seed = random, notify = false, onchange = () => {}} = {}) {
		this.cache = lru(cacheSize);
		this.cache.notify = notify;
		this.cache.onchange = onchange;
		this.seed = seed;
	}

	create (arg) {
		return "\"" + this.hash(arg) + "\"";
	}

	hash (arg) {
		return mmh3(arg.toString(), this.seed);
	}

	middleware () {
		const obj = this;

		return function etag (req, res, next) {
			const parsed = parse(req),
				implicit = regex.implicitGet.test(req.method),
				cached = obj.cache.get(obj.hash(parsed.href));

			res.on("finish", () => {
				const headers = getHeaders ? res.getHeaders() : {};

				if (!getHeaders) {
					each(trim(res._header).split(/\r\n/), row => {
						let i = row.split(/:\s/);

						if (i[1] !== undefined) {
							headers[i[0].toLowerCase()] = i[1];
						}
					});
				}

				if (implicit && regex.valid.test(res.statusCode) && headers.etag !== void 0) {
					if (obj.valid(headers)) {
						obj.register(parsed.href, {
							etag: headers.etag,
							headers: headers,
							timestamp: cached ? cached.timestamp : parseInt(new Date().getTime() / 1000, 10)
						});
					}
				}
			});

			if (regex.explicitGet.test(req.method) && cached && !req.headers.range && (req.headers["if-none-match"] || "") === cached.etag) {
				const headers = clone(cached.headers);

				headers.age = parseInt(new Date().getTime() / 1000 - cached.timestamp, 10);
				res.statusCode = 304;
				res.writeHead(304, headers);
				res.end("");
			} else {
				next();
			}
		};
	}

	register (uri, state) {
		let newState = {};

		each(Reflect.ownKeys(state), key => {
			if (key !== "headers") {
				newState[key] = state[key];
			} else {
				newState[key] = {};
				each(Reflect.ownKeys(state[key]), header => {
					if (!regex.invalid.test(header)) {
						newState[key][header] = state[key][header];
					}
				});
			}
		});

		this.cache.set(this.hash(uri), newState);

		return this;
	}

	unregister (uri) {
		this.cache.remove(this.hash(uri));
	}

	valid (headers) {
		return headers["cache-control"] === void 0 || !regex.nonCachable.test(headers["cache-control"]);
	}
}

module.exports = ETag;
