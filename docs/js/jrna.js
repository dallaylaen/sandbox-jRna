(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){


/* Determine n-th caller up the stack */
/* Inspired by Perl's Carp module */
function callerInfo(n) {
    /* a terrible rex that basically searches for file.js:nnn:nnn several times*/
    const inStack = /([^:\s]+:\d+(?::\d+)?)\W*(\n|$)/g;
    return (new Error().stack.match(inStack)[n+1] || '')
        .replace(/[^/\w]*/, '').replace(/\D*$/,'');
}

if (typeof module !== 'undefined' && module && typeof module.exports !== 'undefined' ) {
    module.exports = callerInfo;
}


},{}],2:[function(require,module,exports){
/*
 *  jrna.js - interactive stateful UI widgets
 */

const jRna = (function(){
    "use strict";

    /*
    First of all, some macros for jsdoc because it's too boring to write it every time

    @macro oneof
        one of {@link jRna#attach attach}, {@link jRna#appendTo appendTo},
        or {@link jRna#instantiate instantiate}
    @end oneof

    @macro mutator name
        @function %(name)
        @memberOf jRna
        @instance
        @returns {jRna} <tt>this</tt> (chainable)
    @end mutator

    @macro id
        @param {string} receptor
        A jrna-prefixed class in the DOM
    @end id

    @macro receptor
        @param {string|Array} receptor
        A jrna-prefixed class in the DOM
        and the name of the corresponding property in the jRna instance.
        Use a 2-element array if different names are needed.
    @end receptor

    @macro currycb name args when
        @param {function|string|Array} %(name)
        Run <tt>%(name)(%(args))</tt> %(when).
        <tt>this</tt> is set to current <i>jRna instance</i>.
        A method name may be used instead of function.
        An Array may be used containing any of the above
        plus some additional values to be prepended to the argument list.
    @end currycb

    */

    // first check for $
    if (typeof window !== 'undefined' &&
        (typeof window.$ !== 'function' || typeof window.document === 'undefined'))
            throw new Error('jRna: refusing to run without a window.$ and window.document');

    const callerInfo = require('./dep/caller-info.js');
//    const ArrowSM    = require('./dep/arrow-sm.js');

    /**
    *   jRna is an application building block that maps its internal state
    *   onto a DOM subtree.
    *
    *   To actually become effectful, it must be instanciated with
    *   @oneof
    *       one of {@link jRna#attach attach}, {@link jRna#appendTo appendTo},
    *       or {@link jRna#instantiate instantiate}
    *   @end oneof
    *   methods.
    *
    *   @constructor
    *   @this {jRna}
    */
    function jRna () {
        // `origin` is the place where `new jRna()` was called for given instance.
        // `blame` throws error but also points out where the definition was.
        // This idea was mostly stolen from Perl's Carp module.
        const origin = this.origin = callerInfo(1);
        const blame  = function(error) {
            throw new Error( error + " - jRna@"+origin );
        };

        // Use browser to parse HTML.
        const parseHTML = function(str) {
            const fakeHTML = window.document.createElement('div');
            fakeHTML.setAttribute( 'style', 'display: none' );
            fakeHTML.innerHTML = str;
            if (!fakeHTML.firstChild)
                blame("Attempt to use empty HTML");
            if (fakeHTML.firstChild.nodeType !== 1) {
                blame("Attempt to use non-element as HTML container");
            }
            if (fakeHTML.firstChild !== fakeHTML.lastChild) {
                blame("Attempt to create multiple tag HTML");
            }
            return fakeHTML.firstChild;
        };

        // lockName('foo') - prevent using the name again
        // This is internal function
        this._known = {};
        for (let i of [ 'appendTo', 'container', 'element', 'id', 'onAttach', 'onRemove', 'remove' ])
            this._known[i] = true;
        this.lockName = function (name, shared) {
            if (this._known[name] && this._known[name] !== shared) {
                blame( "Property name already in use: "+name );
            }
            this._known[name] = shared || true;
        };
        const isMethod = {};

        /**
        *  Set in-memory HTML snippet to attach to.
        *
        *  @mutator html
        *      @function html
        *      @memberOf jRna
        *      @instance
        *      @returns {jRna} <tt>this</tt> (chainable)
        *  @end mutator
        *  @param {string} html - must contain exactly one root node
        */
        this.html = function( html ) {
            if (html !== undefined) {
                const element = parseHTML( html );
                this._master = element;
            } else {
                this._master = undefined;
            }
            return this;
        };

        /**
        *  Fetch HTML snippet from the document itself.
        *  Typically such snippets should reside within a hidden block.
        *
        *  @mutator htmlFrom
        *      @function htmlFrom
        *      @memberOf jRna
        *      @instance
        *      @returns {jRna} <tt>this</tt> (chainable)
        *  @end mutator
        *  @param {string|jQuery} selector - where to search for the root element
        */
        this.htmlFrom = function(selector) {
            selector = this.checkElement(selector, "get HTML from");
            this.html( selector[0].outerHTML );
            return this;
        };

        const noArgs = {}
        for (let i in this._known)
            noArgs[i] = true;
        const allowArgs = { id : true };
        const assignArgs = { id : true };

        /**
        *  Add one allowed argument with fine-grained control for
        *  @oneof
        *      one of {@link jRna#attach attach}, {@link jRna#appendTo appendTo},
        *      or {@link jRna#instantiate instantiate}
        *  @end oneof
        *
        *  @mutator addArgument
        *      @function addArgument
        *      @memberOf jRna
        *      @instance
        *      @returns {jRna} <tt>this</tt> (chainable)
        *  @end mutator
        *  @param {string} name Name of the argument
        *  @param {Object} spec
        *  { assign: true | false } - whether to try assigning this argument
        *  to eponymous property
        */
        this.addArgument = function( name, spec={} ) {
            if (spec.forbidden) {
                // special case
                if (allowArgs[name])
                    blame( 'Forbidden argument name: '+name );
                noArgs[name] = true;
                return this;
            }

            if (noArgs[name])
                blame( 'Forbidden argument name: '+name );
            allowArgs [name] = true;
            assignArgs[name] = spec.assign;
            // TODO more fancy stuff
            return this;
        };

        /**
        *  Specify one or more optional argument keys for
        *  @oneof
        *      one of {@link jRna#attach attach}, {@link jRna#appendTo appendTo},
        *      or {@link jRna#instantiate instantiate}
        *  @end oneof
        *  methods.
        *  May be called more than once.
        *  By default, only 'id' argument is allowed.
        *
        *  @mutator args
        *      @function args
        *      @memberOf jRna
        *      @instance
        *      @returns {jRna} <tt>this</tt> (chainable)
        *  @end mutator
        *  @param {...string} argumentName - list of allowed arguments
        */
        this.args = function(...list) {
            // TODO think about required args & type checks
            for( let i of list )
                this.addArgument( i, { assign: true } );
            return this;
        };

        /**
        *  Upon <i>binding</i>, locate element with receptor class
        *  and execute callback on it and the newly created instance.
        *
        *  Please seriously consider sending a bug report if you ever need
        *  to call this directly.
        *
        *  @mutator setup
        *      @function setup
        *      @memberOf jRna
        *      @instance
        *      @returns {jRna} <tt>this</tt> (chainable)
        *  @end mutator
        *  @id
        *      @param {string} receptor
        *      A jrna-prefixed class in the DOM
        *  @end id
        *  @param {function} action
        *  Call action( instance, element ) while the bound jRna instance
        *  is being created. Note <tt>this</tt> is <i>not</i> set.
        */
        this._setup = [];
        this._wanted = {};
        this.setup = function( id, action ) {
            this._setup.push( [id, action ] );
            this._wanted[ jRna.prefix + id ] = id;
            return this;
        };

        // unify callbacks:
        // function => itself
        // string   => instance method
        // [ function|string, ...args ] => fucntion( args, ... ) // curry!
        // otherwise throw
        const curry = function(item, spec) {
            if (!Array.isArray(spec))
                spec = [ spec ];
            const [todo, ...preargs] = spec;

            // named method - TODO write more efficient code
            if (typeof todo === 'string') {
                return function(...args) {
                    return item[todo].apply( item, preargs.concat(args) );
                };
            }

            // normal function with preargs
            if (preargs.length && typeof todo === 'function') {
                return function(...args) {
                    return todo.apply( item, preargs.concat(args) );
                };
            }

            // normal function
            // TODO detect already bound functions & throw
            if (typeof todo === 'function')
                return todo.bind(item);

            // finally - don't know what user wants
            blame( 'Unexpected callback argument' );
        };

        /**
        *    Create a writable property. Update will trigger setting the text
        *    content of the affected DOM element.
        *    @mutator output
        *        @function output
        *        @memberOf jRna
        *        @instance
        *        @returns {jRna} <tt>this</tt> (chainable)
        *    @end mutator
        *    @receptor
        *        @param {string|Array} receptor
        *        A jrna-prefixed class in the DOM
        *        and the name of the corresponding property in the jRna instance.
        *        Use a 2-element array if different names are needed.
        *    @end receptor
        */

        this.output = function( receptor ) {
            const [id, name] = jRna.parseId( receptor );
            this.lockName(name);
            return this.setup( id, function ( inst, element ) {
                let value;
                Object.defineProperty(inst, name, {
                    get: function() {
                        return value;
                    },
                    set: function(newval) {
                        element.text(value = newval);
                    },
                    enumerable: true
                });
            } );
        };

        /**
        *    Create a writable property.
        *    On update, the innerHTML of affected element will be set.
        *    No checks are made whatsoever.
        *    @mutator rawOutput
        *        @function rawOutput
        *        @memberOf jRna
        *        @instance
        *        @returns {jRna} <tt>this</tt> (chainable)
        *    @end mutator
        *    @receptor
        *        @param {string|Array} receptor
        *        A jrna-prefixed class in the DOM
        *        and the name of the corresponding property in the jRna instance.
        *        Use a 2-element array if different names are needed.
        *    @end receptor
        */
        this.rawOutput = function( receptor ) {
            const [id, name] = jRna.parseId( receptor );
            this.lockName(name);
            return this.setup( id, function ( inst, element ) {
                let value;
                Object.defineProperty(inst, name, {
                    get: function() {
                        return value;
                    },
                    set: function(newval) {
                        element.html( value = newval );
                    },
                    enumerable: true
                });
            } );
        };

        /**
        *    Create a writable property
        *    whose value is equal to affected element's val()
        *    (see val() in jQuery).
        *
        *    @mutator input
        *        @function input
        *        @memberOf jRna
        *        @instance
        *        @returns {jRna} <tt>this</tt> (chainable)
        *    @end mutator
        *    @receptor
        *        @param {string|Array} receptor
        *        A jrna-prefixed class in the DOM
        *        and the name of the corresponding property in the jRna instance.
        *        Use a 2-element array if different names are needed.
        *    @end receptor
        */
        this.input = function( receptor ) {
            const [id, name] = jRna.parseId( receptor );
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
        /**
        *   Add a click handler.
        *
        *   @mutator click
        *       @function click
        *       @memberOf jRna
        *       @instance
        *       @returns {jRna} <tt>this</tt> (chainable)
        *   @end mutator
        *
        *   @param {string} id - the jrna-prefixed class of the element to work on
        *
        *   @currycb callback clickEvent "when the element is clicked"
        *       @param {function|string|Array} callback
        *       Run <tt>callback(clickEvent)</tt> when the element is clicked.
        *       <tt>this</tt> is set to current <i>jRna instance</i>.
        *       A method name may be used instead of function.
        *       An Array may be used containing any of the above
        *       plus some additional values to be prepended to the argument list.
        *   @end currycb
        */
        this.click = function( id, cb ) {
            return this.setup( id, function( inst, element ) {
                const bound = curry( inst, cb );
                element.on( 'click', function (ev) { bound(ev); return false; } );
            } );
        };
        /**
        *   Alternate between two callbacks when element is clicked.
        *
        *   @mutator toggle
        *       @function toggle
        *       @memberOf jRna
        *       @instance
        *       @returns {jRna} <tt>this</tt> (chainable)
        *   @end mutator
        *   @id
        *       @param {string} receptor
        *       A jrna-prefixed class in the DOM
        *   @end id
        *   @currycb callbackOn clickEvent "on 1st, 3rd, etc clicks"
        *       @param {function|string|Array} callbackOn
        *       Run <tt>callbackOn(clickEvent)</tt> on 1st, 3rd, etc clicks.
        *       <tt>this</tt> is set to current <i>jRna instance</i>.
        *       A method name may be used instead of function.
        *       An Array may be used containing any of the above
        *       plus some additional values to be prepended to the argument list.
        *   @end currycb
        *   @currycb callbackOff clickEvent "on every second click"
        *       @param {function|string|Array} callbackOff
        *       Run <tt>callbackOff(clickEvent)</tt> on every second click.
        *       <tt>this</tt> is set to current <i>jRna instance</i>.
        *       A method name may be used instead of function.
        *       An Array may be used containing any of the above
        *       plus some additional values to be prepended to the argument list.
        *   @end currycb
        */
        this.toggle = function( id, cb_on, cb_off ) {
            return this.setup( id, function( inst, element ) {
                const bound_on = curry( inst, cb_on );
                const bound_off = curry( inst, cb_off );
                let on = false;
                element.on('click', function (ev) {
                    if ((on ^= true) == true) {
                        bound_on(ev);
                    } else {
                        bound_off(ev);
                    }
                    return false;
                } );
            } );
        };

        /**
        *  Setup a sticky click handler. Once clicked, it will have no effect
        *  until a "lock" property is reset to a false value.
        *  @mutator stickyClick
        *      @function stickyClick
        *      @memberOf jRna
        *      @instance
        *      @returns {jRna} <tt>this</tt> (chainable)
        *  @end mutator
        *  @id
        *      @param {string} receptor
        *      A jrna-prefixed class in the DOM
        *  @end id
        *  @param {string} name
        *  Boolean property that locks the click
        *  @currycb  callback clickEvent " on click, provided that the lock property is false"
        *      @param {function|string|Array} callback
        *      Run <tt>callback(clickEvent)</tt>  on click, provided that the lock property is false.
        *      <tt>this</tt> is set to current <i>jRna instance</i>.
        *      A method name may be used instead of function.
        *      An Array may be used containing any of the above
        *      plus some additional values to be prepended to the argument list.
        *  @end currycb
        */
        this.stickyClick = function( id, name, cb ) {
            this.lockName( name, 'stickyClick' );
            return this.setup( id, function( inst, element ) {
                const bound = curry( inst, cb );
                element.on('click', function (ev) {
                    if (!inst[name]) {
                        inst[name] = true;
                        bound(ev);
                    }
                    return false;
                } );
            } );
        };
        /**
        *   Create an element shortcut in the jRna instance.
        *   Use <tt>this.element.&lt;className&gt;</tt> instead.
        *   @mutator element
        *       @function element
        *       @memberOf jRna
        *       @instance
        *       @returns {jRna} <tt>this</tt> (chainable)
        *   @end mutator
        *   @receptor
        *       @param {string|Array} receptor
        *       A jrna-prefixed class in the DOM
        *       and the name of the corresponding property in the jRna instance.
        *       Use a 2-element array if different names are needed.
        *   @end receptor
        */
        this.element = function ( receptor ) {
            const [id, name] = jRna.parseId( receptor );
            this.lockName(name);
            this.addArgument(name, { forbidden: 1 });
            return this.setup( id, function( inst, element ) {
                inst[name] = element;
            } );
        };
        /**
        *   @mutator on
        *       @function on
        *       @memberOf jRna
        *       @instance
        *       @returns {jRna} <tt>this</tt> (chainable)
        *   @end mutator
        *   @param {string} trigger
        *   Event to listen to. See jQuery docs for supported event types.
        *   @id
        *       @param {string} receptor
        *       A jrna-prefixed class in the DOM
        *   @end id
        *   @currycb callback event "whenever event is triggered on <tt>receptor</tt> element"
        *       @param {function|string|Array} callback
        *       Run <tt>callback(event)</tt> whenever event is triggered on <tt>receptor</tt> element.
        *       <tt>this</tt> is set to current <i>jRna instance</i>.
        *       A method name may be used instead of function.
        *       An Array may be used containing any of the above
        *       plus some additional values to be prepended to the argument list.
        *   @end currycb
        */
        this.on = function( trigger, id, cb ) {
            return this.setup(id, function(inst, element) {
                const bound = curry( inst, cb );
                element.on(trigger, bound);
            });
        };
        /**
        *   Associate a <tt>&lg;input type="file"&gt;</tt>
        *   with a file upload function that returns a promise.
        *
        *   Please consider using static <tt>jRna.upload</tt> instead.
        *   @mutator upload
        *       @function upload
        *       @memberOf jRna
        *       @instance
        *       @returns {jRna} <tt>this</tt> (chainable)
        *   @end mutator
        *   @receptor
        *       @param {string|Array} receptor
        *       A jrna-prefixed class in the DOM
        *       and the name of the corresponding property in the jRna instance.
        *       Use a 2-element array if different names are needed.
        *   @end receptor
        *   @param {string} [type] Can be 'text' (default), 'raw', or 'url'.
        *
        */
        this.upload = function( receptor, type ) {
            const [id, name] = jRna.parseId( receptor );
            this.lockName(name);
            this.addArgument(name, { forbidden: 1 });
            return this.setup( id, function( inst, element ) {
                // TODO This requires a special element - check whether it can into files
                inst[name] = function(cb) {
                    let prom = jRna.uploadFile( element[0].files[0], type );
                    if (cb)
                        prom = prom.then(cb.bind(inst));
                    return prom;
                };
            } );
        };

        /**
        *  Define a property or fucntion. Any array or object will be shared
        *  across all instances. See also <tt>init</tt>.
        *
        *  @mutator def
        *      @function def
        *      @memberOf jRna
        *      @instance
        *      @returns {jRna} <tt>this</tt> (chainable)
        *  @end mutator
        *  @param {string} name Name of the property
        *  @param {...} initial Set <tt>name</tt> property to this value
        */
        this._init = {};
        this.def = function( name, initial ) {
            this.lockName(name);
            if (typeof initial === 'function')
                isMethod[name] = true;
            this._init[name] = function() { return initial; };
            return this;
        };
        this.init = function( name, action ) {
            this.lockName(name);
            this._init[name] = action;
            return this;
        };
        // TODO initArray & initObject only use shallow copy, so beware
        this.initArray = function( name, start = [] ) {
            return this.init( name, () => [ ...start ] );
        };
        this.initObject = function( name, start = {} ) {
            return this.init( name, () => { return { ...start } } );
        };

        // A stupid state machine that allows to only enter every state once
        this.stickyState = function( name, action_hash, initial ) {
            const runner = jRna.stickySM( action_hash, { origin: name + ' at '+origin, initial } );

            isMethod[name] = true;
            // must use init to avoid sharing state between instances
            return this.init( name, () => runner.run() );
        };

        // callbacks!
        this._onAttach = [];
        this.onAttach = function(fun) {
            this._onAttach.push(fun);
            return this;
        };

        const callbacks  = {
            onRemove   : [],
        };
        for(let i in callbacks) {
            this[i] = function(cb) {
                callbacks[i].push(cb);
                return this;
            };
        }

        this.checkElement = function(element, action="address") {
            // TODO extract the selector from $, too
            if (element === undefined)
                blame( "Cannot "+action+" a null element");

            let selector = '';
            if (typeof element === 'string') {
                selector = ' $('+element+')';
                element = window.$( element );
            }
            if (!(element instanceof window.$))
                blame( "Cannot "+action+" a non-$ object" );
            if (!element.length)
                blame( "Cannot "+action+" a missing element"+selector );
            if ( element.length > 1)
                blame( "Cannot "+action+" an ambiguous element"+selector );
            return element.first();
        };

        function walkTree( root, cb ) {
            cb(root);
            for( let ptr = root.firstChild; ptr !== null; ptr = ptr.nextSibling)
                if (ptr.nodeType === 1) // only Element's are invited
                    walkTree(ptr, cb);
        }

        function findClasses( root, wanted ) {
            const found = {};

            walkTree( root, elem => {
                for ( let cls of elem.classList ) {
                    if( wanted[cls] === undefined ) continue;
                    if( found[cls] )
                        throw new Error('Duplicate element with class '+cls);
                    found[cls] = elem;
                }
            });

            for( let cls in wanted )
                if (!found[cls])
                    blame('Failed to locate class '+cls);

            return found;
        }

        /**
        *
        *  @function attach
        *  @memberOf jRna
        *  @instance
        *  @returns {jRna.Bound} A new jRna instance bound to a DOM subtree
        *  @param {jQuery} container - the root of DOM subtree to attach to.
        *  It MUST contain exactly one element.
        *  It MUST contain exactly one instance of each {@link jRna.receptor}
        *  @param {Object} [args] - optional argument values specified
        *  via {@link jRna#args}
        */
        this.attach = function(container, args={}) {
            // validate container first, check args after instance is populated
            container = this.checkElement(container, "attach to");

            // rename this to meta to avoid confusion with instance's `this`
            const meta = this;

            const inst = new jRna.Bound();
            inst.container   = container;

            for (let i in callbacks) {
                // inst._foobar actual callback list, inst.foobar appender
                inst['_'+i] = [].concat(callbacks[i]);
                inst[i] = function(cb) {
                    inst['_'+i].push(cb);
                    return inst;
                };
            }

            // All jrna-classed "receptor" elements
            inst.element    = {};

            // TODO better name
            inst.appendTo = function( element ) {
                element = meta.checkElement(element, "append to");
                element.append( inst.container );
                return inst;
            };

            // TODO split into destroy() and detach()
            // TODO should we hook into container's onRemove?
            inst.remove = function() {
                for (let cb of inst._onRemove ) {
                    cb.bind(inst)();
                }
                inst.container.remove();
            };

            // resolve all needed elements at once
            const resolved = findClasses( container[0], this._wanted );
            inst.element  = {};
            for (let cls in resolved)
                inst.element[ this._wanted[cls] ] = window.$( resolved[cls] );

            for (let action of meta._setup) {
                action[1](inst, inst.element[ action[0] ]);
            }

            // process arguments & initial values
            for( let i in meta._init ) {
                // skip initializer for given arguments - but not for methods
                if (!isMethod[i] && i in args)
                    continue;
                inst[i] = meta._init[i].apply(inst, [args]);
            }
            for( let key in args ) {
                // TODO throw all of extra args, not just the first
                if (!allowArgs[key] )
                    blame( "unknown argument "+key);
                if (!assignArgs[key])
                    continue;
                if (isMethod[key]) {
                    inst[key]( args[key] );
                } else {
                    inst[key] = args[key];
                }
            }

            // execute callbacks
            // TODO rewrite this
            for (let i in meta._onAttach ) {
                curry(inst, meta._onAttach[i])(args);
            }
            return inst;
        }; // end of this.attach

        this.appendTo = function( element, args ) {
            return this.instantiate(args).appendTo(element);
        };

        this.instantiate = function( args ) {
            // TODO this dies if >1 nodes, so move the check into html()
            if (!this._master)
                blame('Trying to instantiate with an empty html()');
            const container = window.$( this._master.cloneNode(true) );
            return this.attach( container, args );
        };
    }

    // empty constructor for instanceof'ing
    // TODO how to do it better?
    /**
    *   @constructor
    *   @this {jRna.Bound}
    *
    *   Do not call this directly. Use {@link jRna#attach} instead.
    */
    jRna.Bound = function () {};

    // prefix all CSS classes to avoid namespace pollution
    jRna.prefix = 'jrna-';

    jRna.documentTitle = function(...args) {
        const me = {};
        Object.defineProperty( me, 'update', {
            value: function() {
                window.document.title = args.join('');
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
    };

    jRna.upload = function(options={}) {
        const inputFile = window.document.createElement('input');
        inputFile.setAttribute('type',   'file');
        inputFile.setAttribute('style',  'display: none');
        return new Promise( done => {
            inputFile.oninput = function() {
                jRna.uploadFile( this.files[0], options.type ).then( result => {
                    inputFile.remove();
                    done( result );
                });
            };
            window.document.body.appendChild(inputFile); // required for firefox
            inputFile.click();
        });
    };

    jRna.uploadFile = function ( file, type ) {
        const types = {
            text : 'readAsText',
            raw  : 'readAsBinaryString',
            url  : 'readAsDataUrl'
        };
        const how = types[ type || 'text' ];
        if (!how)
            throw new Error("uploadFile(): type must be 'text'(default), 'raw', or 'url'");
        const reader = new window.FileReader();
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

    jRna.download = function(filename, content, ctype) {
        if (!ctype)
            ctype = 'application/octet-stream';
        // TODO also add charset=utf-8 unless binary

        // Shamelessly stolen from https://stackoverflow.com/a/30800715/280449
        const dataStr = 'data:'+ctype+','+encodeURIComponent( content );
        const aHref = window.document.createElement('a');
        aHref.setAttribute("href",     dataStr);
        aHref.setAttribute("download", filename);
        window.document.body.appendChild(aHref); // required for firefox
        aHref.click();
        aHref.remove();
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

    // const switcheroo = jRna.stickySM( { state: onSwitch, ... }, ... ).run()
    // switcheroo(same_state); // does nothing
    // switcheroo(other_state); // executes respective onSwitch
    // switcheroo(); // returns current state
    jRna.stickySM = function( action_hash, args ) {
        // TODO validate args
        const origin = args.origin || '- jRna.stickySM@'+callerInfo(1);

        if (args.initial !== undefined && !action_hash[args.initial])
            throw new Error("Illegal initial state: "+args.initial+' '+origin);

        return {
            run: function() {
                // TODO this.run(initial_state)
                let state = args.initial;

                return function(arg) {
                    // 0-arg => getter
                    if (typeof arg === 'undefined')
                        return state;

                    // console.trace('switch '+state+'->'+arg);

                    if (arg !== state) {
                        const todo = action_hash[arg];
                        if (!todo)
                            throw new Error('Illegal state switch '+state+'->'+arg +' '+origin);
                        todo.apply(this, [state, arg]); // (old, new)
                        state = arg;
                    }
                    return this;
                };
            }
        };
    };

    // usage:
    // const [ elementName, propertyName ] = jRna.parseId ( string | [ string, string ] )
    jRna.parseId = function(receptor, options={}) {
        let out;
        if (Array.isArray(receptor)) {
            if (receptor.length > 2)
                throw new Error( 'jRna receptor must be a string or 2-element array');
            out = [].concat(receptor);
        } else {
            out = [ receptor ]
        }
        if (typeof out[0] !== 'string' && typeof out[0] !== 'number')
            throw new Error( 'jRna receptor must be a string or 2-element array');
        if (out[1] === undefined && !options.skipMissing)
            out[1] = out[0];
        return out;
    };
    return jRna;
})();

if (typeof window !== 'undefined')
    window.jRna = jRna;
if (typeof module !== 'undefined')
    module.exports = jRna;

},{"./dep/caller-info.js":1}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9kZXAvY2FsbGVyLWluZm8uanMiLCJsaWIvanJuYS5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCJcblxuLyogRGV0ZXJtaW5lIG4tdGggY2FsbGVyIHVwIHRoZSBzdGFjayAqL1xuLyogSW5zcGlyZWQgYnkgUGVybCdzIENhcnAgbW9kdWxlICovXG5mdW5jdGlvbiBjYWxsZXJJbmZvKG4pIHtcbiAgICAvKiBhIHRlcnJpYmxlIHJleCB0aGF0IGJhc2ljYWxseSBzZWFyY2hlcyBmb3IgZmlsZS5qczpubm46bm5uIHNldmVyYWwgdGltZXMqL1xuICAgIGNvbnN0IGluU3RhY2sgPSAvKFteOlxcc10rOlxcZCsoPzo6XFxkKyk/KVxcVyooXFxufCQpL2c7XG4gICAgcmV0dXJuIChuZXcgRXJyb3IoKS5zdGFjay5tYXRjaChpblN0YWNrKVtuKzFdIHx8ICcnKVxuICAgICAgICAucmVwbGFjZSgvW14vXFx3XSovLCAnJykucmVwbGFjZSgvXFxEKiQvLCcnKTtcbn1cblxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIG1vZHVsZSAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgIT09ICd1bmRlZmluZWQnICkge1xuICAgIG1vZHVsZS5leHBvcnRzID0gY2FsbGVySW5mbztcbn1cblxuIiwiLypcbiAqICBqcm5hLmpzIC0gaW50ZXJhY3RpdmUgc3RhdGVmdWwgVUkgd2lkZ2V0c1xuICovXG5cbmNvbnN0IGpSbmEgPSAoZnVuY3Rpb24oKXtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIC8qXG4gICAgRmlyc3Qgb2YgYWxsLCBzb21lIG1hY3JvcyBmb3IganNkb2MgYmVjYXVzZSBpdCdzIHRvbyBib3JpbmcgdG8gd3JpdGUgaXQgZXZlcnkgdGltZVxuXG4gICAgQG1hY3JvIG9uZW9mXG4gICAgICAgIG9uZSBvZiB7QGxpbmsgalJuYSNhdHRhY2ggYXR0YWNofSwge0BsaW5rIGpSbmEjYXBwZW5kVG8gYXBwZW5kVG99LFxuICAgICAgICBvciB7QGxpbmsgalJuYSNpbnN0YW50aWF0ZSBpbnN0YW50aWF0ZX1cbiAgICBAZW5kIG9uZW9mXG5cbiAgICBAbWFjcm8gbXV0YXRvciBuYW1lXG4gICAgICAgIEBmdW5jdGlvbiAlKG5hbWUpXG4gICAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgIEBpbnN0YW5jZVxuICAgICAgICBAcmV0dXJucyB7alJuYX0gPHR0PnRoaXM8L3R0PiAoY2hhaW5hYmxlKVxuICAgIEBlbmQgbXV0YXRvclxuXG4gICAgQG1hY3JvIGlkXG4gICAgICAgIEBwYXJhbSB7c3RyaW5nfSByZWNlcHRvclxuICAgICAgICBBIGpybmEtcHJlZml4ZWQgY2xhc3MgaW4gdGhlIERPTVxuICAgIEBlbmQgaWRcblxuICAgIEBtYWNybyByZWNlcHRvclxuICAgICAgICBAcGFyYW0ge3N0cmluZ3xBcnJheX0gcmVjZXB0b3JcbiAgICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgYW5kIHRoZSBuYW1lIG9mIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnR5IGluIHRoZSBqUm5hIGluc3RhbmNlLlxuICAgICAgICBVc2UgYSAyLWVsZW1lbnQgYXJyYXkgaWYgZGlmZmVyZW50IG5hbWVzIGFyZSBuZWVkZWQuXG4gICAgQGVuZCByZWNlcHRvclxuXG4gICAgQG1hY3JvIGN1cnJ5Y2IgbmFtZSBhcmdzIHdoZW5cbiAgICAgICAgQHBhcmFtIHtmdW5jdGlvbnxzdHJpbmd8QXJyYXl9ICUobmFtZSlcbiAgICAgICAgUnVuIDx0dD4lKG5hbWUpKCUoYXJncykpPC90dD4gJSh3aGVuKS5cbiAgICAgICAgPHR0PnRoaXM8L3R0PiBpcyBzZXQgdG8gY3VycmVudCA8aT5qUm5hIGluc3RhbmNlPC9pPi5cbiAgICAgICAgQSBtZXRob2QgbmFtZSBtYXkgYmUgdXNlZCBpbnN0ZWFkIG9mIGZ1bmN0aW9uLlxuICAgICAgICBBbiBBcnJheSBtYXkgYmUgdXNlZCBjb250YWluaW5nIGFueSBvZiB0aGUgYWJvdmVcbiAgICAgICAgcGx1cyBzb21lIGFkZGl0aW9uYWwgdmFsdWVzIHRvIGJlIHByZXBlbmRlZCB0byB0aGUgYXJndW1lbnQgbGlzdC5cbiAgICBAZW5kIGN1cnJ5Y2JcblxuICAgICovXG5cbiAgICAvLyBmaXJzdCBjaGVjayBmb3IgJFxuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJlxuICAgICAgICAodHlwZW9mIHdpbmRvdy4kICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiB3aW5kb3cuZG9jdW1lbnQgPT09ICd1bmRlZmluZWQnKSlcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignalJuYTogcmVmdXNpbmcgdG8gcnVuIHdpdGhvdXQgYSB3aW5kb3cuJCBhbmQgd2luZG93LmRvY3VtZW50Jyk7XG5cbiAgICBjb25zdCBjYWxsZXJJbmZvID0gcmVxdWlyZSgnLi9kZXAvY2FsbGVyLWluZm8uanMnKTtcbi8vICAgIGNvbnN0IEFycm93U00gICAgPSByZXF1aXJlKCcuL2RlcC9hcnJvdy1zbS5qcycpO1xuXG4gICAgLyoqXG4gICAgKiAgIGpSbmEgaXMgYW4gYXBwbGljYXRpb24gYnVpbGRpbmcgYmxvY2sgdGhhdCBtYXBzIGl0cyBpbnRlcm5hbCBzdGF0ZVxuICAgICogICBvbnRvIGEgRE9NIHN1YnRyZWUuXG4gICAgKlxuICAgICogICBUbyBhY3R1YWxseSBiZWNvbWUgZWZmZWN0ZnVsLCBpdCBtdXN0IGJlIGluc3RhbmNpYXRlZCB3aXRoXG4gICAgKiAgIEBvbmVvZlxuICAgICogICAgICAgb25lIG9mIHtAbGluayBqUm5hI2F0dGFjaCBhdHRhY2h9LCB7QGxpbmsgalJuYSNhcHBlbmRUbyBhcHBlbmRUb30sXG4gICAgKiAgICAgICBvciB7QGxpbmsgalJuYSNpbnN0YW50aWF0ZSBpbnN0YW50aWF0ZX1cbiAgICAqICAgQGVuZCBvbmVvZlxuICAgICogICBtZXRob2RzLlxuICAgICpcbiAgICAqICAgQGNvbnN0cnVjdG9yXG4gICAgKiAgIEB0aGlzIHtqUm5hfVxuICAgICovXG4gICAgZnVuY3Rpb24galJuYSAoKSB7XG4gICAgICAgIC8vIGBvcmlnaW5gIGlzIHRoZSBwbGFjZSB3aGVyZSBgbmV3IGpSbmEoKWAgd2FzIGNhbGxlZCBmb3IgZ2l2ZW4gaW5zdGFuY2UuXG4gICAgICAgIC8vIGBibGFtZWAgdGhyb3dzIGVycm9yIGJ1dCBhbHNvIHBvaW50cyBvdXQgd2hlcmUgdGhlIGRlZmluaXRpb24gd2FzLlxuICAgICAgICAvLyBUaGlzIGlkZWEgd2FzIG1vc3RseSBzdG9sZW4gZnJvbSBQZXJsJ3MgQ2FycCBtb2R1bGUuXG4gICAgICAgIGNvbnN0IG9yaWdpbiA9IHRoaXMub3JpZ2luID0gY2FsbGVySW5mbygxKTtcbiAgICAgICAgY29uc3QgYmxhbWUgID0gZnVuY3Rpb24oZXJyb3IpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggZXJyb3IgKyBcIiAtIGpSbmFAXCIrb3JpZ2luICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXNlIGJyb3dzZXIgdG8gcGFyc2UgSFRNTC5cbiAgICAgICAgY29uc3QgcGFyc2VIVE1MID0gZnVuY3Rpb24oc3RyKSB7XG4gICAgICAgICAgICBjb25zdCBmYWtlSFRNTCA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgICAgICAgIGZha2VIVE1MLnNldEF0dHJpYnV0ZSggJ3N0eWxlJywgJ2Rpc3BsYXk6IG5vbmUnICk7XG4gICAgICAgICAgICBmYWtlSFRNTC5pbm5lckhUTUwgPSBzdHI7XG4gICAgICAgICAgICBpZiAoIWZha2VIVE1MLmZpcnN0Q2hpbGQpXG4gICAgICAgICAgICAgICAgYmxhbWUoXCJBdHRlbXB0IHRvIHVzZSBlbXB0eSBIVE1MXCIpO1xuICAgICAgICAgICAgaWYgKGZha2VIVE1MLmZpcnN0Q2hpbGQubm9kZVR5cGUgIT09IDEpIHtcbiAgICAgICAgICAgICAgICBibGFtZShcIkF0dGVtcHQgdG8gdXNlIG5vbi1lbGVtZW50IGFzIEhUTUwgY29udGFpbmVyXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGZha2VIVE1MLmZpcnN0Q2hpbGQgIT09IGZha2VIVE1MLmxhc3RDaGlsZCkge1xuICAgICAgICAgICAgICAgIGJsYW1lKFwiQXR0ZW1wdCB0byBjcmVhdGUgbXVsdGlwbGUgdGFnIEhUTUxcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZmFrZUhUTUwuZmlyc3RDaGlsZDtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBsb2NrTmFtZSgnZm9vJykgLSBwcmV2ZW50IHVzaW5nIHRoZSBuYW1lIGFnYWluXG4gICAgICAgIC8vIFRoaXMgaXMgaW50ZXJuYWwgZnVuY3Rpb25cbiAgICAgICAgdGhpcy5fa25vd24gPSB7fTtcbiAgICAgICAgZm9yIChsZXQgaSBvZiBbICdhcHBlbmRUbycsICdjb250YWluZXInLCAnZWxlbWVudCcsICdpZCcsICdvbkF0dGFjaCcsICdvblJlbW92ZScsICdyZW1vdmUnIF0pXG4gICAgICAgICAgICB0aGlzLl9rbm93bltpXSA9IHRydWU7XG4gICAgICAgIHRoaXMubG9ja05hbWUgPSBmdW5jdGlvbiAobmFtZSwgc2hhcmVkKSB7XG4gICAgICAgICAgICBpZiAodGhpcy5fa25vd25bbmFtZV0gJiYgdGhpcy5fa25vd25bbmFtZV0gIT09IHNoYXJlZCkge1xuICAgICAgICAgICAgICAgIGJsYW1lKCBcIlByb3BlcnR5IG5hbWUgYWxyZWFkeSBpbiB1c2U6IFwiK25hbWUgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuX2tub3duW25hbWVdID0gc2hhcmVkIHx8IHRydWU7XG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGlzTWV0aG9kID0ge307XG5cbiAgICAgICAgLyoqXG4gICAgICAgICogIFNldCBpbi1tZW1vcnkgSFRNTCBzbmlwcGV0IHRvIGF0dGFjaCB0by5cbiAgICAgICAgKlxuICAgICAgICAqICBAbXV0YXRvciBodG1sXG4gICAgICAgICogICAgICBAZnVuY3Rpb24gaHRtbFxuICAgICAgICAqICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogIEBwYXJhbSB7c3RyaW5nfSBodG1sIC0gbXVzdCBjb250YWluIGV4YWN0bHkgb25lIHJvb3Qgbm9kZVxuICAgICAgICAqL1xuICAgICAgICB0aGlzLmh0bWwgPSBmdW5jdGlvbiggaHRtbCApIHtcbiAgICAgICAgICAgIGlmIChodG1sICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbGVtZW50ID0gcGFyc2VIVE1MKCBodG1sICk7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWFzdGVyID0gZWxlbWVudDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdGhpcy5fbWFzdGVyID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICogIEZldGNoIEhUTUwgc25pcHBldCBmcm9tIHRoZSBkb2N1bWVudCBpdHNlbGYuXG4gICAgICAgICogIFR5cGljYWxseSBzdWNoIHNuaXBwZXRzIHNob3VsZCByZXNpZGUgd2l0aGluIGEgaGlkZGVuIGJsb2NrLlxuICAgICAgICAqXG4gICAgICAgICogIEBtdXRhdG9yIGh0bWxGcm9tXG4gICAgICAgICogICAgICBAZnVuY3Rpb24gaHRtbEZyb21cbiAgICAgICAgKiAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogIEBlbmQgbXV0YXRvclxuICAgICAgICAqICBAcGFyYW0ge3N0cmluZ3xqUXVlcnl9IHNlbGVjdG9yIC0gd2hlcmUgdG8gc2VhcmNoIGZvciB0aGUgcm9vdCBlbGVtZW50XG4gICAgICAgICovXG4gICAgICAgIHRoaXMuaHRtbEZyb20gPSBmdW5jdGlvbihzZWxlY3Rvcikge1xuICAgICAgICAgICAgc2VsZWN0b3IgPSB0aGlzLmNoZWNrRWxlbWVudChzZWxlY3RvciwgXCJnZXQgSFRNTCBmcm9tXCIpO1xuICAgICAgICAgICAgdGhpcy5odG1sKCBzZWxlY3RvclswXS5vdXRlckhUTUwgKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IG5vQXJncyA9IHt9XG4gICAgICAgIGZvciAobGV0IGkgaW4gdGhpcy5fa25vd24pXG4gICAgICAgICAgICBub0FyZ3NbaV0gPSB0cnVlO1xuICAgICAgICBjb25zdCBhbGxvd0FyZ3MgPSB7IGlkIDogdHJ1ZSB9O1xuICAgICAgICBjb25zdCBhc3NpZ25BcmdzID0geyBpZCA6IHRydWUgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiAgQWRkIG9uZSBhbGxvd2VkIGFyZ3VtZW50IHdpdGggZmluZS1ncmFpbmVkIGNvbnRyb2wgZm9yXG4gICAgICAgICogIEBvbmVvZlxuICAgICAgICAqICAgICAgb25lIG9mIHtAbGluayBqUm5hI2F0dGFjaCBhdHRhY2h9LCB7QGxpbmsgalJuYSNhcHBlbmRUbyBhcHBlbmRUb30sXG4gICAgICAgICogICAgICBvciB7QGxpbmsgalJuYSNpbnN0YW50aWF0ZSBpbnN0YW50aWF0ZX1cbiAgICAgICAgKiAgQGVuZCBvbmVvZlxuICAgICAgICAqXG4gICAgICAgICogIEBtdXRhdG9yIGFkZEFyZ3VtZW50XG4gICAgICAgICogICAgICBAZnVuY3Rpb24gYWRkQXJndW1lbnRcbiAgICAgICAgKiAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogIEBlbmQgbXV0YXRvclxuICAgICAgICAqICBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBhcmd1bWVudFxuICAgICAgICAqICBAcGFyYW0ge09iamVjdH0gc3BlY1xuICAgICAgICAqICB7IGFzc2lnbjogdHJ1ZSB8IGZhbHNlIH0gLSB3aGV0aGVyIHRvIHRyeSBhc3NpZ25pbmcgdGhpcyBhcmd1bWVudFxuICAgICAgICAqICB0byBlcG9ueW1vdXMgcHJvcGVydHlcbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hZGRBcmd1bWVudCA9IGZ1bmN0aW9uKCBuYW1lLCBzcGVjPXt9ICkge1xuICAgICAgICAgICAgaWYgKHNwZWMuZm9yYmlkZGVuKSB7XG4gICAgICAgICAgICAgICAgLy8gc3BlY2lhbCBjYXNlXG4gICAgICAgICAgICAgICAgaWYgKGFsbG93QXJnc1tuYW1lXSlcbiAgICAgICAgICAgICAgICAgICAgYmxhbWUoICdGb3JiaWRkZW4gYXJndW1lbnQgbmFtZTogJytuYW1lICk7XG4gICAgICAgICAgICAgICAgbm9BcmdzW25hbWVdID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKG5vQXJnc1tuYW1lXSlcbiAgICAgICAgICAgICAgICBibGFtZSggJ0ZvcmJpZGRlbiBhcmd1bWVudCBuYW1lOiAnK25hbWUgKTtcbiAgICAgICAgICAgIGFsbG93QXJncyBbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgYXNzaWduQXJnc1tuYW1lXSA9IHNwZWMuYXNzaWduO1xuICAgICAgICAgICAgLy8gVE9ETyBtb3JlIGZhbmN5IHN0dWZmXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiAgU3BlY2lmeSBvbmUgb3IgbW9yZSBvcHRpb25hbCBhcmd1bWVudCBrZXlzIGZvclxuICAgICAgICAqICBAb25lb2ZcbiAgICAgICAgKiAgICAgIG9uZSBvZiB7QGxpbmsgalJuYSNhdHRhY2ggYXR0YWNofSwge0BsaW5rIGpSbmEjYXBwZW5kVG8gYXBwZW5kVG99LFxuICAgICAgICAqICAgICAgb3Ige0BsaW5rIGpSbmEjaW5zdGFudGlhdGUgaW5zdGFudGlhdGV9XG4gICAgICAgICogIEBlbmQgb25lb2ZcbiAgICAgICAgKiAgbWV0aG9kcy5cbiAgICAgICAgKiAgTWF5IGJlIGNhbGxlZCBtb3JlIHRoYW4gb25jZS5cbiAgICAgICAgKiAgQnkgZGVmYXVsdCwgb25seSAnaWQnIGFyZ3VtZW50IGlzIGFsbG93ZWQuXG4gICAgICAgICpcbiAgICAgICAgKiAgQG11dGF0b3IgYXJnc1xuICAgICAgICAqICAgICAgQGZ1bmN0aW9uIGFyZ3NcbiAgICAgICAgKiAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogIEBlbmQgbXV0YXRvclxuICAgICAgICAqICBAcGFyYW0gey4uLnN0cmluZ30gYXJndW1lbnROYW1lIC0gbGlzdCBvZiBhbGxvd2VkIGFyZ3VtZW50c1xuICAgICAgICAqL1xuICAgICAgICB0aGlzLmFyZ3MgPSBmdW5jdGlvbiguLi5saXN0KSB7XG4gICAgICAgICAgICAvLyBUT0RPIHRoaW5rIGFib3V0IHJlcXVpcmVkIGFyZ3MgJiB0eXBlIGNoZWNrc1xuICAgICAgICAgICAgZm9yKCBsZXQgaSBvZiBsaXN0IClcbiAgICAgICAgICAgICAgICB0aGlzLmFkZEFyZ3VtZW50KCBpLCB7IGFzc2lnbjogdHJ1ZSB9ICk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiAgVXBvbiA8aT5iaW5kaW5nPC9pPiwgbG9jYXRlIGVsZW1lbnQgd2l0aCByZWNlcHRvciBjbGFzc1xuICAgICAgICAqICBhbmQgZXhlY3V0ZSBjYWxsYmFjayBvbiBpdCBhbmQgdGhlIG5ld2x5IGNyZWF0ZWQgaW5zdGFuY2UuXG4gICAgICAgICpcbiAgICAgICAgKiAgUGxlYXNlIHNlcmlvdXNseSBjb25zaWRlciBzZW5kaW5nIGEgYnVnIHJlcG9ydCBpZiB5b3UgZXZlciBuZWVkXG4gICAgICAgICogIHRvIGNhbGwgdGhpcyBkaXJlY3RseS5cbiAgICAgICAgKlxuICAgICAgICAqICBAbXV0YXRvciBzZXR1cFxuICAgICAgICAqICAgICAgQGZ1bmN0aW9uIHNldHVwXG4gICAgICAgICogICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICBAcmV0dXJucyB7alJuYX0gPHR0PnRoaXM8L3R0PiAoY2hhaW5hYmxlKVxuICAgICAgICAqICBAZW5kIG11dGF0b3JcbiAgICAgICAgKiAgQGlkXG4gICAgICAgICogICAgICBAcGFyYW0ge3N0cmluZ30gcmVjZXB0b3JcbiAgICAgICAgKiAgICAgIEEganJuYS1wcmVmaXhlZCBjbGFzcyBpbiB0aGUgRE9NXG4gICAgICAgICogIEBlbmQgaWRcbiAgICAgICAgKiAgQHBhcmFtIHtmdW5jdGlvbn0gYWN0aW9uXG4gICAgICAgICogIENhbGwgYWN0aW9uKCBpbnN0YW5jZSwgZWxlbWVudCApIHdoaWxlIHRoZSBib3VuZCBqUm5hIGluc3RhbmNlXG4gICAgICAgICogIGlzIGJlaW5nIGNyZWF0ZWQuIE5vdGUgPHR0PnRoaXM8L3R0PiBpcyA8aT5ub3Q8L2k+IHNldC5cbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5fc2V0dXAgPSBbXTtcbiAgICAgICAgdGhpcy5fd2FudGVkID0ge307XG4gICAgICAgIHRoaXMuc2V0dXAgPSBmdW5jdGlvbiggaWQsIGFjdGlvbiApIHtcbiAgICAgICAgICAgIHRoaXMuX3NldHVwLnB1c2goIFtpZCwgYWN0aW9uIF0gKTtcbiAgICAgICAgICAgIHRoaXMuX3dhbnRlZFsgalJuYS5wcmVmaXggKyBpZCBdID0gaWQ7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICAvLyB1bmlmeSBjYWxsYmFja3M6XG4gICAgICAgIC8vIGZ1bmN0aW9uID0+IGl0c2VsZlxuICAgICAgICAvLyBzdHJpbmcgICA9PiBpbnN0YW5jZSBtZXRob2RcbiAgICAgICAgLy8gWyBmdW5jdGlvbnxzdHJpbmcsIC4uLmFyZ3MgXSA9PiBmdWNudGlvbiggYXJncywgLi4uICkgLy8gY3VycnkhXG4gICAgICAgIC8vIG90aGVyd2lzZSB0aHJvd1xuICAgICAgICBjb25zdCBjdXJyeSA9IGZ1bmN0aW9uKGl0ZW0sIHNwZWMpIHtcbiAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShzcGVjKSlcbiAgICAgICAgICAgICAgICBzcGVjID0gWyBzcGVjIF07XG4gICAgICAgICAgICBjb25zdCBbdG9kbywgLi4ucHJlYXJnc10gPSBzcGVjO1xuXG4gICAgICAgICAgICAvLyBuYW1lZCBtZXRob2QgLSBUT0RPIHdyaXRlIG1vcmUgZWZmaWNpZW50IGNvZGVcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdG9kbyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbVt0b2RvXS5hcHBseSggaXRlbSwgcHJlYXJncy5jb25jYXQoYXJncykgKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBub3JtYWwgZnVuY3Rpb24gd2l0aCBwcmVhcmdzXG4gICAgICAgICAgICBpZiAocHJlYXJncy5sZW5ndGggJiYgdHlwZW9mIHRvZG8gPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdG9kby5hcHBseSggaXRlbSwgcHJlYXJncy5jb25jYXQoYXJncykgKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBub3JtYWwgZnVuY3Rpb25cbiAgICAgICAgICAgIC8vIFRPRE8gZGV0ZWN0IGFscmVhZHkgYm91bmQgZnVuY3Rpb25zICYgdGhyb3dcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdG9kbyA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgICAgICByZXR1cm4gdG9kby5iaW5kKGl0ZW0pO1xuXG4gICAgICAgICAgICAvLyBmaW5hbGx5IC0gZG9uJ3Qga25vdyB3aGF0IHVzZXIgd2FudHNcbiAgICAgICAgICAgIGJsYW1lKCAnVW5leHBlY3RlZCBjYWxsYmFjayBhcmd1bWVudCcgKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiAgICBDcmVhdGUgYSB3cml0YWJsZSBwcm9wZXJ0eS4gVXBkYXRlIHdpbGwgdHJpZ2dlciBzZXR0aW5nIHRoZSB0ZXh0XG4gICAgICAgICogICAgY29udGVudCBvZiB0aGUgYWZmZWN0ZWQgRE9NIGVsZW1lbnQuXG4gICAgICAgICogICAgQG11dGF0b3Igb3V0cHV0XG4gICAgICAgICogICAgICAgIEBmdW5jdGlvbiBvdXRwdXRcbiAgICAgICAgKiAgICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogICAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogICAgQHJlY2VwdG9yXG4gICAgICAgICogICAgICAgIEBwYXJhbSB7c3RyaW5nfEFycmF5fSByZWNlcHRvclxuICAgICAgICAqICAgICAgICBBIGpybmEtcHJlZml4ZWQgY2xhc3MgaW4gdGhlIERPTVxuICAgICAgICAqICAgICAgICBhbmQgdGhlIG5hbWUgb2YgdGhlIGNvcnJlc3BvbmRpbmcgcHJvcGVydHkgaW4gdGhlIGpSbmEgaW5zdGFuY2UuXG4gICAgICAgICogICAgICAgIFVzZSBhIDItZWxlbWVudCBhcnJheSBpZiBkaWZmZXJlbnQgbmFtZXMgYXJlIG5lZWRlZC5cbiAgICAgICAgKiAgICBAZW5kIHJlY2VwdG9yXG4gICAgICAgICovXG5cbiAgICAgICAgdGhpcy5vdXRwdXQgPSBmdW5jdGlvbiggcmVjZXB0b3IgKSB7XG4gICAgICAgICAgICBjb25zdCBbaWQsIG5hbWVdID0galJuYS5wYXJzZUlkKCByZWNlcHRvciApO1xuICAgICAgICAgICAgdGhpcy5sb2NrTmFtZShuYW1lKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldHVwKCBpZCwgZnVuY3Rpb24gKCBpbnN0LCBlbGVtZW50ICkge1xuICAgICAgICAgICAgICAgIGxldCB2YWx1ZTtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaW5zdCwgbmFtZSwge1xuICAgICAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBzZXQ6IGZ1bmN0aW9uKG5ld3ZhbCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZWxlbWVudC50ZXh0KHZhbHVlID0gbmV3dmFsKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqICAgIENyZWF0ZSBhIHdyaXRhYmxlIHByb3BlcnR5LlxuICAgICAgICAqICAgIE9uIHVwZGF0ZSwgdGhlIGlubmVySFRNTCBvZiBhZmZlY3RlZCBlbGVtZW50IHdpbGwgYmUgc2V0LlxuICAgICAgICAqICAgIE5vIGNoZWNrcyBhcmUgbWFkZSB3aGF0c29ldmVyLlxuICAgICAgICAqICAgIEBtdXRhdG9yIHJhd091dHB1dFxuICAgICAgICAqICAgICAgICBAZnVuY3Rpb24gcmF3T3V0cHV0XG4gICAgICAgICogICAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgICBAcmV0dXJucyB7alJuYX0gPHR0PnRoaXM8L3R0PiAoY2hhaW5hYmxlKVxuICAgICAgICAqICAgIEBlbmQgbXV0YXRvclxuICAgICAgICAqICAgIEByZWNlcHRvclxuICAgICAgICAqICAgICAgICBAcGFyYW0ge3N0cmluZ3xBcnJheX0gcmVjZXB0b3JcbiAgICAgICAgKiAgICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgKiAgICAgICAgYW5kIHRoZSBuYW1lIG9mIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnR5IGluIHRoZSBqUm5hIGluc3RhbmNlLlxuICAgICAgICAqICAgICAgICBVc2UgYSAyLWVsZW1lbnQgYXJyYXkgaWYgZGlmZmVyZW50IG5hbWVzIGFyZSBuZWVkZWQuXG4gICAgICAgICogICAgQGVuZCByZWNlcHRvclxuICAgICAgICAqL1xuICAgICAgICB0aGlzLnJhd091dHB1dCA9IGZ1bmN0aW9uKCByZWNlcHRvciApIHtcbiAgICAgICAgICAgIGNvbnN0IFtpZCwgbmFtZV0gPSBqUm5hLnBhcnNlSWQoIHJlY2VwdG9yICk7XG4gICAgICAgICAgICB0aGlzLmxvY2tOYW1lKG5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0dXAoIGlkLCBmdW5jdGlvbiAoIGluc3QsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpbnN0LCBuYW1lLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24obmV3dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50Lmh0bWwoIHZhbHVlID0gbmV3dmFsICk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiAgICBDcmVhdGUgYSB3cml0YWJsZSBwcm9wZXJ0eVxuICAgICAgICAqICAgIHdob3NlIHZhbHVlIGlzIGVxdWFsIHRvIGFmZmVjdGVkIGVsZW1lbnQncyB2YWwoKVxuICAgICAgICAqICAgIChzZWUgdmFsKCkgaW4galF1ZXJ5KS5cbiAgICAgICAgKlxuICAgICAgICAqICAgIEBtdXRhdG9yIGlucHV0XG4gICAgICAgICogICAgICAgIEBmdW5jdGlvbiBpbnB1dFxuICAgICAgICAqICAgICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICAgICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgICBAZW5kIG11dGF0b3JcbiAgICAgICAgKiAgICBAcmVjZXB0b3JcbiAgICAgICAgKiAgICAgICAgQHBhcmFtIHtzdHJpbmd8QXJyYXl9IHJlY2VwdG9yXG4gICAgICAgICogICAgICAgIEEganJuYS1wcmVmaXhlZCBjbGFzcyBpbiB0aGUgRE9NXG4gICAgICAgICogICAgICAgIGFuZCB0aGUgbmFtZSBvZiB0aGUgY29ycmVzcG9uZGluZyBwcm9wZXJ0eSBpbiB0aGUgalJuYSBpbnN0YW5jZS5cbiAgICAgICAgKiAgICAgICAgVXNlIGEgMi1lbGVtZW50IGFycmF5IGlmIGRpZmZlcmVudCBuYW1lcyBhcmUgbmVlZGVkLlxuICAgICAgICAqICAgIEBlbmQgcmVjZXB0b3JcbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5pbnB1dCA9IGZ1bmN0aW9uKCByZWNlcHRvciApIHtcbiAgICAgICAgICAgIGNvbnN0IFtpZCwgbmFtZV0gPSBqUm5hLnBhcnNlSWQoIHJlY2VwdG9yICk7XG4gICAgICAgICAgICB0aGlzLmxvY2tOYW1lKG5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0dXAoIGlkLCBmdW5jdGlvbiggaW5zdCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoaW5zdCwgbmFtZSwge1xuICAgICAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQudmFsKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24obmV3dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnZhbChuZXd2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9ICk7XG4gICAgICAgIH07XG4gICAgICAgIC8qKlxuICAgICAgICAqICAgQWRkIGEgY2xpY2sgaGFuZGxlci5cbiAgICAgICAgKlxuICAgICAgICAqICAgQG11dGF0b3IgY2xpY2tcbiAgICAgICAgKiAgICAgICBAZnVuY3Rpb24gY2xpY2tcbiAgICAgICAgKiAgICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogICBAZW5kIG11dGF0b3JcbiAgICAgICAgKlxuICAgICAgICAqICAgQHBhcmFtIHtzdHJpbmd9IGlkIC0gdGhlIGpybmEtcHJlZml4ZWQgY2xhc3Mgb2YgdGhlIGVsZW1lbnQgdG8gd29yayBvblxuICAgICAgICAqXG4gICAgICAgICogICBAY3VycnljYiBjYWxsYmFjayBjbGlja0V2ZW50IFwid2hlbiB0aGUgZWxlbWVudCBpcyBjbGlja2VkXCJcbiAgICAgICAgKiAgICAgICBAcGFyYW0ge2Z1bmN0aW9ufHN0cmluZ3xBcnJheX0gY2FsbGJhY2tcbiAgICAgICAgKiAgICAgICBSdW4gPHR0PmNhbGxiYWNrKGNsaWNrRXZlbnQpPC90dD4gd2hlbiB0aGUgZWxlbWVudCBpcyBjbGlja2VkLlxuICAgICAgICAqICAgICAgIDx0dD50aGlzPC90dD4gaXMgc2V0IHRvIGN1cnJlbnQgPGk+alJuYSBpbnN0YW5jZTwvaT4uXG4gICAgICAgICogICAgICAgQSBtZXRob2QgbmFtZSBtYXkgYmUgdXNlZCBpbnN0ZWFkIG9mIGZ1bmN0aW9uLlxuICAgICAgICAqICAgICAgIEFuIEFycmF5IG1heSBiZSB1c2VkIGNvbnRhaW5pbmcgYW55IG9mIHRoZSBhYm92ZVxuICAgICAgICAqICAgICAgIHBsdXMgc29tZSBhZGRpdGlvbmFsIHZhbHVlcyB0byBiZSBwcmVwZW5kZWQgdG8gdGhlIGFyZ3VtZW50IGxpc3QuXG4gICAgICAgICogICBAZW5kIGN1cnJ5Y2JcbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5jbGljayA9IGZ1bmN0aW9uKCBpZCwgY2IgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXR1cCggaWQsIGZ1bmN0aW9uKCBpbnN0LCBlbGVtZW50ICkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJvdW5kID0gY3VycnkoIGluc3QsIGNiICk7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbiggJ2NsaWNrJywgZnVuY3Rpb24gKGV2KSB7IGJvdW5kKGV2KTsgcmV0dXJuIGZhbHNlOyB9ICk7XG4gICAgICAgICAgICB9ICk7XG4gICAgICAgIH07XG4gICAgICAgIC8qKlxuICAgICAgICAqICAgQWx0ZXJuYXRlIGJldHdlZW4gdHdvIGNhbGxiYWNrcyB3aGVuIGVsZW1lbnQgaXMgY2xpY2tlZC5cbiAgICAgICAgKlxuICAgICAgICAqICAgQG11dGF0b3IgdG9nZ2xlXG4gICAgICAgICogICAgICAgQGZ1bmN0aW9uIHRvZ2dsZVxuICAgICAgICAqICAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgIEBlbmQgbXV0YXRvclxuICAgICAgICAqICAgQGlkXG4gICAgICAgICogICAgICAgQHBhcmFtIHtzdHJpbmd9IHJlY2VwdG9yXG4gICAgICAgICogICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgKiAgIEBlbmQgaWRcbiAgICAgICAgKiAgIEBjdXJyeWNiIGNhbGxiYWNrT24gY2xpY2tFdmVudCBcIm9uIDFzdCwgM3JkLCBldGMgY2xpY2tzXCJcbiAgICAgICAgKiAgICAgICBAcGFyYW0ge2Z1bmN0aW9ufHN0cmluZ3xBcnJheX0gY2FsbGJhY2tPblxuICAgICAgICAqICAgICAgIFJ1biA8dHQ+Y2FsbGJhY2tPbihjbGlja0V2ZW50KTwvdHQ+IG9uIDFzdCwgM3JkLCBldGMgY2xpY2tzLlxuICAgICAgICAqICAgICAgIDx0dD50aGlzPC90dD4gaXMgc2V0IHRvIGN1cnJlbnQgPGk+alJuYSBpbnN0YW5jZTwvaT4uXG4gICAgICAgICogICAgICAgQSBtZXRob2QgbmFtZSBtYXkgYmUgdXNlZCBpbnN0ZWFkIG9mIGZ1bmN0aW9uLlxuICAgICAgICAqICAgICAgIEFuIEFycmF5IG1heSBiZSB1c2VkIGNvbnRhaW5pbmcgYW55IG9mIHRoZSBhYm92ZVxuICAgICAgICAqICAgICAgIHBsdXMgc29tZSBhZGRpdGlvbmFsIHZhbHVlcyB0byBiZSBwcmVwZW5kZWQgdG8gdGhlIGFyZ3VtZW50IGxpc3QuXG4gICAgICAgICogICBAZW5kIGN1cnJ5Y2JcbiAgICAgICAgKiAgIEBjdXJyeWNiIGNhbGxiYWNrT2ZmIGNsaWNrRXZlbnQgXCJvbiBldmVyeSBzZWNvbmQgY2xpY2tcIlxuICAgICAgICAqICAgICAgIEBwYXJhbSB7ZnVuY3Rpb258c3RyaW5nfEFycmF5fSBjYWxsYmFja09mZlxuICAgICAgICAqICAgICAgIFJ1biA8dHQ+Y2FsbGJhY2tPZmYoY2xpY2tFdmVudCk8L3R0PiBvbiBldmVyeSBzZWNvbmQgY2xpY2suXG4gICAgICAgICogICAgICAgPHR0PnRoaXM8L3R0PiBpcyBzZXQgdG8gY3VycmVudCA8aT5qUm5hIGluc3RhbmNlPC9pPi5cbiAgICAgICAgKiAgICAgICBBIG1ldGhvZCBuYW1lIG1heSBiZSB1c2VkIGluc3RlYWQgb2YgZnVuY3Rpb24uXG4gICAgICAgICogICAgICAgQW4gQXJyYXkgbWF5IGJlIHVzZWQgY29udGFpbmluZyBhbnkgb2YgdGhlIGFib3ZlXG4gICAgICAgICogICAgICAgcGx1cyBzb21lIGFkZGl0aW9uYWwgdmFsdWVzIHRvIGJlIHByZXBlbmRlZCB0byB0aGUgYXJndW1lbnQgbGlzdC5cbiAgICAgICAgKiAgIEBlbmQgY3VycnljYlxuICAgICAgICAqL1xuICAgICAgICB0aGlzLnRvZ2dsZSA9IGZ1bmN0aW9uKCBpZCwgY2Jfb24sIGNiX29mZiApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldHVwKCBpZCwgZnVuY3Rpb24oIGluc3QsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYm91bmRfb24gPSBjdXJyeSggaW5zdCwgY2Jfb24gKTtcbiAgICAgICAgICAgICAgICBjb25zdCBib3VuZF9vZmYgPSBjdXJyeSggaW5zdCwgY2Jfb2ZmICk7XG4gICAgICAgICAgICAgICAgbGV0IG9uID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5vbignY2xpY2snLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChvbiBePSB0cnVlKSA9PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3VuZF9vbihldik7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3VuZF9vZmYoZXYpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9ICk7XG4gICAgICAgICAgICB9ICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICogIFNldHVwIGEgc3RpY2t5IGNsaWNrIGhhbmRsZXIuIE9uY2UgY2xpY2tlZCwgaXQgd2lsbCBoYXZlIG5vIGVmZmVjdFxuICAgICAgICAqICB1bnRpbCBhIFwibG9ja1wiIHByb3BlcnR5IGlzIHJlc2V0IHRvIGEgZmFsc2UgdmFsdWUuXG4gICAgICAgICogIEBtdXRhdG9yIHN0aWNreUNsaWNrXG4gICAgICAgICogICAgICBAZnVuY3Rpb24gc3RpY2t5Q2xpY2tcbiAgICAgICAgKiAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogIEBlbmQgbXV0YXRvclxuICAgICAgICAqICBAaWRcbiAgICAgICAgKiAgICAgIEBwYXJhbSB7c3RyaW5nfSByZWNlcHRvclxuICAgICAgICAqICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgKiAgQGVuZCBpZFxuICAgICAgICAqICBAcGFyYW0ge3N0cmluZ30gbmFtZVxuICAgICAgICAqICBCb29sZWFuIHByb3BlcnR5IHRoYXQgbG9ja3MgdGhlIGNsaWNrXG4gICAgICAgICogIEBjdXJyeWNiICBjYWxsYmFjayBjbGlja0V2ZW50IFwiIG9uIGNsaWNrLCBwcm92aWRlZCB0aGF0IHRoZSBsb2NrIHByb3BlcnR5IGlzIGZhbHNlXCJcbiAgICAgICAgKiAgICAgIEBwYXJhbSB7ZnVuY3Rpb258c3RyaW5nfEFycmF5fSBjYWxsYmFja1xuICAgICAgICAqICAgICAgUnVuIDx0dD5jYWxsYmFjayhjbGlja0V2ZW50KTwvdHQ+ICBvbiBjbGljaywgcHJvdmlkZWQgdGhhdCB0aGUgbG9jayBwcm9wZXJ0eSBpcyBmYWxzZS5cbiAgICAgICAgKiAgICAgIDx0dD50aGlzPC90dD4gaXMgc2V0IHRvIGN1cnJlbnQgPGk+alJuYSBpbnN0YW5jZTwvaT4uXG4gICAgICAgICogICAgICBBIG1ldGhvZCBuYW1lIG1heSBiZSB1c2VkIGluc3RlYWQgb2YgZnVuY3Rpb24uXG4gICAgICAgICogICAgICBBbiBBcnJheSBtYXkgYmUgdXNlZCBjb250YWluaW5nIGFueSBvZiB0aGUgYWJvdmVcbiAgICAgICAgKiAgICAgIHBsdXMgc29tZSBhZGRpdGlvbmFsIHZhbHVlcyB0byBiZSBwcmVwZW5kZWQgdG8gdGhlIGFyZ3VtZW50IGxpc3QuXG4gICAgICAgICogIEBlbmQgY3VycnljYlxuICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0aWNreUNsaWNrID0gZnVuY3Rpb24oIGlkLCBuYW1lLCBjYiApIHtcbiAgICAgICAgICAgIHRoaXMubG9ja05hbWUoIG5hbWUsICdzdGlja3lDbGljaycgKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldHVwKCBpZCwgZnVuY3Rpb24oIGluc3QsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYm91bmQgPSBjdXJyeSggaW5zdCwgY2IgKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWluc3RbbmFtZV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgYm91bmQoZXYpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9ICk7XG4gICAgICAgICAgICB9ICk7XG4gICAgICAgIH07XG4gICAgICAgIC8qKlxuICAgICAgICAqICAgQ3JlYXRlIGFuIGVsZW1lbnQgc2hvcnRjdXQgaW4gdGhlIGpSbmEgaW5zdGFuY2UuXG4gICAgICAgICogICBVc2UgPHR0PnRoaXMuZWxlbWVudC4mbHQ7Y2xhc3NOYW1lJmd0OzwvdHQ+IGluc3RlYWQuXG4gICAgICAgICogICBAbXV0YXRvciBlbGVtZW50XG4gICAgICAgICogICAgICAgQGZ1bmN0aW9uIGVsZW1lbnRcbiAgICAgICAgKiAgICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogICBAZW5kIG11dGF0b3JcbiAgICAgICAgKiAgIEByZWNlcHRvclxuICAgICAgICAqICAgICAgIEBwYXJhbSB7c3RyaW5nfEFycmF5fSByZWNlcHRvclxuICAgICAgICAqICAgICAgIEEganJuYS1wcmVmaXhlZCBjbGFzcyBpbiB0aGUgRE9NXG4gICAgICAgICogICAgICAgYW5kIHRoZSBuYW1lIG9mIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnR5IGluIHRoZSBqUm5hIGluc3RhbmNlLlxuICAgICAgICAqICAgICAgIFVzZSBhIDItZWxlbWVudCBhcnJheSBpZiBkaWZmZXJlbnQgbmFtZXMgYXJlIG5lZWRlZC5cbiAgICAgICAgKiAgIEBlbmQgcmVjZXB0b3JcbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5lbGVtZW50ID0gZnVuY3Rpb24gKCByZWNlcHRvciApIHtcbiAgICAgICAgICAgIGNvbnN0IFtpZCwgbmFtZV0gPSBqUm5hLnBhcnNlSWQoIHJlY2VwdG9yICk7XG4gICAgICAgICAgICB0aGlzLmxvY2tOYW1lKG5hbWUpO1xuICAgICAgICAgICAgdGhpcy5hZGRBcmd1bWVudChuYW1lLCB7IGZvcmJpZGRlbjogMSB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldHVwKCBpZCwgZnVuY3Rpb24oIGluc3QsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICAgICAgaW5zdFtuYW1lXSA9IGVsZW1lbnQ7XG4gICAgICAgICAgICB9ICk7XG4gICAgICAgIH07XG4gICAgICAgIC8qKlxuICAgICAgICAqICAgQG11dGF0b3Igb25cbiAgICAgICAgKiAgICAgICBAZnVuY3Rpb24gb25cbiAgICAgICAgKiAgICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogICBAZW5kIG11dGF0b3JcbiAgICAgICAgKiAgIEBwYXJhbSB7c3RyaW5nfSB0cmlnZ2VyXG4gICAgICAgICogICBFdmVudCB0byBsaXN0ZW4gdG8uIFNlZSBqUXVlcnkgZG9jcyBmb3Igc3VwcG9ydGVkIGV2ZW50IHR5cGVzLlxuICAgICAgICAqICAgQGlkXG4gICAgICAgICogICAgICAgQHBhcmFtIHtzdHJpbmd9IHJlY2VwdG9yXG4gICAgICAgICogICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgKiAgIEBlbmQgaWRcbiAgICAgICAgKiAgIEBjdXJyeWNiIGNhbGxiYWNrIGV2ZW50IFwid2hlbmV2ZXIgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uIDx0dD5yZWNlcHRvcjwvdHQ+IGVsZW1lbnRcIlxuICAgICAgICAqICAgICAgIEBwYXJhbSB7ZnVuY3Rpb258c3RyaW5nfEFycmF5fSBjYWxsYmFja1xuICAgICAgICAqICAgICAgIFJ1biA8dHQ+Y2FsbGJhY2soZXZlbnQpPC90dD4gd2hlbmV2ZXIgZXZlbnQgaXMgdHJpZ2dlcmVkIG9uIDx0dD5yZWNlcHRvcjwvdHQ+IGVsZW1lbnQuXG4gICAgICAgICogICAgICAgPHR0PnRoaXM8L3R0PiBpcyBzZXQgdG8gY3VycmVudCA8aT5qUm5hIGluc3RhbmNlPC9pPi5cbiAgICAgICAgKiAgICAgICBBIG1ldGhvZCBuYW1lIG1heSBiZSB1c2VkIGluc3RlYWQgb2YgZnVuY3Rpb24uXG4gICAgICAgICogICAgICAgQW4gQXJyYXkgbWF5IGJlIHVzZWQgY29udGFpbmluZyBhbnkgb2YgdGhlIGFib3ZlXG4gICAgICAgICogICAgICAgcGx1cyBzb21lIGFkZGl0aW9uYWwgdmFsdWVzIHRvIGJlIHByZXBlbmRlZCB0byB0aGUgYXJndW1lbnQgbGlzdC5cbiAgICAgICAgKiAgIEBlbmQgY3VycnljYlxuICAgICAgICAqL1xuICAgICAgICB0aGlzLm9uID0gZnVuY3Rpb24oIHRyaWdnZXIsIGlkLCBjYiApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldHVwKGlkLCBmdW5jdGlvbihpbnN0LCBlbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYm91bmQgPSBjdXJyeSggaW5zdCwgY2IgKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKHRyaWdnZXIsIGJvdW5kKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgICAvKipcbiAgICAgICAgKiAgIEFzc29jaWF0ZSBhIDx0dD4mbGc7aW5wdXQgdHlwZT1cImZpbGVcIiZndDs8L3R0PlxuICAgICAgICAqICAgd2l0aCBhIGZpbGUgdXBsb2FkIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyBhIHByb21pc2UuXG4gICAgICAgICpcbiAgICAgICAgKiAgIFBsZWFzZSBjb25zaWRlciB1c2luZyBzdGF0aWMgPHR0PmpSbmEudXBsb2FkPC90dD4gaW5zdGVhZC5cbiAgICAgICAgKiAgIEBtdXRhdG9yIHVwbG9hZFxuICAgICAgICAqICAgICAgIEBmdW5jdGlvbiB1cGxvYWRcbiAgICAgICAgKiAgICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogICBAZW5kIG11dGF0b3JcbiAgICAgICAgKiAgIEByZWNlcHRvclxuICAgICAgICAqICAgICAgIEBwYXJhbSB7c3RyaW5nfEFycmF5fSByZWNlcHRvclxuICAgICAgICAqICAgICAgIEEganJuYS1wcmVmaXhlZCBjbGFzcyBpbiB0aGUgRE9NXG4gICAgICAgICogICAgICAgYW5kIHRoZSBuYW1lIG9mIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnR5IGluIHRoZSBqUm5hIGluc3RhbmNlLlxuICAgICAgICAqICAgICAgIFVzZSBhIDItZWxlbWVudCBhcnJheSBpZiBkaWZmZXJlbnQgbmFtZXMgYXJlIG5lZWRlZC5cbiAgICAgICAgKiAgIEBlbmQgcmVjZXB0b3JcbiAgICAgICAgKiAgIEBwYXJhbSB7c3RyaW5nfSBbdHlwZV0gQ2FuIGJlICd0ZXh0JyAoZGVmYXVsdCksICdyYXcnLCBvciAndXJsJy5cbiAgICAgICAgKlxuICAgICAgICAqL1xuICAgICAgICB0aGlzLnVwbG9hZCA9IGZ1bmN0aW9uKCByZWNlcHRvciwgdHlwZSApIHtcbiAgICAgICAgICAgIGNvbnN0IFtpZCwgbmFtZV0gPSBqUm5hLnBhcnNlSWQoIHJlY2VwdG9yICk7XG4gICAgICAgICAgICB0aGlzLmxvY2tOYW1lKG5hbWUpO1xuICAgICAgICAgICAgdGhpcy5hZGRBcmd1bWVudChuYW1lLCB7IGZvcmJpZGRlbjogMSB9KTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldHVwKCBpZCwgZnVuY3Rpb24oIGluc3QsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyBUaGlzIHJlcXVpcmVzIGEgc3BlY2lhbCBlbGVtZW50IC0gY2hlY2sgd2hldGhlciBpdCBjYW4gaW50byBmaWxlc1xuICAgICAgICAgICAgICAgIGluc3RbbmFtZV0gPSBmdW5jdGlvbihjYikge1xuICAgICAgICAgICAgICAgICAgICBsZXQgcHJvbSA9IGpSbmEudXBsb2FkRmlsZSggZWxlbWVudFswXS5maWxlc1swXSwgdHlwZSApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY2IpXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9tID0gcHJvbS50aGVuKGNiLmJpbmQoaW5zdCkpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gcHJvbTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqICBEZWZpbmUgYSBwcm9wZXJ0eSBvciBmdWNudGlvbi4gQW55IGFycmF5IG9yIG9iamVjdCB3aWxsIGJlIHNoYXJlZFxuICAgICAgICAqICBhY3Jvc3MgYWxsIGluc3RhbmNlcy4gU2VlIGFsc28gPHR0PmluaXQ8L3R0Pi5cbiAgICAgICAgKlxuICAgICAgICAqICBAbXV0YXRvciBkZWZcbiAgICAgICAgKiAgICAgIEBmdW5jdGlvbiBkZWZcbiAgICAgICAgKiAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogIEBlbmQgbXV0YXRvclxuICAgICAgICAqICBAcGFyYW0ge3N0cmluZ30gbmFtZSBOYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICAgICAgICAqICBAcGFyYW0gey4uLn0gaW5pdGlhbCBTZXQgPHR0Pm5hbWU8L3R0PiBwcm9wZXJ0eSB0byB0aGlzIHZhbHVlXG4gICAgICAgICovXG4gICAgICAgIHRoaXMuX2luaXQgPSB7fTtcbiAgICAgICAgdGhpcy5kZWYgPSBmdW5jdGlvbiggbmFtZSwgaW5pdGlhbCApIHtcbiAgICAgICAgICAgIHRoaXMubG9ja05hbWUobmFtZSk7XG4gICAgICAgICAgICBpZiAodHlwZW9mIGluaXRpYWwgPT09ICdmdW5jdGlvbicpXG4gICAgICAgICAgICAgICAgaXNNZXRob2RbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5faW5pdFtuYW1lXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gaW5pdGlhbDsgfTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmluaXQgPSBmdW5jdGlvbiggbmFtZSwgYWN0aW9uICkge1xuICAgICAgICAgICAgdGhpcy5sb2NrTmFtZShuYW1lKTtcbiAgICAgICAgICAgIHRoaXMuX2luaXRbbmFtZV0gPSBhY3Rpb247XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcbiAgICAgICAgLy8gVE9ETyBpbml0QXJyYXkgJiBpbml0T2JqZWN0IG9ubHkgdXNlIHNoYWxsb3cgY29weSwgc28gYmV3YXJlXG4gICAgICAgIHRoaXMuaW5pdEFycmF5ID0gZnVuY3Rpb24oIG5hbWUsIHN0YXJ0ID0gW10gKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0KCBuYW1lLCAoKSA9PiBbIC4uLnN0YXJ0IF0gKTtcbiAgICAgICAgfTtcbiAgICAgICAgdGhpcy5pbml0T2JqZWN0ID0gZnVuY3Rpb24oIG5hbWUsIHN0YXJ0ID0ge30gKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0KCBuYW1lLCAoKSA9PiB7IHJldHVybiB7IC4uLnN0YXJ0IH0gfSApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEEgc3R1cGlkIHN0YXRlIG1hY2hpbmUgdGhhdCBhbGxvd3MgdG8gb25seSBlbnRlciBldmVyeSBzdGF0ZSBvbmNlXG4gICAgICAgIHRoaXMuc3RpY2t5U3RhdGUgPSBmdW5jdGlvbiggbmFtZSwgYWN0aW9uX2hhc2gsIGluaXRpYWwgKSB7XG4gICAgICAgICAgICBjb25zdCBydW5uZXIgPSBqUm5hLnN0aWNreVNNKCBhY3Rpb25faGFzaCwgeyBvcmlnaW46IG5hbWUgKyAnIGF0ICcrb3JpZ2luLCBpbml0aWFsIH0gKTtcblxuICAgICAgICAgICAgaXNNZXRob2RbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgLy8gbXVzdCB1c2UgaW5pdCB0byBhdm9pZCBzaGFyaW5nIHN0YXRlIGJldHdlZW4gaW5zdGFuY2VzXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbml0KCBuYW1lLCAoKSA9PiBydW5uZXIucnVuKCkgKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBjYWxsYmFja3MhXG4gICAgICAgIHRoaXMuX29uQXR0YWNoID0gW107XG4gICAgICAgIHRoaXMub25BdHRhY2ggPSBmdW5jdGlvbihmdW4pIHtcbiAgICAgICAgICAgIHRoaXMuX29uQXR0YWNoLnB1c2goZnVuKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIGNvbnN0IGNhbGxiYWNrcyAgPSB7XG4gICAgICAgICAgICBvblJlbW92ZSAgIDogW10sXG4gICAgICAgIH07XG4gICAgICAgIGZvcihsZXQgaSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgIHRoaXNbaV0gPSBmdW5jdGlvbihjYikge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrc1tpXS5wdXNoKGNiKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH07XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmNoZWNrRWxlbWVudCA9IGZ1bmN0aW9uKGVsZW1lbnQsIGFjdGlvbj1cImFkZHJlc3NcIikge1xuICAgICAgICAgICAgLy8gVE9ETyBleHRyYWN0IHRoZSBzZWxlY3RvciBmcm9tICQsIHRvb1xuICAgICAgICAgICAgaWYgKGVsZW1lbnQgPT09IHVuZGVmaW5lZClcbiAgICAgICAgICAgICAgICBibGFtZSggXCJDYW5ub3QgXCIrYWN0aW9uK1wiIGEgbnVsbCBlbGVtZW50XCIpO1xuXG4gICAgICAgICAgICBsZXQgc2VsZWN0b3IgPSAnJztcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZWxlbWVudCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBzZWxlY3RvciA9ICcgJCgnK2VsZW1lbnQrJyknO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSB3aW5kb3cuJCggZWxlbWVudCApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCEoZWxlbWVudCBpbnN0YW5jZW9mIHdpbmRvdy4kKSlcbiAgICAgICAgICAgICAgICBibGFtZSggXCJDYW5ub3QgXCIrYWN0aW9uK1wiIGEgbm9uLSQgb2JqZWN0XCIgKTtcbiAgICAgICAgICAgIGlmICghZWxlbWVudC5sZW5ndGgpXG4gICAgICAgICAgICAgICAgYmxhbWUoIFwiQ2Fubm90IFwiK2FjdGlvbitcIiBhIG1pc3NpbmcgZWxlbWVudFwiK3NlbGVjdG9yICk7XG4gICAgICAgICAgICBpZiAoIGVsZW1lbnQubGVuZ3RoID4gMSlcbiAgICAgICAgICAgICAgICBibGFtZSggXCJDYW5ub3QgXCIrYWN0aW9uK1wiIGFuIGFtYmlndW91cyBlbGVtZW50XCIrc2VsZWN0b3IgKTtcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmZpcnN0KCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgZnVuY3Rpb24gd2Fsa1RyZWUoIHJvb3QsIGNiICkge1xuICAgICAgICAgICAgY2Iocm9vdCk7XG4gICAgICAgICAgICBmb3IoIGxldCBwdHIgPSByb290LmZpcnN0Q2hpbGQ7IHB0ciAhPT0gbnVsbDsgcHRyID0gcHRyLm5leHRTaWJsaW5nKVxuICAgICAgICAgICAgICAgIGlmIChwdHIubm9kZVR5cGUgPT09IDEpIC8vIG9ubHkgRWxlbWVudCdzIGFyZSBpbnZpdGVkXG4gICAgICAgICAgICAgICAgICAgIHdhbGtUcmVlKHB0ciwgY2IpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZmluZENsYXNzZXMoIHJvb3QsIHdhbnRlZCApIHtcbiAgICAgICAgICAgIGNvbnN0IGZvdW5kID0ge307XG5cbiAgICAgICAgICAgIHdhbGtUcmVlKCByb290LCBlbGVtID0+IHtcbiAgICAgICAgICAgICAgICBmb3IgKCBsZXQgY2xzIG9mIGVsZW0uY2xhc3NMaXN0ICkge1xuICAgICAgICAgICAgICAgICAgICBpZiggd2FudGVkW2Nsc10gPT09IHVuZGVmaW5lZCApIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgICAgICBpZiggZm91bmRbY2xzXSApXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0R1cGxpY2F0ZSBlbGVtZW50IHdpdGggY2xhc3MgJytjbHMpO1xuICAgICAgICAgICAgICAgICAgICBmb3VuZFtjbHNdID0gZWxlbTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZm9yKCBsZXQgY2xzIGluIHdhbnRlZCApXG4gICAgICAgICAgICAgICAgaWYgKCFmb3VuZFtjbHNdKVxuICAgICAgICAgICAgICAgICAgICBibGFtZSgnRmFpbGVkIHRvIGxvY2F0ZSBjbGFzcyAnK2Nscyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmb3VuZDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAqXG4gICAgICAgICogIEBmdW5jdGlvbiBhdHRhY2hcbiAgICAgICAgKiAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgQGluc3RhbmNlXG4gICAgICAgICogIEByZXR1cm5zIHtqUm5hLkJvdW5kfSBBIG5ldyBqUm5hIGluc3RhbmNlIGJvdW5kIHRvIGEgRE9NIHN1YnRyZWVcbiAgICAgICAgKiAgQHBhcmFtIHtqUXVlcnl9IGNvbnRhaW5lciAtIHRoZSByb290IG9mIERPTSBzdWJ0cmVlIHRvIGF0dGFjaCB0by5cbiAgICAgICAgKiAgSXQgTVVTVCBjb250YWluIGV4YWN0bHkgb25lIGVsZW1lbnQuXG4gICAgICAgICogIEl0IE1VU1QgY29udGFpbiBleGFjdGx5IG9uZSBpbnN0YW5jZSBvZiBlYWNoIHtAbGluayBqUm5hLnJlY2VwdG9yfVxuICAgICAgICAqICBAcGFyYW0ge09iamVjdH0gW2FyZ3NdIC0gb3B0aW9uYWwgYXJndW1lbnQgdmFsdWVzIHNwZWNpZmllZFxuICAgICAgICAqICB2aWEge0BsaW5rIGpSbmEjYXJnc31cbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hdHRhY2ggPSBmdW5jdGlvbihjb250YWluZXIsIGFyZ3M9e30pIHtcbiAgICAgICAgICAgIC8vIHZhbGlkYXRlIGNvbnRhaW5lciBmaXJzdCwgY2hlY2sgYXJncyBhZnRlciBpbnN0YW5jZSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgIGNvbnRhaW5lciA9IHRoaXMuY2hlY2tFbGVtZW50KGNvbnRhaW5lciwgXCJhdHRhY2ggdG9cIik7XG5cbiAgICAgICAgICAgIC8vIHJlbmFtZSB0aGlzIHRvIG1ldGEgdG8gYXZvaWQgY29uZnVzaW9uIHdpdGggaW5zdGFuY2UncyBgdGhpc2BcbiAgICAgICAgICAgIGNvbnN0IG1ldGEgPSB0aGlzO1xuXG4gICAgICAgICAgICBjb25zdCBpbnN0ID0gbmV3IGpSbmEuQm91bmQoKTtcbiAgICAgICAgICAgIGluc3QuY29udGFpbmVyICAgPSBjb250YWluZXI7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gY2FsbGJhY2tzKSB7XG4gICAgICAgICAgICAgICAgLy8gaW5zdC5fZm9vYmFyIGFjdHVhbCBjYWxsYmFjayBsaXN0LCBpbnN0LmZvb2JhciBhcHBlbmRlclxuICAgICAgICAgICAgICAgIGluc3RbJ18nK2ldID0gW10uY29uY2F0KGNhbGxiYWNrc1tpXSk7XG4gICAgICAgICAgICAgICAgaW5zdFtpXSA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RbJ18nK2ldLnB1c2goY2IpO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaW5zdDtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBbGwganJuYS1jbGFzc2VkIFwicmVjZXB0b3JcIiBlbGVtZW50c1xuICAgICAgICAgICAgaW5zdC5lbGVtZW50ICAgID0ge307XG5cbiAgICAgICAgICAgIC8vIFRPRE8gYmV0dGVyIG5hbWVcbiAgICAgICAgICAgIGluc3QuYXBwZW5kVG8gPSBmdW5jdGlvbiggZWxlbWVudCApIHtcbiAgICAgICAgICAgICAgICBlbGVtZW50ID0gbWV0YS5jaGVja0VsZW1lbnQoZWxlbWVudCwgXCJhcHBlbmQgdG9cIik7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5hcHBlbmQoIGluc3QuY29udGFpbmVyICk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBUT0RPIHNwbGl0IGludG8gZGVzdHJveSgpIGFuZCBkZXRhY2goKVxuICAgICAgICAgICAgLy8gVE9ETyBzaG91bGQgd2UgaG9vayBpbnRvIGNvbnRhaW5lcidzIG9uUmVtb3ZlP1xuICAgICAgICAgICAgaW5zdC5yZW1vdmUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBjYiBvZiBpbnN0Ll9vblJlbW92ZSApIHtcbiAgICAgICAgICAgICAgICAgICAgY2IuYmluZChpbnN0KSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbnN0LmNvbnRhaW5lci5yZW1vdmUoKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIHJlc29sdmUgYWxsIG5lZWRlZCBlbGVtZW50cyBhdCBvbmNlXG4gICAgICAgICAgICBjb25zdCByZXNvbHZlZCA9IGZpbmRDbGFzc2VzKCBjb250YWluZXJbMF0sIHRoaXMuX3dhbnRlZCApO1xuICAgICAgICAgICAgaW5zdC5lbGVtZW50ICA9IHt9O1xuICAgICAgICAgICAgZm9yIChsZXQgY2xzIGluIHJlc29sdmVkKVxuICAgICAgICAgICAgICAgIGluc3QuZWxlbWVudFsgdGhpcy5fd2FudGVkW2Nsc10gXSA9IHdpbmRvdy4kKCByZXNvbHZlZFtjbHNdICk7XG5cbiAgICAgICAgICAgIGZvciAobGV0IGFjdGlvbiBvZiBtZXRhLl9zZXR1cCkge1xuICAgICAgICAgICAgICAgIGFjdGlvblsxXShpbnN0LCBpbnN0LmVsZW1lbnRbIGFjdGlvblswXSBdKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gcHJvY2VzcyBhcmd1bWVudHMgJiBpbml0aWFsIHZhbHVlc1xuICAgICAgICAgICAgZm9yKCBsZXQgaSBpbiBtZXRhLl9pbml0ICkge1xuICAgICAgICAgICAgICAgIC8vIHNraXAgaW5pdGlhbGl6ZXIgZm9yIGdpdmVuIGFyZ3VtZW50cyAtIGJ1dCBub3QgZm9yIG1ldGhvZHNcbiAgICAgICAgICAgICAgICBpZiAoIWlzTWV0aG9kW2ldICYmIGkgaW4gYXJncylcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgaW5zdFtpXSA9IG1ldGEuX2luaXRbaV0uYXBwbHkoaW5zdCwgW2FyZ3NdKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGZvciggbGV0IGtleSBpbiBhcmdzICkge1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gdGhyb3cgYWxsIG9mIGV4dHJhIGFyZ3MsIG5vdCBqdXN0IHRoZSBmaXJzdFxuICAgICAgICAgICAgICAgIGlmICghYWxsb3dBcmdzW2tleV0gKVxuICAgICAgICAgICAgICAgICAgICBibGFtZSggXCJ1bmtub3duIGFyZ3VtZW50IFwiK2tleSk7XG4gICAgICAgICAgICAgICAgaWYgKCFhc3NpZ25BcmdzW2tleV0pXG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGlmIChpc01ldGhvZFtrZXldKSB7XG4gICAgICAgICAgICAgICAgICAgIGluc3Rba2V5XSggYXJnc1trZXldICk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdFtrZXldID0gYXJnc1trZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZXhlY3V0ZSBjYWxsYmFja3NcbiAgICAgICAgICAgIC8vIFRPRE8gcmV3cml0ZSB0aGlzXG4gICAgICAgICAgICBmb3IgKGxldCBpIGluIG1ldGEuX29uQXR0YWNoICkge1xuICAgICAgICAgICAgICAgIGN1cnJ5KGluc3QsIG1ldGEuX29uQXR0YWNoW2ldKShhcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBpbnN0O1xuICAgICAgICB9OyAvLyBlbmQgb2YgdGhpcy5hdHRhY2hcblxuICAgICAgICB0aGlzLmFwcGVuZFRvID0gZnVuY3Rpb24oIGVsZW1lbnQsIGFyZ3MgKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pbnN0YW50aWF0ZShhcmdzKS5hcHBlbmRUbyhlbGVtZW50KTtcbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmluc3RhbnRpYXRlID0gZnVuY3Rpb24oIGFyZ3MgKSB7XG4gICAgICAgICAgICAvLyBUT0RPIHRoaXMgZGllcyBpZiA+MSBub2Rlcywgc28gbW92ZSB0aGUgY2hlY2sgaW50byBodG1sKClcbiAgICAgICAgICAgIGlmICghdGhpcy5fbWFzdGVyKVxuICAgICAgICAgICAgICAgIGJsYW1lKCdUcnlpbmcgdG8gaW5zdGFudGlhdGUgd2l0aCBhbiBlbXB0eSBodG1sKCknKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9IHdpbmRvdy4kKCB0aGlzLl9tYXN0ZXIuY2xvbmVOb2RlKHRydWUpICk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdHRhY2goIGNvbnRhaW5lciwgYXJncyApO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIC8vIGVtcHR5IGNvbnN0cnVjdG9yIGZvciBpbnN0YW5jZW9mJ2luZ1xuICAgIC8vIFRPRE8gaG93IHRvIGRvIGl0IGJldHRlcj9cbiAgICAvKipcbiAgICAqICAgQGNvbnN0cnVjdG9yXG4gICAgKiAgIEB0aGlzIHtqUm5hLkJvdW5kfVxuICAgICpcbiAgICAqICAgRG8gbm90IGNhbGwgdGhpcyBkaXJlY3RseS4gVXNlIHtAbGluayBqUm5hI2F0dGFjaH0gaW5zdGVhZC5cbiAgICAqL1xuICAgIGpSbmEuQm91bmQgPSBmdW5jdGlvbiAoKSB7fTtcblxuICAgIC8vIHByZWZpeCBhbGwgQ1NTIGNsYXNzZXMgdG8gYXZvaWQgbmFtZXNwYWNlIHBvbGx1dGlvblxuICAgIGpSbmEucHJlZml4ID0gJ2pybmEtJztcblxuICAgIGpSbmEuZG9jdW1lbnRUaXRsZSA9IGZ1bmN0aW9uKC4uLmFyZ3MpIHtcbiAgICAgICAgY29uc3QgbWUgPSB7fTtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KCBtZSwgJ3VwZGF0ZScsIHtcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cuZG9jdW1lbnQudGl0bGUgPSBhcmdzLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgIHJldHVybiBtZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gY29zcGxheSBhbiBhcnJheSAtIGJ1dCB3aXRoIGEgbW9kaWZpY2F0aW9uIGhvb2tcbiAgICAgICAgZm9yIChsZXQgaSBpbiBhcmdzKSB7XG4gICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobWUsIGksIHtcbiAgICAgICAgICAgICAgICBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gYXJnc1tpXSB9LFxuICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7IGFyZ3NbaV0gPSB2YWw7IHRoaXMudXBkYXRlKCkgfSxcbiAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIG1lLCAnbGVuZ3RoJywge1xuICAgICAgICAgICAgdmFsdWU6IGFyZ3MubGVuZ3RoXG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gbWU7XG4gICAgfTtcblxuICAgIGpSbmEudXBsb2FkID0gZnVuY3Rpb24ob3B0aW9ucz17fSkge1xuICAgICAgICBjb25zdCBpbnB1dEZpbGUgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW5wdXQnKTtcbiAgICAgICAgaW5wdXRGaWxlLnNldEF0dHJpYnV0ZSgndHlwZScsICAgJ2ZpbGUnKTtcbiAgICAgICAgaW5wdXRGaWxlLnNldEF0dHJpYnV0ZSgnc3R5bGUnLCAgJ2Rpc3BsYXk6IG5vbmUnKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKCBkb25lID0+IHtcbiAgICAgICAgICAgIGlucHV0RmlsZS5vbmlucHV0ID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgalJuYS51cGxvYWRGaWxlKCB0aGlzLmZpbGVzWzBdLCBvcHRpb25zLnR5cGUgKS50aGVuKCByZXN1bHQgPT4ge1xuICAgICAgICAgICAgICAgICAgICBpbnB1dEZpbGUucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoIHJlc3VsdCApO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGlucHV0RmlsZSk7IC8vIHJlcXVpcmVkIGZvciBmaXJlZm94XG4gICAgICAgICAgICBpbnB1dEZpbGUuY2xpY2soKTtcbiAgICAgICAgfSk7XG4gICAgfTtcblxuICAgIGpSbmEudXBsb2FkRmlsZSA9IGZ1bmN0aW9uICggZmlsZSwgdHlwZSApIHtcbiAgICAgICAgY29uc3QgdHlwZXMgPSB7XG4gICAgICAgICAgICB0ZXh0IDogJ3JlYWRBc1RleHQnLFxuICAgICAgICAgICAgcmF3ICA6ICdyZWFkQXNCaW5hcnlTdHJpbmcnLFxuICAgICAgICAgICAgdXJsICA6ICdyZWFkQXNEYXRhVXJsJ1xuICAgICAgICB9O1xuICAgICAgICBjb25zdCBob3cgPSB0eXBlc1sgdHlwZSB8fCAndGV4dCcgXTtcbiAgICAgICAgaWYgKCFob3cpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1cGxvYWRGaWxlKCk6IHR5cGUgbXVzdCBiZSAndGV4dCcoZGVmYXVsdCksICdyYXcnLCBvciAndXJsJ1wiKTtcbiAgICAgICAgY29uc3QgcmVhZGVyID0gbmV3IHdpbmRvdy5GaWxlUmVhZGVyKCk7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihkb25lKSB7XG4gICAgICAgICAgICByZWFkZXIub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxldCByZXN1bHQgPSB7IGNvbnRlbnQ6IHJlYWRlci5yZXN1bHQsIGluZm86IGZpbGUgfTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRba2V5XSA9IGZpbGVba2V5XTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgZG9uZShyZXN1bHQpO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIHJlYWRlcltob3ddKGZpbGUpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgalJuYS5kb3dubG9hZCA9IGZ1bmN0aW9uKGZpbGVuYW1lLCBjb250ZW50LCBjdHlwZSkge1xuICAgICAgICBpZiAoIWN0eXBlKVxuICAgICAgICAgICAgY3R5cGUgPSAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJztcbiAgICAgICAgLy8gVE9ETyBhbHNvIGFkZCBjaGFyc2V0PXV0Zi04IHVubGVzcyBiaW5hcnlcblxuICAgICAgICAvLyBTaGFtZWxlc3NseSBzdG9sZW4gZnJvbSBodHRwczovL3N0YWNrb3ZlcmZsb3cuY29tL2EvMzA4MDA3MTUvMjgwNDQ5XG4gICAgICAgIGNvbnN0IGRhdGFTdHIgPSAnZGF0YTonK2N0eXBlKycsJytlbmNvZGVVUklDb21wb25lbnQoIGNvbnRlbnQgKTtcbiAgICAgICAgY29uc3QgYUhyZWYgPSB3aW5kb3cuZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYScpO1xuICAgICAgICBhSHJlZi5zZXRBdHRyaWJ1dGUoXCJocmVmXCIsICAgICBkYXRhU3RyKTtcbiAgICAgICAgYUhyZWYuc2V0QXR0cmlidXRlKFwiZG93bmxvYWRcIiwgZmlsZW5hbWUpO1xuICAgICAgICB3aW5kb3cuZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChhSHJlZik7IC8vIHJlcXVpcmVkIGZvciBmaXJlZm94XG4gICAgICAgIGFIcmVmLmNsaWNrKCk7XG4gICAgICAgIGFIcmVmLnJlbW92ZSgpO1xuICAgIH07XG5cbiAgICBqUm5hLmJhY2tlbmQgPSBmdW5jdGlvbihzcGVjID0ge30pIHtcbiAgICAgICAgY29uc3QgdXJsID0gc3BlYy51cmw7XG4gICAgICAgIGlmICghdXJsKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwialJuYS5iYWNrZW5kOiAndXJsJyBwYXJhbWV0ZXIgaXMgcmVxdWlyZWRcIik7XG5cbiAgICAgICAgY29uc3QgbWV0aG9kID0gKHNwZWMubWV0aG9kIHx8ICdQT1NUJykudG9VcHBlckNhc2UoKTtcbiAgICAgICAgbGV0IGNvbnRlbnRfdHlwZSwgcGFyc2UsIHN0cmluZ2lmeTtcblxuICAgICAgICAvLyBUT0RPIGlmIHR5cGUgPT0ganNvblxuICAgICAgICBjb250ZW50X3R5cGUgPSAnYXBwbGljYXRpb24vanNvbic7XG4gICAgICAgIHBhcnNlICAgICAgICA9IEpTT04ucGFyc2U7XG4gICAgICAgIHN0cmluZ2lmeSAgICA9IEpTT04uc3RyaW5naWZ5O1xuXG4gICAgICAgIHJldHVybiBmdW5jdGlvbihhcmdzKSB7XG4gICAgICAgICAgICBsZXQgcXVlcnkgPSAnJztcbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZSggZnVuY3Rpb24gKGRvbmUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB4aHIgPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcblxuICAgICAgICAgICAgICAgIHhoci5hZGRFdmVudExpc3RlbmVyKCBcImxvYWRcIiwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBwYXJzZSh0aGlzLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoZGF0YSk7XG4gICAgICAgICAgICAgICAgfSApO1xuICAgICAgICAgICAgICAgIHhoci5vcGVuKG1ldGhvZCwgdXJsICsgcXVlcnkpO1xuICAgICAgICAgICAgICAgIGlmIChjb250ZW50X3R5cGUpXG4gICAgICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyKCBcIkNvbnRlbnQtVHlwZVwiLCBjb250ZW50X3R5cGUgKTtcbiAgICAgICAgICAgICAgICB4aHIuc2VuZChzdHJpbmdpZnkoYXJncykpO1xuICAgICAgICAgICAgfSApO1xuICAgICAgICB9O1xuICAgIH07XG5cbiAgICAvLyBjb25zdCBzd2l0Y2hlcm9vID0galJuYS5zdGlja3lTTSggeyBzdGF0ZTogb25Td2l0Y2gsIC4uLiB9LCAuLi4gKS5ydW4oKVxuICAgIC8vIHN3aXRjaGVyb28oc2FtZV9zdGF0ZSk7IC8vIGRvZXMgbm90aGluZ1xuICAgIC8vIHN3aXRjaGVyb28ob3RoZXJfc3RhdGUpOyAvLyBleGVjdXRlcyByZXNwZWN0aXZlIG9uU3dpdGNoXG4gICAgLy8gc3dpdGNoZXJvbygpOyAvLyByZXR1cm5zIGN1cnJlbnQgc3RhdGVcbiAgICBqUm5hLnN0aWNreVNNID0gZnVuY3Rpb24oIGFjdGlvbl9oYXNoLCBhcmdzICkge1xuICAgICAgICAvLyBUT0RPIHZhbGlkYXRlIGFyZ3NcbiAgICAgICAgY29uc3Qgb3JpZ2luID0gYXJncy5vcmlnaW4gfHwgJy0galJuYS5zdGlja3lTTUAnK2NhbGxlckluZm8oMSk7XG5cbiAgICAgICAgaWYgKGFyZ3MuaW5pdGlhbCAhPT0gdW5kZWZpbmVkICYmICFhY3Rpb25faGFzaFthcmdzLmluaXRpYWxdKVxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiSWxsZWdhbCBpbml0aWFsIHN0YXRlOiBcIithcmdzLmluaXRpYWwrJyAnK29yaWdpbik7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHJ1bjogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyB0aGlzLnJ1bihpbml0aWFsX3N0YXRlKVxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZSA9IGFyZ3MuaW5pdGlhbDtcblxuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihhcmcpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gMC1hcmcgPT4gZ2V0dGVyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJylcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBzdGF0ZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLnRyYWNlKCdzd2l0Y2ggJytzdGF0ZSsnLT4nK2FyZyk7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGFyZyAhPT0gc3RhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvZG8gPSBhY3Rpb25faGFzaFthcmddO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0b2RvKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignSWxsZWdhbCBzdGF0ZSBzd2l0Y2ggJytzdGF0ZSsnLT4nK2FyZyArJyAnK29yaWdpbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB0b2RvLmFwcGx5KHRoaXMsIFtzdGF0ZSwgYXJnXSk7IC8vIChvbGQsIG5ldylcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRlID0gYXJnO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIHVzYWdlOlxuICAgIC8vIGNvbnN0IFsgZWxlbWVudE5hbWUsIHByb3BlcnR5TmFtZSBdID0galJuYS5wYXJzZUlkICggc3RyaW5nIHwgWyBzdHJpbmcsIHN0cmluZyBdIClcbiAgICBqUm5hLnBhcnNlSWQgPSBmdW5jdGlvbihyZWNlcHRvciwgb3B0aW9ucz17fSkge1xuICAgICAgICBsZXQgb3V0O1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWNlcHRvcikpIHtcbiAgICAgICAgICAgIGlmIChyZWNlcHRvci5sZW5ndGggPiAyKVxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ2pSbmEgcmVjZXB0b3IgbXVzdCBiZSBhIHN0cmluZyBvciAyLWVsZW1lbnQgYXJyYXknKTtcbiAgICAgICAgICAgIG91dCA9IFtdLmNvbmNhdChyZWNlcHRvcik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBvdXQgPSBbIHJlY2VwdG9yIF1cbiAgICAgICAgfVxuICAgICAgICBpZiAodHlwZW9mIG91dFswXSAhPT0gJ3N0cmluZycgJiYgdHlwZW9mIG91dFswXSAhPT0gJ251bWJlcicpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoICdqUm5hIHJlY2VwdG9yIG11c3QgYmUgYSBzdHJpbmcgb3IgMi1lbGVtZW50IGFycmF5Jyk7XG4gICAgICAgIGlmIChvdXRbMV0gPT09IHVuZGVmaW5lZCAmJiAhb3B0aW9ucy5za2lwTWlzc2luZylcbiAgICAgICAgICAgIG91dFsxXSA9IG91dFswXTtcbiAgICAgICAgcmV0dXJuIG91dDtcbiAgICB9O1xuICAgIHJldHVybiBqUm5hO1xufSkoKTtcblxuaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnKVxuICAgIHdpbmRvdy5qUm5hID0galJuYTtcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJylcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGpSbmE7XG4iXX0=
