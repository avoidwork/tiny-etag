# tiny-etag

[![build status](https://secure.travis-ci.org/avoidwork/tiny-etag.svg)](http://travis-ci.org/avoidwork/tiny-etag)

ETag middleware

## Example
```javascript
"use strict";

const http = require("http"),
	max = 1000,
	seed = Math.floor(Math.random() * max) + 1,
	router = require("woodland")({cacheSize: max, defaultHeaders: {"Cache-Control": "no-cache"}, seed: seed}),
	etag = require("tiny-etag")({cacheSize: max, seed: seed});

router.use(etag.middleware).blacklist(etag.middleware);

router.use("/", (req, res) => {
	const body = "Hello World!";

	res.writeHead(200, {"Content-Type": "text/plain", "ETag": etag.create(body)});
	res.end(body);
});

http.createServer(router.route).listen(8000);
```

## API

##### etag ({cacheSize: 1000, seed: random, notify: false, onchange = (eventName, serializedCache) => {}})
Returns an tiny-etag instance. Be notified of cache changes by setting `notify` to `true`, and supply `onchange`.

##### create (arg)
Creates a strong ETag value from `arg`

##### hash (arg)
Creates a hash of `arg`, used by `create()`

##### middleware (req, res, next)
Middleware to be used by an http framework

##### register (url, state)
Adds `url` to the `cache`

##### unregister (url)
Removes `url` from the `cache`

## License
Copyright (c) 2017 Jason Mulligan
Licensed under the BSD-3 license