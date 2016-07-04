"use strict";

const regex = {
	implicitGet: /^(HEAD|GET|OPTIONS)$/,
	explicitGet: /^GET$/i,
	etag: /ETag:\s/i,
	invalid: /^(a|cache|connection|content-(d|e|l|m|r)|d|ex|l|p|r|s|t|u|v|w|x)/
};

module.exports = regex;
