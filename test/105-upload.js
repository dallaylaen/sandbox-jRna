
"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const html = require( '../lib/test/mock-html.js' );
const $ = global.window.$;

const jRna = require( '../lib/jrna.js' );

const { File, FileList } = window;

describe( 'jRna.upload', () => {
    const rna = new jRna()
        .html('<input type="file" class="jrna-upd">')
        .upload('upd');

    it( 'handles actual upload (TODO)', done => {
        const inst = rna.appendTo( html() );
        const probe = inst.container[0];
        expect( probe ).to.have.property( 'files' );

        // TODO actually upload smth
        done()
    });

    it( 'creates promises via uploadFile', done => {
        const file = new File(
            [ 'food\nbard\nbazooka\n' ],
            'file.txt',
            { type: 'text/plain' }
        );


        const prom = jRna.uploadFile(file);

        expect( prom ).to.be.instanceof(Promise);

        prom.then( result => {
            expect( result ).to.have.property( 'content', 'food\nbard\nbazooka\n' );
            done();
        });
    });
});

