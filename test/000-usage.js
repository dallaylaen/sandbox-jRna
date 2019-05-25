"use strict";
var should = require('chai').should();

const { JSDOM } = require('jsdom');
var window = (new JSDOM('<html><body></body></html>')).window;

// jsdom documentation suggests loading scrips by hand via `eval`
// https://github.com/jsdom/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global
// but screw that for now...
global.document = window.defaultView;
global.window = window;

var jQuery = require('jquery');
var root = jQuery("<div/>", { id : "root" });
root.html('<span id="myid">some text</span>');

var jRna = require( '../js/jRna.js' );

console.log(jRna);

describe( "jRna", () => {
    it( "spawns instances w/o elements", (done) => {
        var rna = new jRna().def("foo", 42);
        var enzyme = rna.attach(root);

        enzyme.should.have.property("foo", 42);

        done();
    });

    it( "spawns instances with elements", (done) => {
        var rna = new jRna().element("myid");
        var enzyme = rna.attach(root);

        enzyme.should.have.property("myid");
        enzyme.myid.should.be.an.instanceof(jQuery);
        enzyme.myid.html().should.be.equal("some text");

        done();
    });
});

