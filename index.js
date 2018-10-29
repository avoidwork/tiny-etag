"use strict";

const path = require("path"),
	ETag = require(path.join(__dirname, "lib", "etag.js"));

function factory ({cacheSize = 1e3, cacheTTL = 0, seed = null, notify = false, onchange = () => {}, mimetype = "text/plain"} = {}) {
	const obj = new ETag(cacheSize, cacheTTL, seed !== null ? seed : Math.floor(Math.random() * cacheSize) + 1, notify, mimetype);

	obj.middleware = obj.middleware.bind(obj);
	obj.cache.onchange = onchange;

	return obj;
}

module.exports = factory;
