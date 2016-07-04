"use strict";

const path = require("path"),
	ETag = require(path.join(__dirname, "lib", "etag.js"));

function factory (config) {
	let obj = new ETag(config);

	obj.create = obj.create.bind(obj);
	obj.middleware = obj.middleware.bind(obj);

	return obj;
}

module.exports = factory;
