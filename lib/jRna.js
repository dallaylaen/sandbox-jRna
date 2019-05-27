/*
 *  jRna.js - interactive stateful UI widgets
 */
"use strict";

// TODO hide private var
var box_instance_counter = 0;

function jRnaInstance (meta, args={}) {
    this._on_remove  = [];
    this._on_refresh = [];
    this._on_attach  = [];
    this._attr       = {};
    this._element    = {};

    for( let key in args ) {
        // TODO throw all of extra args, not just the first
        if (!meta._args[key] )
            throw "unknown argument in jRna: "+key;
        this[key] = args[key];
    }

    for( var i in meta._init ) {
        this[i] = meta._init[i].bind(this)();
    }

    if (!this.id)
        this.id = "box-instance-" + ++box_instance_counter;

    this.on_remove = function(cb) {
        this._on_remove.push(cb);
        return this;
    };
    this.on_refresh = function(cb) {
        this._on_refresh.push(cb);
        return this;
    };
    this.on_attach = function(cb) {
        this._on_attach.push(cb);
        return this;
    };

    this.element = function (id) {
        return this._element[id];
    };

    // TODO make attach only work once
    this.attach = function( element ) {
        if (!element || !element.length)
            throw "Cannot attach to a missing element";
        element = element.first();
        this.container = element;
        meta.post_setup(this, element);

        for (var i in this._on_attach ) {
            this._on_attach[i].bind(this)();
        }

        return this;
    };

    // TODO better name
    this.append_to = function( element ) {
        if (!element || !element.length)
            throw "Cannot append to a missing element";
        element = element.first();
        element.append( this.container );
        this.refresh();
        return this;
    };

    this.remove = function() {
        for (var i in this._on_remove ) {
            this._on_remove[i].bind(this)();
        }
        this.container.remove();
    };

    this.refresh = function () {
        for (var i in this._on_refresh) {
            this._on_refresh[i].bind(this)();
        }
    };
}

function jRna () {
    this._known = {};
    this.lock_name = function (name) {
        if (this._known[name]) {
            throw "Name is already in use: "+name;
        }
        this._known[name] = true;
    };

    this.html = function( html ) {
        this._html = html;
        return this;
    };
    this.html_from = function() {
        if (!arguments.length)
            throw "jRna.html_from(): At least one argument required";
        // TODO use vanilla JS instead
        var selector = $("body");
        for( var i in arguments ) {
            selector = selector.find('#'+arguments[i]).first();
            if (!selector.length) {
                throw "jRna.html_from(): Cannot find element '#"+arguments[i]+"'";
            }
        }
        this._html = selector.html();
        return this;
    };

    this._args = {id: true};
    this.args = function() {
        // TODO think about required args & type checks
        for( var i in arguments ) {
            this._args[ arguments[i] ] = true;
        }
        return this;
    };

    // perform action( box, box.find(id) ) on box creation
    this._setup = [];
    this.setup = function( id, action ) {
        this._setup.push( [id, action ] );
        return this;
    };

    this.output = function( id, name ) {
        if (!name)
            name = id;
        this.lock_name(name);
        return this.setup( id, function ( inst, element ) {
            inst[name] = function() {
                // make accessor with side effect
                if ( arguments.length > 0) {
                    this._attr[name] = arguments[0];
                    element.text(arguments[0]);
                    return this;
                } else {
                    return this._attr[name];
                }
            };
        } );
    };
    this.input = function( id, name ) {
        if (!name)
            name = id;
        this.lock_name(name);
        return this.setup( id, function( inst, element ) {
            inst[name] = function(text) {
                if (arguments.length > 0) {
                    element.val(text);
                    return this;
                } else {
                    return element.val();
                }
            };
        } );
    };
    this.input_cb = function( id, cb ) {
        return this.setup( id, function( inst, element ) {
            element.change( function() { cb.bind(inst)( element.val() ); return false; } );
        } );
    };
    this.click = function( id, cb ) {
        return this.setup( id, function( inst, element ) {
            element.on( "click", function () { cb.bind(inst)(element); return false; } );
        } );
    };
    this.toggle = function( id, cb_on, cb_off ) {
        return this.setup( id, function( inst, element ) {
            var on = false;
            element.on('click', function () {
                if ((on ^= true) == true) {
                    cb_on.bind(inst)(element);
                } else {
                    cb_off.bind(inst)(element);
                }
                return false;
            } );
        } );
    };
    // TODO rename
    this.sticky_click = function( id, name, cb ) {
        this.lock_name( name );
        return this.setup( id, function( inst, element ) {
            element.on('click', function () {
                if (!inst[name]) {
                    inst[name] = true;
                    cb.bind(inst)(element);
                }
                return false;
            } );
        } );
    };
    this.element = function ( id, name ) {
        if (!name)
            name = id;
        this.lock_name(name);
        return this.setup( id, function( inst, element ) {
            inst[name] = element;
        } );
    };

    this.on = function( id, trigger, cb ) {
        return this.setup(id, function(inst, element) {
            element.on(trigger, function(ev) {
                cb.bind(inst)(ev);
            });
        });
    };

    this.backend = function(name, spec = {}) {
        const worker = jRna.backend(spec);
        this.def( name, function(args, callback) {
            if (!callback)
                callback = spec.callback;
            me = this;
            worker(args).then( callback.bind(me) )
        } );
    };

    this._init = {};
    this.def = function( name, action ) {
        this.lock_name(name);
        this._init[name] = function() { return action; };
        return this;
    };
    this.init = function( name, action ) {
        this.lock_name(name);
        this._init[name] = action;
        return this;
    };

    var callbacks  = {
        on_refresh  : [],
        on_remove   : [],
        on_attach   : []
    };
    for(var i in callbacks) {
        this._init["_"+i] = function () {
            return [].concat( callbacks[i] );
        };
        this[i] = function(cb) {
            callbacks[i].push(cb);
            return this;
        };
    }

    this.attach = function(element, args) {
        var inst = new jRnaInstance(this, args);

        return inst.attach(element);
    };

    this.spawn = function( args ) {
        // TODO parseHTML instead.
        var container = $( "<span/>", { class : "jrna-envelope" } );
        container.html( this._html );
        return this.attach( container, args );
    };

    this.post_setup = function(inst, container) {
        for (var i in this._setup) {
            var action = this._setup[i];
            var all = container.find( "#"+action[0] );
            if (all.length == 0)
                throw "No element '#"+action[0]+"' for jRna '"+inst.id+"' in container "+container;
            action[1](inst, all.first());
            inst._element[action[0]] = all.first();
        }
    };
}

jRna.backend = function(spec = {}) {
    const url = spec.url;
    if (!url)
        throw new Error("jRna.backend: 'url' parameter is required");

    const method = (spec.method || 'POST').toUpperCase();
    let content_type, parse, stringify;

    // TODO if type == json
    content_type = 'application/json';
    parse        = JSON.parse;
    stringify    = JSON.stringify;

    return function(args) {
        let query = '';
        return new Promise( function (done, error) {
            const xhr = new XMLHttpRequest();

            xhr.addEventListener( "load", function() {
                const data = parse(this.responseText);
                done(data);
            } );
            xhr.open(method, url + query);
            if (content_type)
                xhr.setRequestHeader( "Content-Type", content_type );
            xhr.send(stringify(args));
        } );
    };
};

if (typeof module === 'object' && typeof module.exports === 'object' ) {
    // we're being exported
    module.exports = jRna;
}
