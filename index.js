"use strict";

const path = require("path"),
	ETag = require(path.join(__dirname, "lib", "etag.js"));

function factory (config) {
	const obj = new ETag(config);

	obj.middleware = (req, res, next) => obj.etag.call(obj, req, res, next);

	return obj;
}

module.exports = factory;
