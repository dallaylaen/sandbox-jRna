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

    for( var i in args ) {
        // TODO throw all of extra args, not just the first
        if (!meta._args[i] )
            throw "unknown argument in jRna: "+i;
        this[i] = args[i];
    };

    for( var i in meta._init ) {
        this[i] = meta._init[i].bind(this)();
    };

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
        // TODO better type check
        if (!element)
            throw "Cannot attach to a missing element";
        this.container = element;
        meta.post_setup(this, element);

        for (var i in this._on_attach ) {
            this._on_attach[i].bind(this)();
        };

        return this;
    };

    // TODO better name
    this.append_to = function( element ) {
        element.append( this.container );
        this.refresh();
        return this;
    };

    this.remove = function() {
        for (var i in this._on_remove ) {
            this._on_remove[i].bind(this)();
        };
        this.container.remove();
    };

    this.refresh = function () {
        for (var i in this._on_refresh) {
            this._on_refresh[i].bind(this)();
        };
    };
};

function jRna () {
    this._known = {};
    this.lock_name = function (name) {
        if (this._known[name]) {
            throw "Name is already in use: "+name;
        };
        this._known[name] = true;
    };

    this.html = function( html ) {
        this._html = html;
        return this;
    };

    this._args = {id: true};
    this.args = function() {
        // TODO think about required args & type checks
        for( var i in arguments ) {
            this._args[ arguments[i] ] = true;
        };
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
                    element.val(test);
                    return this;
                } else {
                    return element.val();
                };
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
            element.click( function () { cb.bind(inst)(element); return false; } );
        } );
    };
    this.toggle = function( id, cb_on, cb_off ) {
        return this.setup( id, function( inst, element ) {
            var on = false;
            element.click( function () {
                if (on ^= true) {
                    cb_on.bind(inst)(element);
                } else {
                    cb_off.bind(inst)(element);
                };
                return false;
            } );
        } );
    };
    // TODO rename
    this.sticky_click = function( id, name, cb ) {
        this.lock_name( name );
        return this.setup( id, function( inst, element ) {
            element.click( function () {
                if (!inst[name]) {
                    inst[name] = true;
                    cb.bind(inst)(element);
                };
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

    // TODO better name! check args! more args!
    this.json_request = function(name, spec = {}) {
        var url = spec.url;
        var method = spec.method;

        this.def( name, function(args, cb) {
            var me = this;
            var xhr = new XMLHttpRequest();
            if (!cb)
                cb = spec.callback;

            xhr.addEventListener( "load", function() {
                var data = JSON.parse(this.responseText);
                cb.bind(me)(data);
            } );
            xhr.open(method, url);
            xhr.setRequestHeader( "Content-Type", "application/json" );
            xhr.send(JSON.stringify(args));
            return this;
        } );
    };

    // create a child node
    this.child = function( id, add_name, store_as ) {
        if (!store_as)
            store_as = id;
        if (store_as == add_name)
            throw ("child(): get & spawn accessors must have different names");

        this.lock_name(add_name);
        this.init( store_as, function () {
            return new Set();
        });
        return this.setup( id, function( inst, element ) {
            inst[add_name] = function( boxtype, id ) {
                var chld = boxtype.spawn(id);
                chld.on_remove(function() { inst[store_as].delete(chld) });
                chld.append_to(element);
                inst[store_as].add(chld);
                return chld;
            };
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
    };

    this.attach = function(element, args) {
        var inst = new jRnaInstance(this, args);

        return inst.attach(element);
    };

    this.spawn = function( args ) {
        // TODO parseHTML instead.
        var container = jQuery( "<div/>", { class : "box-instance" } );
        container.html( this._html );
        return this.attach( container, args );
    };

    this.post_setup = function(inst, container) {
        for (var i in this._setup) {
            var action = this._setup[i];
            var all = container.find( action[0] );

        console.log(all);
            
            if (all.length == 0)
                throw "No element '#"+action[0]+"' for jRna '"+inst.id+"' in container "+container;
            action[1](inst, all.first);
            inst._element[action[0]] = all.first;
        };
    };
};

module.exports = jRna;
