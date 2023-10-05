# tiny-etag

ETag middleware for express.js API compatible routers.

## Using the factory

```javascript
import {etag} from "tiny-etag";
const etags = etag({cacheSize: 500});
const router = SomeRouter(); /* express.js compatible router */

router.use(etags.middleware);

router.get("/", (req, res) => {
    const body = "Hello World!";

    res.writeHead(200, {"content-type": "text/plain", "etag": etags.create(body)});
    res.end(body);
});
```

## Testing

Tiny ETag has 100% code coverage with its tests.

```console
---------------|---------|----------|---------|---------|---------------------
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|---------------------
All files      |     100 |    78.57 |     100 |     100 |                    
 tiny-etag.cjs |     100 |    78.57 |     100 |     100 | 45-49,59,91-109,115
---------------|---------|----------|---------|---------|---------------------
```

## API

### etag({cacheSize: 1000, cacheTTL: 0, seed: random, mimetype: "text/plain"})
Returns an tiny-etag instance. Cache TTL concerns do not spread with a notification.

### create(arg)
Creates a strong ETag value from `arg`; a composite `String` is recommended

### hash(arg[, mimetype="text/plain"])
Creates a hash of `arg`, uses `create()`

### keep(arg)
Returns a boolean if `arg` should be kept on the cached `Object`

### middleware(req, res, next)
Middleware to be used by an http framework

### parse(arg)
Parses `arg` as a `URL` if it's a `String`, or constructs one if it is a `socket`

### register(url, state)
Adds `url` to the `cache`

### valid(headers)
Returns a `Boolean` indicating if caching is valid based on `cache-control`

## License
Copyright (c) 2023 Jason Mulligan
Licensed under the BSD-3 license
