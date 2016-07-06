"use strict";

const http = require("http"),
	path = require("path"),
	random = Math.floor(Math.random()*9)+1,
	mmh3 = require("murmurhash3js").x86.hash32,
	etagValue = "\"" + mmh3("Hello World!", random) + "\"",
	cacheSize = 1000;

let router = require("woodland")({defaultHeaders: {"Cache-Control": "no-cache"}, cacheSize: cacheSize, defaultHost: "localhost", hosts: ["localhost", "noresponse"]}),
	hippie = require("hippie"),
	etag = require(path.join(__dirname, "..", "index.js"))({cacheSize: cacheSize, seed: random});

function request () {
	return hippie().base("http://localhost:8001");
}

router.use(etag.middleware, "all").blacklist(etag.middleware);

router.use("/", function hello (req, res) {
	res.writeHead(200, {"Content-Type": "text/plain", "ETag": etag.create("Hello World!")});
	res.end("Hello World!");
});

http.createServer(router.route).listen(8001);

describe("Valid ETag", function () {
	it("GET / (200 / 'Success')", function (done) {
		request()
			.get("/")
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("ETag", etagValue)
			.expectBody(/^Hello World!$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("HEAD / (200 / 'Success')", function (done) {
		request()
			.head("/")
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("ETag", etagValue)
			.expectBody(/^$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET / (304 / empty)", function (done) {
		request()
			.get("/")
			.header("If-None-Match", etagValue)
			.expectStatus(304)
			.expectHeader("Age", /\d+/)
			.expectHeader("Content-Length", undefined)
			.expectHeader("ETag", etagValue)
			.expectBody(/^$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});

	it("GET / (304 / empty & validation)", function (done) {
		request()
			.get("/")
			.header("If-None-Match", etagValue)
			.expectStatus(304)
			.expectHeader("Age", /\d+/)
			.expectHeader("Content-Length", undefined)
			.expectHeader("ETag", etagValue)
			.expectBody(/^$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});
});
