"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const html = require( '../lib/test/mock-html.js' );

const jRna = require( '../lib/jrna.js' );

describe( 'jRna.curry', () => {
    const snippet = [
        '<span>',
        '<a href="#" class="jrna-extra">1</a>',
        '<a href="#" class="jrna-method">2</a>',
        '<a href="#" class="jrna-both">3</a>',
        '</span>'
    ].join('');

    let trace;
    const rna = new jRna()
        .html( snippet )
        .def( 'doit', function(...args) {
            trace = [ 'm', this ].concat( args );
        })
        .click( 'extra', [
            function (...args) { trace = [ 'f', this ].concat( args ) },
            1,2,3
        ])
        .on( 'click', 'method', 'doit' )
        .stickyClick( 'both', 'lock', ['doit', 1, 2, 3] )
        .spawn();

    // cannot attach to html in descript
    // and must thus use this boilerplate
    function sendClick (name) {
        const root = html();
        rna.appendTo( root );

        const probe = root.find('.jrna-'+name);
        expect( probe.length ).to.equal(1);
        trace = [];
        probe.trigger('click');
        expect( trace.length ).not.to.equal(0);
        console.log( trace );
        return trace.pop();
    };

    it('handles extra arguments', done => {
        const ev = sendClick( 'extra' );

        // TODO must send events consistently
        // expect( ev ).to.have.property( 'type', 'click' );
        trace.should.deep.equal( ['f', rna, 1, 2, 3 ] );
        done();
    });

    it('resolves methods by name', done => {
        const ev = sendClick( 'method' );

        trace.should.deep.equal( ['m', rna ] );
        // TODO better testing of event
        expect( ev ).to.have.property( 'type', 'click' );

        done();
    });

    it('does both', done => {
        const ev = sendClick( 'both' );

        // TODO must send events consistently
        // expect( ev ).to.have.property( 'type', 'click' );
        trace.should.deep.equal( ['m', rna, 1, 2, 3 ] );
        rna.should.have.property( 'lock', true );
        done();
    });

    it('rejects rubbish args', done => {
        const rna = new jRna();

        expect( function() {
            rna.click('foo', {} );
            rna.attach( html( '<a href="#" class="jrna-foo"></a>' ) );
        }).to.throw(/[Uu]nexpected.*callback/);

        done();
    });
});
