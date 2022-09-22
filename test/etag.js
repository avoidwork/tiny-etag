import {createServer} from "node:http";
import tinyhttptest from "tiny-httptest";
import woodland from "woodland";
import MurmurHash3 from "murmurhash3js";
import {etag} from "../dist/tiny-etag.esm.js";
const mmh3 = MurmurHash3.x86.hash32;

const random = Math.floor(Math.random() * 9) + 1,
	cacheSize = 1000,
	router = woodland({logging: {enabled: false}, defaultHeaders: {"Content-Type": "text/plain", "cache-control": "public"}, cacheSize: cacheSize}),
	etagStore = etag({cacheSize: cacheSize, seed: random}),
	msg = "Hello World!",
	etagStoreValue = `"${mmh3(msg, random)}"`;

router.get(etagStore.middleware).ignore(etagStore.middleware);
router.get("/", (req, res) => res.send(msg, 200, {etag: etagStore.create(msg)}));
router.get("/no-cache", (req, res) => res.send(msg, 200, {"cache-control": "no-cache"}));

const server = createServer(router.route).listen(8001);

describe("Valid etagStore", function () {
	it("GET / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etag", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD / (200 / 'Success')", function () {
		return tinyhttptest({url: "http://localhost:8001/", method: "head"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etag", etagStoreValue)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (200 / 'Success' / JSON)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {accept: "application/json"}})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etag", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("GET / (304 / empty)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {"If-None-Match": etagStoreValue}})
			.expectStatus(304)
			.expectHeader("age", /\d+/)
			.expectHeader("content-length", void 0)
			.expectHeader("etag", etagStoreValue)
			.expectHeader("cache-control", void 0)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (304 / empty & validation)", function () {
		return tinyhttptest({url: "http://localhost:8001/", headers: {"If-None-Match": etagStoreValue}})
			.expectStatus(304)
			.expectHeader("age", /\d+/)
			.expectHeader("content-length", void 0)
			.expectHeader("etag", etagStoreValue)
			.expectHeader("cache-control", void 0)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (200 / 'Success' / No etagStore)", function () {
		return tinyhttptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "public")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etag", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("GET /no-cache (200 / 'Success' / No etagStore)", function () {
		return tinyhttptest({url: "http://localhost:8001/no-cache"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etag", void 0)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD /no-cache (200 / 'Success' / No etagStore)", function () {
		return tinyhttptest({url: "http://localhost:8001/no-cache", method: "head"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("Content-Type", "text/plain")
			.expectHeader("etag", void 0)
			.expectBody(/^$/)
			.end().then(() => server.close());
	});
});
