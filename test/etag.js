import {createServer} from "node:http";
import assert from "node:assert/strict";
import {httptest} from "tiny-httptest";
import {woodland} from "woodland";
import {etag} from "../dist/tiny-etag.cjs";
import {CONTENT_TYPE, CACHE_CONTROL, INT_1000, INT_200, NO_CACHE, TEXT_PLAIN, PUBLIC} from "../src/constants.js";

const cacheSize = INT_1000,
	router = woodland({etags: false, logging: {enabled: false}, defaultHeaders: {[CONTENT_TYPE]: TEXT_PLAIN, [CACHE_CONTROL]: PUBLIC}, cacheSize: cacheSize}),
	etagStore = etag({cacheSize: cacheSize}),
	msg = "Hello World!",
	etagStoreValue = etagStore.create(msg);

router.get(etagStore.middleware).ignore(etagStore.middleware);
router.get("/", (req, res) => res.send(msg, INT_200, {etag: etagStore.create(msg)}));
router.get("/no-cache", (req, res) => res.send(msg, INT_200, {[CACHE_CONTROL]: NO_CACHE}));

const server = createServer(router.route).listen(8001);

describe("Utility functions", function () {
	it("Will parse valid URLs", function () {
		assert.strictEqual(etagStore.parse("https://example.com/").href, "https://example.com/", "Should equal 'https://example.com/'");
	});
});

describe("Valid etagStore", function () {
	it("GET / (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "public")
			.expectHeader("etag", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD / (200 / 'Success')", function () {
		return httptest({url: "http://localhost:8001/", method: "head"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "public")
			.expectHeader("etag", etagStoreValue)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (200 / 'Success' / JSON)", function () {
		return httptest({url: "http://localhost:8001/"})
			.etags()
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "public")
			.expectHeader("content-type", "text/plain")
			.expectHeader("etag", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("GET / (304 / empty)", function () {
		return httptest({url: "http://localhost:8001/"})
			.etags()
			.expectHeader("age", /\d+/)
			.expectHeader("content-length", void 0)
			.expectHeader("etag", etagStoreValue)
			.expectHeader("cache-control", void 0)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (304 / empty & validation)", function () {
		return httptest({url: "http://localhost:8001/"})
			.etags()
			.expectStatus(304)
			.expectHeader("age", /\d+/)
			.expectHeader("content-length", void 0)
			.expectHeader("etag", etagStoreValue)
			.expectHeader("cache-control", void 0)
			.expectBody(/^$/)
			.end();
	});

	it("GET / (200 / 'Success' / No etagStore)", function () {
		return httptest({url: "http://localhost:8001/"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "public")
			.expectHeader("etag", etagStoreValue)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("GET /no-cache (200 / 'Success' / No etagStore)", function () {
		return httptest({url: "http://localhost:8001/no-cache"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("etag", void 0)
			.expectBody(/^Hello World!$/)
			.end();
	});

	it("HEAD /no-cache (200 / 'Success' / No etagStore)", function () {
		return httptest({url: "http://localhost:8001/no-cache", method: "head"})
			.expectStatus(200)
			.expectHeader("allow", "GET, HEAD, OPTIONS")
			.expectHeader("cache-control", "no-cache")
			.expectHeader("etag", void 0)
			.expectBody(/^$/)
			.end().then(() => server.close());
	});
});
