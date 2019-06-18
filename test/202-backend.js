"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const MockXMLHttpRequest = require('mock-xmlhttprequest');

const jRna = require( '../lib/jrna.js' );

describe ('jRna.backend', () => {
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
