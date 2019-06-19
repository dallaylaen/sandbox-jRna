"use strict";
/* global global, require, process */

const { JSDOM } = require('jsdom');
const fs = require('fs');

const where = process.env.JQUERY_PATH || './lib/3rd-party/jquery.js';
const src   = fs.readFileSync(where, { encoding: "utf-8" });

// jsdom documentation suggests loading scrips by hand via `eval`
// for every single test, but jRna is tied to global values right now
// so TODO it.
// See https://github.com/jsdom/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global

const window = (new JSDOM(``, { runScripts: "dangerously" })).window;

const script = window.document.createElement("script");
script.textContent = src;
window.document.head.appendChild(script);

if (typeof window.$ != 'function')
    throw new Error('Cannot run tests because $ wasn\'t set by '+where);

global.window = window;
global.document = window.document;

function html (text='') {
    window.document.body.innerHTML = text;
    return window.$( window.document.body );
}

// addFileList stolen from
// https://github.com/jsdom/jsdom/issues/1272#issuecomment-361106435
html.addFileList = function(input, files) {
    const file_list = [].concat(files);
    file_list.__proto__ = Object.create(window.FileList.prototype);

    Object.defineProperty(input, 'files', {
        value: file_list,
        writeable: false,
    });

    return input;
}

if (typeof module === 'object' && typeof module.exports === 'object' ) {
    // we're being exported
    module.exports = html;
}
