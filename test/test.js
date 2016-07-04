"use strict";

const http = require("http"),
	path = require("path"),
	random = Math.floor(Math.random()*9)+1,
	mmh3 = require("murmurhash3js").x86.hash32,
	cacheSize = 1000;

let router = require("woodland")({defaultHeaders: {"Cache-Control": "no-cache"}, cacheSize: cacheSize, defaultHost: "localhost", hosts: ["localhost", "noresponse"]}),
	hippie = require("hippie"),
	etag = require(path.join(__dirname, "..", "index.js"))({cacheSize: cacheSize, seed: random});

function request () {
	return hippie().base("http://localhost:8001");
}

router.use(etag.middleware).blacklist(etag.middleware);

router.use("/", function hello (req, res) {
	res.writeHead(200, {"Content-Type": "text/plain", "ETag": etag.create("Hello World!")});
	res.end("Hello World!");
});

router.use("/echo/:echo", (req, res) => {
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.end(req.params.echo);
});

router.use("/nothere.html", (req, res) => {
	res.writeHead(204);
	res.end("");
}, "GET", "noresponse");

http.createServer(router.route).listen(8001);

describe("Valid ETag", function () {
	it("GET / (200 / 'Success')", function (done) {
		request()
			.get("/")
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("ETag", "\"" + mmh3("Hello World!", random) + "\"")
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
			.expectHeader("ETag", "\"" + mmh3("Hello World!", random) + "\"")
			.expectBody(/^$/)
			.end(function (err) {
				if (err) throw err;
				done();
			});
	});
});
