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
global.$ = jQuery;

var jRna = require( '../lib/jRna.js' );

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

    it( "can modify document", (done) => {
        html(''); // reset document
        var rna = new jRna().html('<span id="display"></span>');
        rna.output("display").args("initial");
        rna.def( "reset", function() {
            this.display( this.initial );
        });
        rna.on_attach(function() {
            this.reset();
        });
        var enzyme = rna.spawn( { initial: 42 } ).append_to(html());

        // now real test be here
        jQuery("#display").html().should.equal("42");

        enzyme.display(137);
        jQuery("#display").html().should.equal("137");

        enzyme.reset();
        jQuery("#display").html().should.equal("42");

        enzyme.display("<i>");
        jQuery("#display").html().should.equal("&lt;i&gt;");

        enzyme.element("display").should.be.an.instanceof(jQuery);
        should.not.exist(enzyme.element("noexist"));

        enzyme.remove();
        jQuery("body").html().should.equal('');

        done();
    });

    it("can process events", (done) => {
        var root = html('<div><button type="button" id="in">Click me!</div>');
        var rna = new jRna().init("trace", function() { return 0 } );
        rna.click("in", function() { this.trace++ });

        var probe = rna.attach(root);

        jQuery("#in").click();
        probe.trace.should.equal(1);
        jQuery("#in").click();
        probe.trace.should.equal(2);

        done();
    });
});

