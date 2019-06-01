"use strict";

const chai = require('chai');
const should = chai.should();
const expect = chai.expect;
const MockXMLHttpRequest = require('mock-xmlhttprequest');

const html = require( '../lib/test-mock-html.js' );

const jRna = require( '../lib/jRna.js' );

describe( "jRna.documentTitle", () => {
    const title = jRna.documentTitle("foo", "bar", "baz");

    it( "is effectless by default", (done) => {
        document.title.should.equal('');
        done();
    });

    it( "cosplays an array", (done) => {
        title.length.should.equal(3);

        for (let i in title) {
            // which means i.should.be.integer()
            Number.isNaN(Number.parseInt(i)).should.equal(false);
        };

        done();
    });

    it( "modifies title", (done) => {
        title.update();
        document.title.should.equal( "foobarbaz" );
        done();
    });

    it( "modifies title when partially changed" , (done) => {
        title[1] += 'd';
        document.title.should.equal( "foobardbaz" );
        done();
    });
});


