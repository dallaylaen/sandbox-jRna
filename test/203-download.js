"use strict";
const chai = require('chai');
const should = chai.should();
const expect = chai.expect;

const jRna = require( '../lib/jRna.js' );

/* mock the whole solution :( */
const doc = {
    createElement : function( type ) {
        const element = { type };
        element.click  = () => { element.clicked = 1 };
        element.remove = () => { element.removed = 1 };
        element.setAttribute = (name, value) => { element[name] = value };
        return element;
    },
    body: {
        nodes : [],
        appendChild : function (node) {
            this.nodes.push(node);
        }
    }
};

const saved = global.window;

try {
    global.window = { document : doc };

    describe( 'jRna.download', () => {
        jRna.download( 'foobar.txt', '{"foo":42}' );

        it( 'makes a download', done => {
            doc.body.nodes.length.should.equal(1);

            const a = doc.body.nodes[0];

            a.should.have.property( 'download', 'foobar.txt' );
            a.should.have.property( 'href' );
            a.should.have.property( 'clicked', 1 );
            a.should.have.property( 'removed', 1 );
            
            a.href.should.match( /^data:application\/octet-stream/ );
            a.href.should.match( /foo.*42/ );
            
            done();
        });
    });
} catch (e) {
    throw e;
} finally {
    global.window = saved;
};

