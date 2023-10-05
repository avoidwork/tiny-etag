import {createHash} from "node:crypto";
import {BASE64, CACHE_CONTROL, CONTENT_LOCATION, DATE, ETAG, EXPIRES, SHA1, VARY} from "./constants.js";

export const clone = typeof structuredClone === "function" ? structuredClone : arg => JSON.parse(JSON.stringify(arg));

export function hash (arg = "") {
	return createHash(SHA1).update(arg).digest(BASE64);
}

export function keep (arg) {
	return arg === CACHE_CONTROL || arg === CONTENT_LOCATION || arg === DATE || arg === ETAG || arg === EXPIRES || arg === VARY;
}

export function parse (arg) {
	return new URL(typeof arg === "string" ? arg : `http://${arg.headers.host || `localhost:${arg.socket.server._connectionKey.replace(/.*::/, "")}`}${arg.url}`);
}
