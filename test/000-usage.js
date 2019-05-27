"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;
const MockXMLHttpRequest = require('mock-xmlhttprequest');

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
        var rna = new jRna().def("foo", 42).args("bar");
        var enzyme = rna.attach(html(), { bar : 137 });

        enzyme.should.have.property("foo", 42);
        enzyme.should.have.property("bar", 137);

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

    it("can read html from the document itself", (done) => {
        var root = html('<div id="main"></div><div id="widget"><span id="label"></span></div>');
        var rna  = new jRna().output("label").html_from("widget");

        var probe = rna.spawn().append_to(root.find("#main"));
        probe.label("foo bared");

        root.html().should.match(/<span id="label">foo bared<\/span>/);

        done();
    });

    it ("attaches to one and only one element", (done) => {
        const root = html('<div id="main"></div><div id="main"><span id="my"></span></div>');
        const rna  = new jRna().output("my").html('<span id="my"></span>');

        expect( () => {
            rna.attach( root.find("#nothing") );
        }).to.throw("Cannot attach to a missing element");

        expect( () => {
            rna.attach( root.find( "#main" ) );
        }).to.throw(/No element .*#my.*jRna/);

        expect( () => {
            rna.spawn().append_to( root.find("#nothing") );
        }).to.throw("Cannot append to a missing element");

        const box = rna.spawn().append_to( root.find( "#main" ) );
        box.my("ready");
        root.html().should.match(/div.*span.*ready.*span.*div.*div.*div/);
        root.html().should.not.match(/div.*div.*div.*span.*ready.*span.*div/);


        done();
    });

    const server = MockXMLHttpRequest.newServer({
        post: ['/my/url', {
            // status: 200 is the default
            headers: { 'Content-Type': 'application/json' },
            body: '{ "answer": "42" }',
        }],
    }).install( /* optional context; defaults to global */ );

    it("provides generic http backend", (done) => {
        const backend = jRna.backend({ url: '/my/url', method: 'post' });
        const result  = backend({});
        result.should.be.an.instanceof(Promise);
        result.then( (data) => {
            data.should.have.property('answer', '42');
            done();
        }).catch((error) => { throw "Broken promise: "+error });
    });
});

