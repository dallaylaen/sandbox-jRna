"use strict";

const { JSDOM } = require('jsdom');

const mock = (new JSDOM('<html><body></body></html>')).window;
global.document = mock.document;
global.window = mock;

const where = process.env.JQUERY_PATH || 'jquery';
global.$ = require(where);

function html (text) {
    // jsdom documentation suggests loading scrips by hand via `eval`
    // https://github.com/jsdom/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global
    // but screw that for now...

    const root = $("body");
    root.html(text);
    return root;
};

if (typeof module === 'object' && typeof module.exports === 'object' ) {
    // we're being exported
    module.exports = html;
}
