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
};

function jRna () {
    this.origin = get_stack(2);
    this.throw  = function(error) {
        throw new Error( error + " - jRna@"+this.origin );
    };

    this._known = {};
    this.lock_name = function (name) {
        if (this._known[name]) {
            this.throw( "Property name already in use: "+name );
        }
        this._known[name] = true;
    };

    this.html = function( html ) {
        this._html = html;
        return this;
    };
    this.html_from = function(...args) {
        if (!args.length)
            this.throw( "At least one argument required by html_from()");
        // TODO use vanilla JS instead
        let selector = $("body");
        for( let i of args ) {
            selector = selector.find('#'+i).first();
            if (!selector.length)
                this.throw( "Cannot locate element via path "+args.join(",")+" by html_from()");
        }
        this._html = selector.html();
        return this;
    };

    this._args = {id: true};
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
    this.upload = function( id, name, type ) {
        if (!name)
            name = id;
        this.lock_name(name);
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
        this.lock_name(name);
        this._init[name] = function() { return action; };
        return this;
    };
    this.init = function( name, action ) {
        this.lock_name(name);
        this._init[name] = action;
        return this;
    };

    // TODO rewrite this
    const callbacks  = {
        on_remove   : [],
        on_attach   : []
    };
    for(let i in callbacks) {
        this._init["_"+i] = function () {
            return [].concat( callbacks[i] );
        };
        this[i] = function(cb) {
            callbacks[i].push(cb);
            return this;
        };
    }

    this.checkElement = function(element, action="address") {
        if (!element)
            this.throw( "Cannot "+action+" a missing element");
        if (typeof element == 'string')
            element = $( '#'+element );
        if (!element.length)
            this.throw( "Cannot "+action+" a missing element" );
        return element.first();
    };

    this.attach = function(container, args) {
        // validate container first, check args after instance is populated
        container = this.checkElement(container, "attach to");

        // rename this to meta to avoid confusion with instance's `this`
        const meta = this;

        // create instance
        const inst = new jRnaBound();
        inst._on_remove  = [];
        inst._attr       = {};
        inst._element    = {};
        inst.container   = container;

        inst.on_remove = function(cb) {
            inst._on_remove.push(cb);
            return inst;
        };

        inst.element = function (id) {
            return inst._element[id];
        };

        // TODO better name
        inst.append_to = function( element ) {
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

        for (let i in meta._setup) {
            const action = meta._setup[i];
            const all = container.find( "#"+action[0] ).first();
            if (all.length == 0)
                meta.throw( "No element #"+action[0]+" inside #"+container.attr("id") );
            action[1](inst, all);
            inst._element[action[0]] = all;
        }

        for( let i in meta._init ) {
            inst[i] = meta._init[i].bind(inst)();
        }

        for( let key in args ) {
            // TODO throw all of extra args, not just the first
            if (!meta._args[key] )
                meta.throw( "unknown argument "+key);
            inst[key] = args[key];
        }

        // execute callbacks
        // TODO rewrite this
        for (let i in inst._on_attach ) {
            inst._on_attach[i].bind(inst)();
        }
        return inst;
    }; // end of this.attach

    this.append_to = function( element, args ) {
        return this.spawn(args).append_to(element);
    };

    this.spawn = function( args ) {
        // TODO parseHTML instead.
        const container = $( "<span/>", { class : "jrna-envelope" } );
        container.html( this._html );
        return this.attach( container, args );
    };
}

// empty constructor for instanceof'ing
// TODO how to do it better?
function jRnaBound () { }
jRna.Bound = jRnaBound;


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
    };
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
        throw new Error("uploadFile(): type must be 'text'(default), 'raw', of 'url'");
    const reader = new FileReader();
    return new Promise(function(done) {
        reader.onload = function (ev) {
            let result = { content: reader.result, info: file };
            for (let key in file) {
                result[key] = file[key];
            };
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
