"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

// never used, except for creating in-memory nodes
const html = require( '../lib/test/mock-html.js' );

const jRna = require( '../lib/jRna.js' );

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

