/* tests of jRna that don't require mocking html at all */

"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const jRna = require( '../lib/jrna.js' );

describe( 'jRna.parseId', () => {
    it( 'accepts strings', done => {
        const arg = 'foo';
        const [id, name] = jRna.parseId(arg);

        expect(id).to.equal( 'foo' );
        expect(name).to.equal( 'foo' );

        done();
    });

    it( 'accepts arrays', done => {
        const arg = [ 'foo' ];
        const [id, name] = jRna.parseId(arg);

        expect(id).to.equal( 'foo' );
        expect(name).to.equal( 'foo' );

        done();
    });

    it( 'accepts arrays', done => {
        const arg = [ 'foo', 'bar' ];
        const [id, name] = jRna.parseId(arg);

        expect(id).to.equal( 'foo' );
        expect(name).to.equal( 'bar' );

        done();
    });

    it( 'can skip name with a string', done => {
        const arg = 'foo';
        const [id, name] = jRna.parseId(arg, { skipMissing : true });

        expect(id).to.equal( 'foo' );
        expect(name).to.be.undefined;

        done();
    });

    it( 'can skip name with an array', done => {
        const arg = [ 'foo' ];
        const [id, name] = jRna.parseId(arg, { skipMissing : true });

        expect(id).to.equal( 'foo' );
        expect(name).to.be.undefined;

        done();
    });

    it( 'forbids trash', done => {
        expect( () => jRna.parseId( {} ) ).to.throw(/.*string.*or.*array/);
        expect( () => jRna.parseId( undefined ) ).to.throw(/.*string.*or.*array/);
        expect( () => jRna.parseId( [ {} ] ) ).to.throw(/.*string.*or.*array/);
        expect( () => jRna.parseId( [ 1, 2, 3 ] ) ).to.throw(/.*string.*or.*array/);

        done();
    });
});
