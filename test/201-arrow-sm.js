"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const ArrowSM = require('../lib/arrow-sm.js');

describe( "ArrowSM (toggle)", () => {
    const sm = ArrowSM( false, {
        true:  () => false,
        false: () => true
    });
    it( "is in initial state", done => {
        sm.state().should.equal(false);

        done();
    });
    it( "is a function", done => {
        sm().should.equal(sm);
        done();
    });
    it( "is in new state", done => {
        sm.state().should.equal(true);
        done();
    });
});

describe( "ArrowSM (return)", () => {
    const sm = ArrowSM( true, {
        true : (n) => [ false, -n ],
        false: (n) => [ true,   n ]
    });

    it( "returns a value", done => {
        sm(8).should.equal(-8);
        done();
    });
    it( "returns a value again", done => {
        sm(8).should.equal(8);
        done();
    });
});

describe( "ArrowSM (bind)", () => {
    const foo = { x: 0};
    const sm = ArrowSM( 1, {
        1: function (n) { this.x = n; return }
    });

    it ("binds", done => {
        sm.bind(foo);
        sm(42);
        foo.x.should.equal(42);
        done();
    });
});
