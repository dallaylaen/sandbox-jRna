"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const html = require( '../lib/test/mock-html.js' );
const $ = global.window.$;

const jRna = require( '../lib/jrna.js' );

describe( 'self-test', () => {
    it ('$ should be a function', (done) => {
        (typeof $).should.equal('function');
        done();
    });
});

describe( "jRna", () => {
    it("knows where it comes from", (done) => {
        const rna = new jRna();
        rna.origin.should.match(/html.js:\d+(?::\d+)?$/);

        expect( () => rna.args('container') )
            .to.throw(/.*jRna@.*html.js:\d+(?::\d+)?$/)

        done();
    });

    it( 'validates its html', done => {
        const rna = new jRna();

        expect( () => rna.html('') ).to.throw(/.*empty.*HTML.*jRna@/);
        expect( () => rna.html('<br><br>') ).to.throw(/.*multiple.*HTML.*jRna@/);
        expect( () => rna.html('<inp') ).to.throw(/.*HTML.*jRna@/);
        expect( () => rna.html('text only') ).to.throw(/.*HTML.*jRna@/);
        expect( () => rna.html('&lt;') ).to.throw(/.*HTML.*jRna@/);

        done();
    });

    it( "spawns instances w/o elements", (done) => {
        var rna = new jRna().def("foo", 42).args("bar");
        var enzyme = rna.attach(html(), { bar : 137 });

        enzyme.should.be.an.instanceof(jRna.Bound);
        enzyme.should.have.property("foo", 42);
        enzyme.should.have.property("bar", 137);

        done();
    });

    it( "spawns instances with elements", (done) => {
        var rna = new jRna().element("myid");
        var enzyme = rna.attach(html('<div class="jrna-myid">some text</div>'));

        enzyme.should.have.property("myid");
        enzyme.myid.html().should.be.equal("some text");
        expect( enzyme.myid ).an.instanceof($);

        done();
    });

    it( "provides default values", (done) => {
        html(''); // unused, but reset just in case
        let init_times = 0;

        const rna = new jRna()
            .html('<br>')
            .def ('foo', 42)
            .init('bar', function() { init_times++; return 137 } )
            .args('foo', 'bar');

        const noargs = rna.instantiate();
        noargs.should.have.property('foo', 42);
        noargs.should.have.property('bar', 137);
        init_times.should.equal(1);

        const withargs = rna.instantiate({foo: 3.14, bar: 2.718});
        withargs.foo.should.equal(3.14);
        withargs.bar.should.equal(2.718);
        init_times.should.equal(1); // initializer never ran

        done();
    });

    it( "can modify document", (done) => {
        const root = html(''); // reset document
        expect( $("body").html() ).to.equal('');

        const rna = new jRna()
            .html('<span class="jrna-display"></span>')
            .output('display')
            .args('initial')
            .def( 'reset', function() {
                this.display = this.initial;
            })
            .onAttach( function() {
                this.reset()
            });
        var enzyme = rna.instantiate( { initial: 42 } ).appendTo(root);

        // now real test be here
        enzyme.should.have.property( 'display', 42 );
        $(".jrna-display").html().should.equal("42");

        enzyme.display = 137;
        enzyme.should.have.property( 'display', 137 );
        $(".jrna-display").html().should.equal("137");

        enzyme.reset();
        $(".jrna-display").html().should.equal("42");

        enzyme.display = '<i>';
        $(".jrna-display").html().should.equal("&lt;i&gt;");

        enzyme.element.should.have.all.keys('display');
        expect( enzyme.element.display ).to.be.an.instanceof($);

        expect( $("body").html() ).to.equal('<span class="jrna-display">&lt;i&gt;</span>');
        enzyme.remove();
        expect( $("body").html() ).to.equal('');

        done();
    });

    it('can exist in single-element setup', (done) => {
        const root = html('<div id="root"></div>');
        const rna = new jRna()
            .html('<span class="jrna-label"></span>')
            .output('label')
            .args('label');

        const inst = rna.appendTo('#root', { label: 'see you' });

        root.html().should.equal('<div id="root"><span class="jrna-label">see you</span></div>');

        done();
    });

    it("can process events", (done) => {
        var root = html('<div><button type="button" class="jrna-in">Click me!</div>');
        var rna = new jRna().init("trace", function() { return 0 } );
        rna.click("in", function() { this.trace++ });

        var probe = rna.attach(root);

        $(".jrna-in").trigger('click');
        probe.trace.should.equal(1);
        $(".jrna-in").trigger('click');
        probe.trace.should.equal(2);

        done();
    });

    it("can read html from the document itself", (done) => {
        var root = html('<div id="main"></div><div id="widget"><span class="jrna-label"></span></div>');
        var rna  = new jRna().output("label").htmlFrom("#widget");

        var probe = rna.instantiate().appendTo(root.find("#main"));
        probe.label = "foo bared";

        root.html().should.match(/<span class="jrna-label">foo bared<\/span>/);

        done();
    });

    it ("attaches to one and only one element", (done) => {
        const root = html('<div id="decoy" class="main"></div><div class="main"><span class="jrna-my"></span></div>');
        const rna  = new jRna().output("my").html('<span class="jrna-my"></span>');

        expect( () => {
            rna.attach( root.find(".nothing") );
        }).to.throw(/Cannot attach to a missing element.*jRna@.*html.js:\d+/);

        expect( () => {
            rna.attach( root.find( "#decoy" ) );
        }).to.throw(/.*\bjrna-my\b.*jRna@/);

        expect( () => {
            rna.instantiate().appendTo( root.find(".nothing") );
        }).to.throw("Cannot append to a missing element");

        expect( () => {
            rna.instantiate().appendTo( root.find(".main") );
        }).to.throw("Cannot append to an ambiguous element");

        const box = rna.instantiate().appendTo( root.find( "#decoy" ) );
        box.my = 'ready';
        root.html().should.match(/div.*span.*ready.*span.*div.*div.*div/);
        root.html().should.not.match(/div.*div.*div.*span.*ready.*span.*div/);


        done();
    });

    it("can attach and appendTo by id", (done) => {
        const root = html('<div id="main"><span class="jrna-title"></span></div>');

        const outer = new jRna()
            .output('title')
            .attach('#main');

        outer.title = 'foobar';
        root.find('.jrna-title').html().should.equal('foobar');

        const inner = new jRna()
            .html('<span class="inner">hello</span>')
            .appendTo('#main');

        root.find('.inner').html().should.equal('hello');

        done();
    });

    it("can read & write inputs", (done) => {
        const root = html('');
        const rna = new jRna()
            .html('<input class="jrna-readme">')
            .input('readme')
            .args('readme');

        const noinit = rna.appendTo(root);
        noinit.should.have.property('readme', '');
        root.find('.jrna-readme').val('foobar');
        noinit.should.have.property('readme', 'foobar');
        noinit.readme = 42;
        // oops, number lost in translation!
        root.find('.jrna-readme').val().should.equal('42');
        noinit.should.have.property('readme', '42');
        noinit.remove();

        const withinit = rna.appendTo(root, { readme: 'say something' });
        root.find('.jrna-readme').val().should.equal('say something');
        withinit.remove();

        done();
    });

    it("provides toggle functionality", (done) => {
        const root = html('<button class="jrna-switch">click me</button>');
        let on = 0, off = 0;

        const box = new jRna()
            .output( [ 'switch', 'label' ] )
            .toggle( 'switch',
                function () { this.label = 'turn off'; on++ },
                function () { this.label = 'turn on'; off++ }
        ).attach(root);

        const button = root.find('.jrna-switch');

        button.trigger('click');
        on.should.equal(1);
        off.should.equal(0);
        button.html().should.equal('turn off');

        button.trigger('click');
        on.should.equal(1);
        off.should.equal(1);
        button.html().should.equal('turn on');

        done();
    });

    it("provides stickyClick functionality", (done) => {
        let trace = 0;

        const root = html('<button class="jrna-sticky">click me</button>');
        const rna  = new jRna()
            .stickyClick("sticky", "down", function () {
                this.element.sticky.html('clicked');
                trace++;
            })
            .attach(root);

        const button = root.find("button");
        trace.should.equal(0);
        button.html().should.equal("click me");

        button.trigger('click');
        trace.should.equal(1);
        button.html().should.equal("clicked");
        button.trigger('click');
        trace.should.equal(1);
        rna.down = false;
        button.trigger('click');
        trace.should.equal(2);

        done();
    });

    it( 'provides shared lock for stickyClick', done => {
        const root = html('<a href="#" class="jrna-a">a</a><a href="#" class="jrna-b">b</a>');

        let trace = '';
        const twoClick = new jRna()
            .stickyClick('a', 'shared', function() { trace += 'a' })
            .stickyClick('b', 'shared', function() { trace += 'b' })
            .attach(root);

        var aa = twoClick.element.a;
        var ab = twoClick.element.b;

        aa.trigger('click');
        ab.trigger('click');

        trace.should.equal('a');
        twoClick.should.have.property('shared', true);
        twoClick.shared = false;

        ab.trigger('click');
        aa.trigger('click');
        
        trace.should.equal('ab');
        twoClick.should.have.property('shared', true);
        
        done();
    });

    it( "provides onRemove and onAttach callbacks", done => {
        const root = html('');

        let attach = 0;
        let remove = 0;

        const rna = new jRna()
            .onAttach(function () { attach++ })
            .html('<span>plain text</span>');

        // nothing happened yet
        root.html().should.equal('');
        attach.should.equal(0);
        remove.should.equal(0);

        const enzyme = rna.instantiate()
            .appendTo(root)
            .onRemove(function () { remove++ });
        root.html().should.match(/<span>plain text<\/span>/);
        attach.should.equal(1);
        remove.should.equal(0);

        enzyme.remove();
        root.html().should.equal('');
        attach.should.equal(1);
        remove.should.equal(1);

        done();
    });
});

describe( 'jRna.rawOutput', () => {
    const rna = new jRna()
        .html('<div class="jrna-raw"></div>')
        .rawOutput('raw');

    it( 'can modify document', done => {
        const root = html();
        const bound = rna.appendTo( root );

        const bold = 'very <b>bold</b> text';

        bound.raw = bold;
        bound.should.have.property( 'raw', bold );
        bound.container.html().should.equal( bold );

        const italic = '<i>maybe</i>';

        const bound2 = rna.appendTo( root );
        bound2.should.have.property( 'raw', undefined );
        bound2.raw = italic;

        // check no interconnection
        bound.should.have.property( 'raw', bold );
        bound2.should.have.property( 'raw', italic );

        done();
    });
})

