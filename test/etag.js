import {createServer} from "node:http";
import path from "node:path";
import {createRequire} from "module";
import woodland from "woodland";

const require = createRequire(import.meta.url),
	__dirname = require.resolve.paths(".")[0],
	random = Math.floor(Math.random() * 9) + 1,
	mmh3 = require("murmurhash3js").x86.hash32,
	cacheSize = 1000,
	router = woodland({defaultHeaders: {"Content-Type": "text/plain", "Cache-Control": "public"}, cacheSize: cacheSize}),
	tinyhttptest = require("tiny-httptest"),
	etagStore = require(path.join(__dirname, "..", "src", "etag.js"))({cacheSize: cacheSize, seed: random}),
	msg = "Hello World!",
	etagStoreValue = `"${mmh3(msg, random)}"`;

router.get(etagStore.middleware).blacklist(etagStore.middleware);
router.get("/", (req, res) => res.send(msg, 200, {"etagStore": etagStore.create(msg)}));
router.get("/no-cache", (req, res) => res.send(msg, 200, {"Cache-Control": "no-cache"}));

const server = createServer(router.route).listen(8001);

describe("Valid etagStore", function () {
	it("GET / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etagStore", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "head"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etagStore", etagStoreValue)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (200 / 'Success' / JSON)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {accept: "application/json"}})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etagStore", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("GET / (304 / empty)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {"If-None-Match": etagStoreValue}})
			.expectStatus(304)
			.expectHeader("Age", /\d+/)
			.expectHeader("Content-Length", void 0)
			.expectHeader("etagStore", etagStoreValue)
			.expectHeader("Cache-Control", void 0)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (304 / empty & validation)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {"If-None-Match": etagStoreValue}})
			.expectStatus(304)
			.expectHeader("Age", /\d+/)
			.expectHeader("Content-Length", void 0)
			.expectHeader("etagStore", etagStoreValue)
			.expectHeader("Cache-Control", void 0)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (200 / 'Success' / No etagStore)", function () {
		return tinyhttptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etagStore", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("GET /no-cache (200 / 'Success' / No etagStore)", function () {
		return tinyhttptest({url: "http://localhost:8001/no-cache"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etagStore", void 0)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD /no-cache (200 / 'Success' / No etagStore)", function () {
		return tinyhttptest({url: "http://localhost:8001/no-cache", method: "head"})
			.expectStatus(200)
			.expectHeader("Allow", "GET, HEAD, OPTIONS")
			.expectHeader("Cache-Control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etagStore", void 0)
			.expectBody(/^$/)
			.end().then(() => server.close());
	});
});
