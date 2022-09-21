const path = require("path"),
	ETag = require(path.join(__dirname, "lib", "etag.js"));

function factory ({cacheSize = 1e3, cacheTTL = 0, seed = null, mimetype = "text/plain"} = {}) {
	const obj = new ETag(cacheSize, cacheTTL, seed !== null ? seed : Math.floor(Math.random() * cacheSize) + 1, mimetype);

	obj.middleware = obj.middleware.bind(obj);

	return obj;
}

module.exports = factory;
