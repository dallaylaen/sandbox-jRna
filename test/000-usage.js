"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;
const MockXMLHttpRequest = require('mock-xmlhttprequest');

const html = require( '../lib/test-mock-html.js' );

const jRna = require( '../lib/jRna.js' );

describe( "jRna", () => {
    it("knows where it comes from", (done) => {
        const rna = new jRna();
        rna.origin.should.match(/usage.js:\d+(?::\d+)?$/);

        done();
    });

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
        enzyme.myid.should.be.an.instanceof($);
        enzyme.myid.html().should.be.equal("some text");

        done();
    });

    it( "provides default values", (done) => {
        html(''); // unused, but reset just in case
        let init_times = 0;

        const rna = new jRna()
            .html('')
            .def("foo", 42)
            .init("bar", function() { init_times++; return 137 } )
            .args("foo", "bar");

        const noargs = rna.spawn();
        noargs.should.have.property('foo', 42);
        noargs.should.have.property('bar', 137);
        init_times.should.equal(1);

        const withargs = rna.spawn({foo: 3.14, bar: 2.718});
        withargs.foo.should.equal(3.14);
        withargs.bar.should.equal(2.718);
        init_times.should.equal(1); // initializer never ran

        done();
    });

    it( "can modify document", (done) => {
        html(''); // reset document
        const rna = new jRna()
            .html('<span id="display"></span>')
            .output('display')
            .args('initial')
            .def( 'reset', function() {
                this.display = this.initial;
            })
            .on_attach( function() {
                this.reset()
            });
        var enzyme = rna.spawn( { initial: 42 } ).append_to(html());

        // now real test be here
        enzyme.should.have.property( 'display', 42 );
        $("#display").html().should.equal("42");

        enzyme.display = 137;
        enzyme.should.have.property( 'display', 137 );
        $("#display").html().should.equal("137");

        enzyme.reset();
        $("#display").html().should.equal("42");

        enzyme.display = '<i>';
        $("#display").html().should.equal("&lt;i&gt;");

        enzyme.element("display").should.be.an.instanceof($);
        should.not.exist(enzyme.element("noexist"));

        enzyme.remove();
        $("body").html().should.equal('');

        done();
    });

    it("can process events", (done) => {
        var root = html('<div><button type="button" id="in">Click me!</div>');
        var rna = new jRna().init("trace", function() { return 0 } );
        rna.click("in", function() { this.trace++ });

        var probe = rna.attach(root);

        $("#in").click();
        probe.trace.should.equal(1);
        $("#in").click();
        probe.trace.should.equal(2);

        done();
    });

    it("can read html from the document itself", (done) => {
        var root = html('<div id="main"></div><div id="widget"><span id="label"></span></div>');
        var rna  = new jRna().output("label").html_from("widget");

        var probe = rna.spawn().append_to(root.find("#main"));
        probe.label = "foo bared";

        root.html().should.match(/<span id="label">foo bared<\/span>/);

        done();
    });

    it ("attaches to one and only one element", (done) => {
        const root = html('<div id="main"></div><div id="main"><span id="my"></span></div>');
        const rna  = new jRna().output("my").html('<span id="my"></span>');

        expect( () => {
            rna.attach( root.find("#nothing") );
        }).to.throw(/Cannot attach to a missing element.*jRna@.*usage.js:\d+/);

        expect( () => {
            rna.attach( root.find( "#main" ) );
        }).to.throw(/No element .*#my.*jRna/);

        expect( () => {
            rna.spawn().append_to( root.find("#nothing") );
        }).to.throw("Cannot append to a missing element");

        const box = rna.spawn().append_to( root.find( "#main" ) );
        box.my = 'ready';
        root.html().should.match(/div.*span.*ready.*span.*div.*div.*div/);
        root.html().should.not.match(/div.*div.*div.*span.*ready.*span.*div/);


        done();
    });

    it("can attach and append_to by id", (done) => {
        const root = html('<div id="main"><span id="title"></span></div>');

        const outer = new jRna()
            .output('title')
            .attach('main');

        outer.title = 'foobar';
        root.find('#title').html().should.equal('foobar');

        const inner = new jRna()
            .html('<span id="inner">hello</span>')
            .append_to('main');

        root.find('#inner').html().should.equal('hello');

        done();
    });

    it("provides toggle functionality", (done) => {
        const root = html('<button id="switch">click me</button>');
        let on = 0, off = 0;

        const box = new jRna()
            .output( "switch", "label" )
            .toggle( "switch",
                function () { this.label = 'turn off'; on++ },
                function () { this.label = 'turn on'; off++ }
        ).attach(root);

        const button = root.find('#switch');

        button.click();
        on.should.equal(1);
        off.should.equal(0);
        button.html().should.equal("turn off");

        button.click();
        on.should.equal(1);
        off.should.equal(1);
        button.html().should.equal("turn on");

        done();
    });

    it("provides sticky_click functionality", (done) => {
        let trace = 0;

        const root = html('<button id="sticky">click me</button>');
        const rna  = new jRna()
            .sticky_click("sticky", "down", function () {
                this.element("sticky").html("clicked");
                trace++;
            })
            .attach(root);

        const button = root.find("button");
        trace.should.equal(0);
        button.html().should.equal("click me");

        button.click();
        trace.should.equal(1);
        button.html().should.equal("clicked");
        button.click();
        trace.should.equal(1);
        rna.down = false;
        button.click();
        trace.should.equal(2);

        done();
    });

    it( "provides on_remove and on_attach callbacks", () => {
        const root = html('');

        let attach = 0;
        let remove = 0;

        const rna = new jRna()
            .on_attach(function () { attach++ })
            .html('<span>plain text</span>');

        // nothing happened yet
        root.html().should.equal('');
        attach.should.equal(0);
        remove.should.equal(0);

        const enzyme = rna.spawn()
            .append_to(root)
            .on_remove(function () { remove++ });
        root.html().should.match(/<span>plain text<\/span>/);
        attach.should.equal(1);
        remove.should.equal(0);

        enzyme.remove();
        root.html().should.equal('');
        attach.should.equal(1);
        remove.should.equal(1);
    });

    /* additional stuff */

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

