import pkg from "./package.json";

const {terser} = require("rollup-plugin-terser");
const year = new Date().getFullYear();
const bannerLong = `/**
 * ${pkg.name}
 *
 * @copyright ${year} ${pkg.author}
 * @license ${pkg.license}
 * @version ${pkg.version}
 */`;
const bannerShort = `/*!
 ${year} ${pkg.author}
 @version ${pkg.version}
*/`;
const defaultOutBase = {compact: true, banner: bannerLong, name: pkg.name, globals: {"node:url": "node:url", "tiny-lru": "lru", "murmurhash3js": "murmurhash3js"}};
const cjOutBase = {...defaultOutBase, compact: false, format: "cjs", exports: "named"};
const esmOutBase = {...defaultOutBase, format: "esm"};
const minOutBase = {banner: bannerShort, name: pkg.name, plugins: [terser()], sourcemap: true};

export default {
	external: [
		"murmurhash3js",
		"node:url",
		"tiny-lru"
	],
	input: "./src/etag.js",
	output: [
		{
			...cjOutBase,
			file: `dist/${pkg.name}.cjs`
		},
		{
			...esmOutBase,
			file: `dist/${pkg.name}.esm.js`
		},
		{
			...esmOutBase,
			...minOutBase,
			file: `dist/${pkg.name}.esm.min.js`
		}
	]
};
