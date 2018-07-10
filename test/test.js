"use strict";

const http = require("http"),
	path = require("path"),
	random = Math.floor(Math.random() * 9) + 1,
	mmh3 = require("murmurhash3js").x86.hash32,
	etagValue = "\"" + mmh3("Hello World!", random) + "\"",
	cacheSize = 1000,
	router = require("woodland")({defaultHeaders: {"Cache-Control": "public"}, cacheSize: cacheSize}),
	tinyhttptest = require("tiny-httptest"),
	etag = require(path.join(__dirname, "..", "index.js"))({cacheSize: cacheSize, seed: random});

router.use(etag.middleware, "all").blacklist(etag.middleware);

router.use("/", function hello (req, res) {
	res.writeHead(200, {"Content-Type": "text/plain", "ETag": etag.create("Hello World!")});
	res.end("Hello World!");
});

router.use("/no-cache", function hello (req, res) {
	res.writeHead(200, {"Content-Type": "text/plain", "Cache-Control": "no-cache"});
	res.end("Hello World!");
});

http.createServer(router.route).listen(8001);

describe("Valid ETag", function () {
	it("GET / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("ETag", etagValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "head"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("ETag", etagValue)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (304 / empty)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {"If-None-Match": etagValue}})
			.expectStatus(304)
			.expectHeader("Age", /\d+/)
			.expectHeader("Content-Length", undefined)
			.expectHeader("ETag", etagValue)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (304 / empty & validation)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {"If-None-Match": etagValue}})
			.expectStatus(304)
			.expectHeader("Age", /\d+/)
			.expectHeader("Content-Length", undefined)
			.expectHeader("ETag", etagValue)
			.expectBody(/^$/)
			.end();
	});

	it("GET /no-cache (200 / 'Success' / No Etag)", function () {
		return tinyhttptest({url: "http://localhost:8001/no-cache"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("ETag", undefined)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD /no-cache (200 / 'Success' / No Etag)", function () {
		return tinyhttptest({url: "http://localhost:8001/no-cache", method: "head"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("ETag", undefined)
			.expectBody(/^$/)
			.end();
	});
});
