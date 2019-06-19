
"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const html = require( '../lib/test/mock-html.js' );
const $ = global.window.$;

const jRna = require( '../lib/jrna.js' );

const { File, FileList } = window;

describe( 'new jRna().upload', () => {
    const rna = new jRna()
        .html('<input type="file" class="jrna-upd">')
        .upload('upd');

    it( 'handles actual upload (TODO)', done => {
        const inst = rna.appendTo( html() );
        const probe = inst.container[0];
        expect( probe ).to.have.property( 'files' );

        html.addFileList( probe, [ fakeFile('somedata') ] );
        probe.dispatchEvent(new window.Event('input'));

        const prom = inst.upd();
        expect( prom ).to.be.instanceof(Promise);

        prom.then(data => {
            expect( data ).to.have.property( 'content', 'somedata' );

            done();
        });
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

describe( 'jRna.upload() [static]', () => {
    it( 'returns an upload promise', done => {
        const root = html();

        expect( root.find('input') ).to.have.property('length', 0);

        const prom = jRna.upload();
        expect( prom ).to.be.instanceof(Promise);

        expect( root.find('input') ).to.have.property('length', 1);
        const probe = root.find('input')[0];

        // now the "user" uploads a "file"
        html.addFileList( probe, [ fakeFile('food\nbard\nbazooka\n') ] );
        probe.dispatchEvent(new window.Event('input'));

        prom.then( data => {
            // got the file back
            expect( data ).to.have.property( 'content', 'food\nbard\nbazooka\n' );
            expect( data ).to.have.property( 'size', 'food\nbard\nbazooka\n'.length );

            // fake element removed from window
            expect( root.find('input') ).to.have.property('length', 0);

            done();
        });
    });
});

function fakeFile(content='', opts={}) {
    return new File(
        [ content ],
        opts.name || 'file.txt',
        { ...opts }
    );
};

