/*
 *  jRna.js - interactive stateful UI widgets
 */
"use strict";

function get_stack(n) {
    /* a terrible rex that basically searches for file.js:nnn:nnn several times*/
    const in_stack = /(?:at\s+|@|\()\s*((?:\w+:\/\/)??[^:\s]+:\d+(?::\d+)?)\W*(\n|$)/g;
    const stack = new Error().stack;
    /* skip n frames */
    for (;n-->0;)
        if (!in_stack.exec(stack))
            return null;
    return (in_stack.exec(stack) || [])[1];
}

function jRna () {
    this.origin = get_stack(2);
    this.throw  = function(error) {
        throw new Error( error + " - jRna@"+this.origin );
    };

    this._known = {};
    for (let i of [ 'appendTo', 'container', 'element', 'id', 'onAttach', 'onRemove', 'remove' ])
        this._known[i] = true;
    this.lockName = function (name) {
        if (this._known[name]) {
            this.throw( "Property name already in use: "+name );
        }
        this._known[name] = true;
    };

    this.html = function( html ) {
        if (html) {
            const container = $( $.parseHTML( html ) );
            this.checkElement(container, 'accept html() that is');
        }
        this._html = html || undefined;
        return this;
    };
    this.htmlFrom = function(selector) {
        selector = this.checkElement(selector, "get HTML from");
        this._html = selector[0].outerHTML;
        return this;
    };

    // forbid 'special' arguments, expect for 'id'
    // TODO v2.0 forbid overriding methods or r/o properties with args
    this._args = {};
    for (let i in this._known)
        this._args[i] = false;
    this._args.id = true;
    this.args = function() {
        // TODO think about required args & type checks
        for( let i in arguments ) {
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
        this.lockName(name);
        return this.setup( id, function ( inst, element ) {
            Object.defineProperty(inst, name, {
                get: function() {
                    return this._attr[name]
                },
                set: function(newval) {
                    this._attr[name] = newval;
                    element.text(newval);
                },
                enumerable: true
            });
        } );
    };
    this.input = function( id, name ) {
        if (!name)
            name = id;
        this.lockName(name);
        return this.setup( id, function( inst, element ) {
            Object.defineProperty(inst, name, {
                get: function() {
                    return element.val();
                },
                set: function(newval) {
                    element.val(newval);
                },
                enumerable: true
            });
        } );
    };
    this.click = function( id, cb ) {
        return this.setup( id, function( inst, element ) {
            element.on( "click", function () { cb.bind(inst)(element); return false; } );
        } );
    };
    this.toggle = function( id, cb_on, cb_off ) {
        return this.setup( id, function( inst, element ) {
            let on = false;
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
    this.stickyClick = function( id, name, cb ) {
        this.lockName( name );
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
        this.lockName(name);
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
    this.upload = function( id, name, type ) {
        if (!name)
            name = id;
        this.lockName(name);
        return this.setup( id, function( inst, element ) {
            inst[name] = function(cb) {
                let prom = jRna.uploadFile( element[0].files[0], type );
                if (cb)
                    prom = prom.then(cb);
                return prom;
            };
        } );
    };
    this.download = function( id, generator ) {
        return this.setup( id, function( inst, element ) {
            element.on( "click", function() {
                let options = generator.bind(inst)();
                if (typeof options == 'string')
                    options = { content: options };
                const type = options.type || 'application/octet-strem';
                element.attr('target', 'blank');
                element.attr('download', options.name || 'file.txt');
                element.attr('href', 'data://'+type+','+options.content);
                return true; // let event propagate
            } );
        });
    };

    this._init = {};
    this.def = function( name, action ) {
        this.lockName(name);
        this._init[name] = function() { return action; };
        return this;
    };
    this.init = function( name, action ) {
        this.lockName(name);
        this._init[name] = action;
        return this;
    };
    // A stupid state machine that allows to only enter every state once
    this.stickyState = function( name, action_hash, initial ) {
        // TODO validate action_hash & initial values
        const me = this;

        if (typeof initial != 'undefined' && !action_hash[initial])
            this.throw("Illegal initial state "+initial);

        // must use init to avoid sharing state between instances
        this.init( name, function() {
            let state = initial;
            return function(arg) {
                // 0-arg => getter
                if (typeof arg == 'undefined')
                    return state;

                if (arg != state) {
                    const todo = action_hash[''+arg];
                    if (!todo)
                        me.throw('Illegal state switch for '+name+': '+state+'->'+arg);
                    todo.bind(this)(state, arg); // (old, new)
                    state = arg;
                }
                return this;
            };
        });
        return this;
    };

    // callbacks!
    this._onAttach = [];
    this.onAttach = function(fun) {
        this._onAttach.push(fun);
        return this;
    };

    const callbacks  = {
        on_remove   : [],
    };
    for(let i in callbacks) {
        this[i] = function(cb) {
            callbacks[i].push(cb);
            return this;
        };
    }

    this.checkElement = function(element, action="address") {
        // TODO extract the selector from $, too
        if (!element)
            this.throw( "Cannot "+action+" a null element");

        let selector = '';
        if (typeof element == 'string') {
            selector = ' $('+element+')';
            element = $( element );
        }
        if (!(element instanceof $))
            this.throw( "Cannot "+action+" a non-$ object" );
        if (!element.length)
            this.throw( "Cannot "+action+" a missing element"+selector );
        if ( element.length > 1)
            this.throw( "Cannot "+action+" an ambiguous element"+selector );
        return element.first();
    };

    this.attach = function(container, args={}) {
        // validate container first, check args after instance is populated
        container = this.checkElement(container, "attach to");

        // rename this to meta to avoid confusion with instance's `this`
        const meta = this;

        const inst = new jRna.Bound(container);
        inst._attr       = {}; // remove when input, output go get/set
        inst.container   = container;

        for (let i in callbacks) {
            // inst._foobar actual callback list, inst.foobar appender
            inst['_'+i] = [].concat(callbacks[i]);
            inst[i] = function(cb) {
                inst['_'+i].push(cb);
                return inst;
            };
        }

        inst._element    = {};
        inst.element = function (id) {
            return inst._element[id];
        };

        // TODO better name
        inst.appendTo = function( element ) {
            element = meta.checkElement(element, "append to");
            element.append( inst.container );
            return inst;
        };

        inst.remove = function() {
            for (let i in inst._on_remove ) {
                inst._on_remove[i].bind(inst)();
            }
            inst.container.remove();
        };

        // resolve all needed elements at once
        for (let i in meta._setup) {
            const action = meta._setup[i];
            const cls = jRna.prefix+action[0];
            let all = container.find( '.'+cls );
            // this is ugly! find() omits the container itself,
            // but we may need it for the sake of minimalism
            if (container.hasClass(cls))
                all = container.add(all);
            meta.checkElement(all, 'fulfill .'+cls+' with');
            action[1](inst, all);
            inst._element[action[0]] = all;
        }

        // process arguments & initial values
        for( let key in args ) {
            // TODO throw all of extra args, not just the first
            if (!meta._args[key] )
                meta.throw( "unknown argument "+key);
            inst[key] = args[key];
        }
        for( let i in meta._init ) {
            if(!(i in inst))
                inst[i] = meta._init[i].bind(inst)();
        }

        // execute callbacks
        // TODO rewrite this
        for (let i in meta._onAttach ) {
            meta._onAttach[i].bind(inst)();
        }
        return inst;
    }; // end of this.attach

    this.appendTo = function( element, args ) {
        return this.spawn(args).appendTo(element);
    };

    this.spawn = function( args ) {
        // TODO this dies if >1 nodes, so move the check into html()
        if (!this._html)
            this.throw('Trying to spawn with an empty html()');
        const container = $( $.parseHTML( $.trim( this._html ) ) );
        this.checkElement(container, 'spawn() while html() is');
        return this.attach( container, args );
    };
}

// empty constructor for instanceof'ing
// TODO how to do it better?
/**
*   @constructor
*   @this {jRna.Bound}
*/
jRna.Bound = function () {};

// prefix all CSS classes to avoid namespace pollution
jRna.prefix = 'jrna-';

jRna.documentTitle = function(...args) {
    const me = {};
    Object.defineProperty( me, 'update', {
        value: function() {
            document.title = args.join('');
            return me;
        }
    });

    // cosplay an array - but with a modification hook
    for (let i in args) {
        Object.defineProperty(me, i, {
            get: function() { return args[i] },
            set: function(val) { args[i] = val; this.update() },
            enumerable: true
        });
    }
    Object.defineProperty( me, 'length', {
        value: args.length
    });
    return me;
}

jRna.uploadFile = function ( file, type ) {
    const types = {
        text : 'readAsText',
        raw  : 'readAsBinaryString',
        url  : 'readAsDataUrl'
    };
    const how = types[ type || 'text' ];
    if (!how)
        throw new Error("uploadFile(): type must be 'text'(default), 'raw', or 'url'");
    const reader = new FileReader();
    return new Promise(function(done) {
        reader.onload = function () {
            let result = { content: reader.result, info: file };
            for (let key in file) {
                result[key] = file[key];
            }
            done(result);
        };
        reader[how](file);
    });
};

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
        return new Promise( function (done) {
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
