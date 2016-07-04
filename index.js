"use strict";

const path = require("path"),
	ETag = require(path.join(__dirname, "lib", "etag.js"));

function factory (config) {
	let obj = new ETag(config);

	obj.middleware = obj.middleware();

	return obj;
}

module.exports = factory;
