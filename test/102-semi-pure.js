"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

// never used, except for creating in-memory nodes
const html = require( '../lib/test/mock-html.js' );

const jRna = require( '../lib/jrna.js' );

describe('jRna.stickyState', () => {
    const trace = [];
    const rna = new jRna()
        .html('<span></span>')
        .def('flag', false)
        .stickyState( 'toggle', {
            0 : function(olds, news) {
                this.flag = false;
                trace.push([0, olds, news]);
            },
            1 : function(olds, news) {
                this.flag = true;
                trace.push([1, olds, news]);
            }
        });
    it ('provides sticky state', done => {
        const inst = rna.spawn();

        // initial state
        trace.should.deep.equal([]);
        should.not.exist( inst.toggle() );

        // now switch it
        inst.toggle(0);
        inst.toggle().should.equal(0);
        inst.flag.should.equal(false);
        trace.should.deep.equal([[0, undefined, 0]]);

        // try again = should stick
        inst.toggle(0);
        inst.toggle().should.equal(0);
        inst.flag.should.equal(false);
        trace.should.deep.equal([[0, undefined, 0]]);

        // state change
        inst.toggle(1);
        inst.toggle().should.equal(1);
        inst.flag.should.equal(true);
        trace.should.deep.equal([[0, undefined, 0], [1, 0, 1]]);

        const other = rna.spawn();
        should.not.exist( other.toggle() );

        done();
    });
    it ('does not mix states', done => {
        const other = rna.spawn();
        should.not.exist( other.toggle() );

        done();
    });
});

describe ('jRna.args', () => {
    let initRan = [];
    let stateChange = [];

    const rna = new jRna()
        .args ( 'foo', 'bar', 'quux' )
        .init ( 'foo', function(args) { 
            initRan = [ this, args ]; 
            return 42; 
        })
        .def( 'bar', function(value) { this.value = value; } )
        .stickyState( 'quux', {
            true:  function () { stateChange = [ this.quux(), true ] },
            false: function () { stateChange = [ this.quux(), false ] },
        });

    it ('forbids bogus args', done => {
        expect( () => rna.args('element') )
            .to.throw(/[Ff]orbidden.* arg.*element/);
        expect( () => rna.attach( html(), { bogus: 314 } ) )
            .to.throw(/[Uu]nknown.* arg.* bogus/);
        done();
    });

    it ('triggers assignment', done => {
        initRan = [];
        stateChange = [];
        const thing = rna.attach( html(), { foo: 137 } );

        thing.should.not.have.property( 'value' );
        thing.should.have.property( 'foo', 137 );
        initRan.should.deep.equal( [] );

        // BTW check that state switch wasn't called
        stateChange.should.deep.equal( [] );

        done(); 
    });

    it ('trigger method execution', done => {
        initRan = [];
        stateChange = [];
        const thing = rna.attach( html(), { bar: 137 } );

        thing.should.have.property( 'value', 137 );

        // BTW check default values for 'foo' which was omitted this time
        thing.should.have.property( 'foo', 42 );
        initRan.should.deep.equal( [thing, { bar : 137 }] );

        done(); 
    });

    it ('plays along with stickyState', done => {
        initRan = [];
        stateChange = [];
        const thing = rna.attach( html(), { quux: true } );
       
        stateChange.should.deep.equal([undefined, true]); 
        expect( thing.quux() ).to.equal(true);
        done(); 
    });
});

describe ('jRna.initArray', () => {
    const rna = new jRna()
        .initArray( 'foo' )
        .initArray( 'bar', [1,2,3] );

    it ('provides default values', done => {
        const it = rna.attach( html() );
        expect( it.foo ).to.deep.equal([]);
        expect( it.bar ).to.deep.equal([1,2,3]);

        done();
    });

    it ('does not share state', done => {
        const one = rna.attach( html() );
        const two = rna.attach( html() );

        one.foo.push( 1 );

        expect( one.foo ).to.deep.equal([1]);
        expect( two.foo ).to.deep.equal([]);

        done();
    });
});

describe ('jRna.initObject', () => {
    const rna = new jRna()
        .initObject( 'foo' )
        .initObject( 'bar', { age : 37 } );

    it ('provides default values', done => {
        const it = rna.attach( html() );
        expect( it.foo ).to.deep.equal({});
        expect( it.bar ).to.deep.equal({ age: 37 });

        done();
    });

    it ('does not share state', done => {
        const one = rna.attach( html() );
        const two = rna.attach( html() );

        one.bar.name = 'volodymyr';

        expect( one.bar ).to.deep.equal({ age: 37, name: 'volodymyr' });
        expect( two.bar ).to.deep.equal({ age: 37 });

        done();
    });
});

