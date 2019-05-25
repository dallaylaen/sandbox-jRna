"use strict";
var should = require('chai').should();

const { JSDOM } = require('jsdom');
// jsdom documentation suggests loading scrips by hand via `eval`
// https://github.com/jsdom/jsdom/wiki/Don't-stuff-jsdom-globals-onto-the-Node-global
// but screw that for now...
var mock = (new JSDOM('<html><body></body></html>')).window;
global.document = mock.defaultView;
global.window = mock;
var jQuery = require('jquery');

var jRna = require( '../js/jRna.js' );

function html (text) {
    var root = jQuery("body");
    root.html(text);
    return root;
};

describe( "jRna", () => {
    it( "spawns instances w/o elements", (done) => {
        var rna = new jRna().def("foo", 42);
        var enzyme = rna.attach(html());

        enzyme.should.have.property("foo", 42);

        done();
    });

    it( "spawns instances with elements", (done) => {
        var rna = new jRna().element("myid");
        var enzyme = rna.attach(html('<div id="myid">some text</div>'));

        enzyme.should.have.property("myid");
        enzyme.myid.should.be.an.instanceof(jQuery);
        enzyme.myid.html().should.be.equal("some text");

        done();
    });
});

