"use strict";

const lru = require("tiny-lru"),
	mmh3 = require("murmurhash3js").x86.hash32,
	parse = require("tiny-parse"),
	max = 1000,
	random = Math.floor(Math.random() * max) + 1,
	regex = {
		implicitGet: /^(HEAD|GET|OPTIONS)$/,
		explicitGet: /^GET$/i,
		etag: /ETag:\s/i,
		invalid: /^(a|cache|connection|content-(d|e|l|m|r)|d|ex|l|p|r|s|t|u|v|w|x)/
	};

function clone (arg) {
	return JSON.parse(JSON.stringify(arg));
}

function trim (obj) {
	return obj.replace(/^(\s+|\t+|\r+|\n+)|(\s+|\t+|\r+|\n+)$/g, "");
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
		return mmh3(arg.toString(), this.seed);
	}

	middleware () {
		const obj = this;

		return function etag (req, res, next) {
			const parsed = parse(req),
				implicit = regex.implicitGet.test(req.method);

			let cached = obj.cache.get(obj.hash(parsed.href)),
				headers;

			res.on("finish", () => {
				if (implicit && res.statusCode === 200 && regex.etag.test(res._header)) {
					let lheaders = {};

					trim(res._header).split(/\r\n/).forEach(row => {
						let i = row.split(/:\s/);

						if (i[1] !== undefined) {
							lheaders[i[0].toLowerCase()] = i[1];
						}
					});

					obj.register(parsed.href, {
						etag: lheaders.etag,
						headers: lheaders,
						timestamp: parseInt(new Date().getTime() / 1000, 10)
					});
				}
			});

			if (regex.explicitGet.test(req.method) && cached && !req.headers.range && (req.headers["if-none-match"] || "") === cached.etag) {
				headers = clone(cached.headers);
				headers.age = parseInt(new Date().getTime() / 1000 - cached.timestamp, 10);
				res.writeHead(304, headers);
				res.end("");
			} else {
				next();
			}
		};
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
