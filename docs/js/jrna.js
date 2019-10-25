(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

const ArrowSM = (function(){
    /* Determine n-th caller up the stack */
    /* Inspired by Perl's Carp module */
    function callerInfo(n) {
        /* a terrible rex that basically searches for file.js:nnn:nnn several times*/
        const inStack = /([^:\s]+:\d+(?::\d+)?)\W*(\n|$)/g;
        return (new Error().stack.match(inStack)[n+1] || '')
            .replace(/[^/\w]*/, '').replace(/\D*$/,'');
    }

   /**
    *   @typedef {String|Number|Boolean} ArrowSM~ValidState
    *   @desc
    *   ArrowSM states may be strings, numbers, or booleans.
    *   As of current, no distinction between a value and its string
    *       representation is made, so be careful.
    */
   /**
    *   @callback ArrowSM~Instance
    *   @param {*} [event] Argument to be sent to the underlying callbacks
    *   @returns {ArrowSM~ValidState|this}
    *   @throws Throws an error if an invalid transition was requested,
    *   or one of the callbacks threw.
    *   @desc
    *   An ArrowSM <i>instance</i> is a function that encapsulates
    *   a state variable and the transition map.
    *   Without argument, it returns the current state.
    *   Given an argument, it makes a decision whether to change state
    *       and executes all the necessary callbacks in order.
    *   In this case, whatever <tt>this</tt> points to is returned,
    *   so that the method form of SM can be chained.
    */
   /**
    *   @callback ArrowSM~Decider
    *   @param {*} event
    *   Whatever argument was given to the machine itself.
    *   @param {ArrowSM~ValidState} oldState
    *   The state the machine is currently in.
    *   @returns {ArrowSM~ValidState} newState
    *   The state to make a transition to.
    *   @desc
    *   A callback that chooses the next state.
    */
   /**
    *   @callback ArrowSM~Transition
    *   @param {*} event
    *   Whatever argument was given to the machine itself.
    *   @param {ArrowSM~ValidState} oldState
    *   The state the machine is currently in.
    *   @param {ArrowSM~ValidState} newState
    *   The state the machine is transitioning to.
    *   @desc
    *   A callback that executes upon switching the state.
    *   Return value is ignored.
    */
   /**
    *   @public
    *   @class ArrowSM
    *   @classdesc
    *   Arrow SM is a finite state machine implementation in javascript.
    *   <br><br>
    *
    *   <b>Overview</b>
    *   <br><br>
    *
    *   A state machine itself is merely a {@link ArrowSM~Instance function}
    *       that returns the state identifier if called without argument,
    *       or makes a transition given an argument.
    *   <br><br>
    *
    *   A transition map based on callbacks must be created
    *       before starting the machine (aka the <i>builder</i> pattern).
    *   Multiple independent machines may be created from the same template.
    *   <br><br>
    *
    *   Machines may be bound to objects to serve as methods
    *       and/or access auxiliary state.
    *   In such case, <tt>this</tt> reference is propagated correctly
    *       through all the callbacks and is returned upon completion,
    *       so that the method is chainable.
    *   <br><br>
    *
    *   <b>On callback execution order</b>
    *   <br><br>
    *
    *   Callbacks added by methods described below are executed as follows:
    *   <br><br>
    *
    *   <i>global.onDecide</i> (see {@link ArrowSM#onDecide onDecide})
    *   <br>
    *   If a value is returned, it is assumed to be the next state
    *       and the next step is skipped.
    *   <br><br>
    *   <i>oldState.decide</i>
    *   (see {@link ArrowSM#addState addState}/{@link ArrowSM#on on})
    *   <br>
    *   If a value is returned, it is assumed to be the next state.
    *   Otherwise, execution stops here.
    *   <br><br>
    *   <i>oldState.leave</i>
    *   (see {@link ArrowSM#addState addState}/{@link ArrowSM#on on})
    *   <br><br>
    *   <i>newState.enter</i>
    *   (see {@link ArrowSM#addState addState}/{@link ArrowSM#on on})
    *   <br><br>
    *   <i>global.onSwitch</i> (see {@link ArrowSM#onSwitch onSwitch})
    *   <br>
    *   Finally, global transition callback is called.
    *   <br><br>
    *   Only after that the state is switched.
    *   Exception in any of the above aborts the whole transition.
    *   <br><br>
    *
    *   <b>On reenterability</b>
    *   <br><br>
    *
    *   The machine has no way to reference itself, however, using <tt>this</tt>
    *   more events may be sent while a transition is still in progress.
    *   <br><br>
    *
    *   In this case, the new events are queued and only executed after
    *   the ongoing transition is complete.
    *   <br><br>
    *
    *   In case of an exception, the last complete transition becomes the final
    *       one and the events in queue are simply discarded.
    *   <br><br>
    *
    *   @example
    *   const toggle = new ArrowSM({
    *       true:  _ => false,
    *       false: _ => true,
    *   })
    *   .on( 'enter', true, _ => console.log('Switched on!'))
    *   .initialState(false)
    *   .start();
    *   toggle(); // false
    *   toggle('click me'); // undefined + console.log
    *   toggle(); // true now
    *
    *   @param {Object} [stateMap]
    *   State transition map.
    *   Keys are state names, values are objects.
    *   See {@link ArrowSM#addState addState} for specification format.
    */
    function ArrowSM(dsl = {}) {
        const where = ' in ArrowSM defined at '+callerInfo(1);
        const blame = msg => { throw new Error(msg+where); };
        const stages = ['decide', 'leave', 'enter'];
        const skip = function() {};

        let defaultState;
        this.states = {};
        this.switch = skip;
        this.decide = skip;

       /**
        *   @memberOf ArrowSM
        *   @instance
        *   @function addState
        *   @returns {ArrowSM} this, chainable
        *   @param {ArrowSM~ValidState} name
        *   @param {Object|ArrowSM~Decider} [spec]
        *   If a function is given, it is assumed to be
        *       the <tt>decide</tt> callback (see below).
        *   @param {ArrowSM~Decider} [spec.decide] Receives event and old state,
            returns new state or <tt>undefined</tt> if no transition is needed
        *   @param {ArrowSM~Transition} [spec.enter] Executed upon entering the state.
        *   Receives event, oldState, and newState.
        *   Return value is ignored.
        *   @param {ArrowSM~Transition} [spec.leave] Executed upon leaving the state.
        *   Receives event, oldState, and newState.
        *   Return value is ignored.
        *   @param {Boolean} [spec.default] If true, set this state
        *       as {@link ArrowSM#initialState initialState}.
        *   Only one state may be the default.
        *   @throws Throws if state is duplicate or spec is wrong
        *   @desc
        *   Add a new state to the machine.
        */
        this.addState = function(name, spec={}) {
            // TODO validate input
            if (typeof spec === 'function')
                spec = { decide: spec };

            if (this.states[name])
                blame('Attempt to redefine state '+name);

            if (spec.default) {
                if (defaultState !== undefined)
                    blame('Attempt to set multiple default states: '+defaultState+' and '+name);
                defaultState = name;
            }

            this.states[name] = {};
            for( let i of stages )
                this.states[name][i] = spec[i] || skip;

            return this;
        };

        for( let name in dsl ) {
            this.addState( name, dsl[name] );
        }

       /**
        *   @memberOf ArrowSM
        *   @instance
        *   @returns {ArrowSM} this, chainable
        *   @function on
        *   @param {String} when
        *   Valid values are 'enter', 'decide', and 'leave'.
        *   @param {ArrowSM~ValidState} state
        *   State to apply the callback to.
        *   @param {ArrowSM~Decider|ArrowSM~Transition} callback
        *   Action to execute.
        *   @desc
        *   Set a callback for a particular state.
        *   This is basically the same as providing corresponding fields
        *       in {@link ArrowSM#addState addState()}.
        */
        this.on = function( when, state, callback ) {
            if (stages.indexOf(when) === -1)
                blame("Illegal trigger for on(): "+when);
            if (this.states[state] === undefined)
                blame("Illegal state name for on(): "+state);
            this.states[state][when] = callback;
            return this;
        };

       /**
        *   @memberOf ArrowSM
        *   @instance
        *   @returns {ArrowSM} this, chainable
        *   @function onSwitch
        *   @param {ArrowSM~Transition} callback
        *   @desc
        *   Set a global callback to be executed <i>after</i>
        *   the respective states' <tt>enter</tt> and <tt>leave</tt> callbacks.
        *   @example
        *   sm.onSwitch( (event, oldState, newState) => console.log(oldState+'->'+newState) )
        */
        this.onSwitch = function(cb) {
            // TODO validate input
            this.switch = cb;
            return this;
        };

       /**
        *   @memberOf ArrowSM
        *   @instance
        *   @returns {ArrowSM} this, chainable
        *   @function onDecide
        *   @param {ArrowSM~Decider} callback
        *   @desc
        *   Set a global callback to be executed <i>before</i>
        *   the current state's <tt>decide</tt> callback.
        *   This can be used to typecheck events,
        *   or to create unconditional transitions from multiple states.
        *
        *   @example
        *   // switch states by hand, utilizing side effects of enter/leave
        *   const switcher = new ArrowSM()
        *       .onDecide( to => to )
        *       .addState( 'foo' )
        *       .on( 'enter', 'foo', function() { ... } );
        *
        *   @example
        *   // ditto, but forbid loop transition:
        *   const stickySwitcher = new ArrowSM()
        *       .onDecide( (to, from) => from === to ? undefined : to )
        *       .addState( 'foo' )
        *       .on( 'enter', 'foo', function() { ... } );
        */
        this.onDecide = function(cb) {
            // TODO validate input
            this.decide = cb;
            return this;
        };

       /**
        *   @memberOf ArrowSM
        *   @instance
        *   @returns {ArrowSM} this, chainable
        *   @function initialState
        *   @param {ArrowSM~ValidState} initialState
        *   @throws Throws an error if no such state has yet been defined.
        *   @desc
        *   Set the state to start from if {@link ArrowSM#start start()}
        *   is called without argument.
        */
        this.initialState = function(name) {
            if( !this.states[name] )
                blame('Attempt to set nonexistent state as initial: '+name);
            defaultState = name;
            return this;
        };

       /**
        *   @memberOf ArrowSM
        *   @instance
        *   @function start
        *   @returns {ArrowSM~Instance} stateMachine
        *   @param {ArrowSM~ValidState} [initialState]
        *   May be omitted if {@link ArrowSM#initialState initialState}
        *       was called before.
        *   @throws Throws an error if initialState is not a valid state,
        *       or entering it is somehow prohibited.
        *   @desc
        *   Create an actual state machine instance.
        *   Multiple independent instances can be created
        *       from the same builder template.
        *   Machines can be bound to objects and/or used as methods.
        */
        this.start = function(initialState, initialTarget) {
            const spec = this;
            if( initialState === undefined ) {
                if (defaultState === undefined )
                    blame('No initial state was given');
                initialState = defaultState;
            }
            if( !spec.states[initialState] )
                blame('Illegal initial state '+initialState);

            let state;

            /* Here and below: target = copy of `this`;
             *     cbarg = [ event, fromState, toState ] */
            const setState = function(target, cbarg) {
                const next = spec.states[cbarg[2]];
                if (next === undefined)
                    blame('Illegal state change '+state+'->'+cbarg[2]);

                if (state !== undefined)
                    spec.states[state].leave.apply(target, cbarg)
                // TODO transition callback
                next.enter.apply(target, cbarg);
                spec.switch.apply(target, cbarg);
                state = cbarg[2];
            };

            const decide = function(target, arg) {
                const cbarg = [arg, state, undefined];
                cbarg[2] = spec.decide.apply(target, cbarg);
                if (cbarg[2] === undefined)
                        cbarg[2] = spec.states[state].decide.apply(target, cbarg);
                if (cbarg[2] !== undefined)
                    setState(target, cbarg);
            };

            setState(initialTarget, [undefined, undefined, initialState]);

            let queue;
            return function(arg) {
                if (arguments.length === 0)
                    return state;

                const target = this;
                if (queue !== undefined) {
                    queue.push([target, arg]);
                    return;
                }

                queue = [[target, arg]];
                try {
                    while (queue.length) {
                        const task = queue.shift();
                        decide( task[0], task[1] );
                    }
                } finally {
                    queue = undefined;
                }
                return target;
            };
        };
    }
    return ArrowSM;
})();

if (typeof module !== 'undefined' && module && typeof module.exports !== 'undefined' ) {
    module.exports = ArrowSM;
}

},{}],2:[function(require,module,exports){


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


},{}],3:[function(require,module,exports){
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
    const ArrowSM    = require('./dep/arrow-sm.js');

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
else
    module.exports = jRna;

},{"./dep/arrow-sm.js":1,"./dep/caller-info.js":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL25wbS1wYWNrYWdlcy9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9kZXAvYXJyb3ctc20uanMiLCJsaWIvZGVwL2NhbGxlci1pbmZvLmpzIiwibGliL2pybmEuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoWUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgQXJyb3dTTSA9IChmdW5jdGlvbigpe1xuICAgIC8qIERldGVybWluZSBuLXRoIGNhbGxlciB1cCB0aGUgc3RhY2sgKi9cbiAgICAvKiBJbnNwaXJlZCBieSBQZXJsJ3MgQ2FycCBtb2R1bGUgKi9cbiAgICBmdW5jdGlvbiBjYWxsZXJJbmZvKG4pIHtcbiAgICAgICAgLyogYSB0ZXJyaWJsZSByZXggdGhhdCBiYXNpY2FsbHkgc2VhcmNoZXMgZm9yIGZpbGUuanM6bm5uOm5ubiBzZXZlcmFsIHRpbWVzKi9cbiAgICAgICAgY29uc3QgaW5TdGFjayA9IC8oW146XFxzXSs6XFxkKyg/OjpcXGQrKT8pXFxXKihcXG58JCkvZztcbiAgICAgICAgcmV0dXJuIChuZXcgRXJyb3IoKS5zdGFjay5tYXRjaChpblN0YWNrKVtuKzFdIHx8ICcnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1teL1xcd10qLywgJycpLnJlcGxhY2UoL1xcRCokLywnJyk7XG4gICAgfVxuXG4gICAvKipcbiAgICAqICAgQHR5cGVkZWYge1N0cmluZ3xOdW1iZXJ8Qm9vbGVhbn0gQXJyb3dTTX5WYWxpZFN0YXRlXG4gICAgKiAgIEBkZXNjXG4gICAgKiAgIEFycm93U00gc3RhdGVzIG1heSBiZSBzdHJpbmdzLCBudW1iZXJzLCBvciBib29sZWFucy5cbiAgICAqICAgQXMgb2YgY3VycmVudCwgbm8gZGlzdGluY3Rpb24gYmV0d2VlbiBhIHZhbHVlIGFuZCBpdHMgc3RyaW5nXG4gICAgKiAgICAgICByZXByZXNlbnRhdGlvbiBpcyBtYWRlLCBzbyBiZSBjYXJlZnVsLlxuICAgICovXG4gICAvKipcbiAgICAqICAgQGNhbGxiYWNrIEFycm93U01+SW5zdGFuY2VcbiAgICAqICAgQHBhcmFtIHsqfSBbZXZlbnRdIEFyZ3VtZW50IHRvIGJlIHNlbnQgdG8gdGhlIHVuZGVybHlpbmcgY2FsbGJhY2tzXG4gICAgKiAgIEByZXR1cm5zIHtBcnJvd1NNflZhbGlkU3RhdGV8dGhpc31cbiAgICAqICAgQHRocm93cyBUaHJvd3MgYW4gZXJyb3IgaWYgYW4gaW52YWxpZCB0cmFuc2l0aW9uIHdhcyByZXF1ZXN0ZWQsXG4gICAgKiAgIG9yIG9uZSBvZiB0aGUgY2FsbGJhY2tzIHRocmV3LlxuICAgICogICBAZGVzY1xuICAgICogICBBbiBBcnJvd1NNIDxpPmluc3RhbmNlPC9pPiBpcyBhIGZ1bmN0aW9uIHRoYXQgZW5jYXBzdWxhdGVzXG4gICAgKiAgIGEgc3RhdGUgdmFyaWFibGUgYW5kIHRoZSB0cmFuc2l0aW9uIG1hcC5cbiAgICAqICAgV2l0aG91dCBhcmd1bWVudCwgaXQgcmV0dXJucyB0aGUgY3VycmVudCBzdGF0ZS5cbiAgICAqICAgR2l2ZW4gYW4gYXJndW1lbnQsIGl0IG1ha2VzIGEgZGVjaXNpb24gd2hldGhlciB0byBjaGFuZ2Ugc3RhdGVcbiAgICAqICAgICAgIGFuZCBleGVjdXRlcyBhbGwgdGhlIG5lY2Vzc2FyeSBjYWxsYmFja3MgaW4gb3JkZXIuXG4gICAgKiAgIEluIHRoaXMgY2FzZSwgd2hhdGV2ZXIgPHR0PnRoaXM8L3R0PiBwb2ludHMgdG8gaXMgcmV0dXJuZWQsXG4gICAgKiAgIHNvIHRoYXQgdGhlIG1ldGhvZCBmb3JtIG9mIFNNIGNhbiBiZSBjaGFpbmVkLlxuICAgICovXG4gICAvKipcbiAgICAqICAgQGNhbGxiYWNrIEFycm93U01+RGVjaWRlclxuICAgICogICBAcGFyYW0geyp9IGV2ZW50XG4gICAgKiAgIFdoYXRldmVyIGFyZ3VtZW50IHdhcyBnaXZlbiB0byB0aGUgbWFjaGluZSBpdHNlbGYuXG4gICAgKiAgIEBwYXJhbSB7QXJyb3dTTX5WYWxpZFN0YXRlfSBvbGRTdGF0ZVxuICAgICogICBUaGUgc3RhdGUgdGhlIG1hY2hpbmUgaXMgY3VycmVudGx5IGluLlxuICAgICogICBAcmV0dXJucyB7QXJyb3dTTX5WYWxpZFN0YXRlfSBuZXdTdGF0ZVxuICAgICogICBUaGUgc3RhdGUgdG8gbWFrZSBhIHRyYW5zaXRpb24gdG8uXG4gICAgKiAgIEBkZXNjXG4gICAgKiAgIEEgY2FsbGJhY2sgdGhhdCBjaG9vc2VzIHRoZSBuZXh0IHN0YXRlLlxuICAgICovXG4gICAvKipcbiAgICAqICAgQGNhbGxiYWNrIEFycm93U01+VHJhbnNpdGlvblxuICAgICogICBAcGFyYW0geyp9IGV2ZW50XG4gICAgKiAgIFdoYXRldmVyIGFyZ3VtZW50IHdhcyBnaXZlbiB0byB0aGUgbWFjaGluZSBpdHNlbGYuXG4gICAgKiAgIEBwYXJhbSB7QXJyb3dTTX5WYWxpZFN0YXRlfSBvbGRTdGF0ZVxuICAgICogICBUaGUgc3RhdGUgdGhlIG1hY2hpbmUgaXMgY3VycmVudGx5IGluLlxuICAgICogICBAcGFyYW0ge0Fycm93U01+VmFsaWRTdGF0ZX0gbmV3U3RhdGVcbiAgICAqICAgVGhlIHN0YXRlIHRoZSBtYWNoaW5lIGlzIHRyYW5zaXRpb25pbmcgdG8uXG4gICAgKiAgIEBkZXNjXG4gICAgKiAgIEEgY2FsbGJhY2sgdGhhdCBleGVjdXRlcyB1cG9uIHN3aXRjaGluZyB0aGUgc3RhdGUuXG4gICAgKiAgIFJldHVybiB2YWx1ZSBpcyBpZ25vcmVkLlxuICAgICovXG4gICAvKipcbiAgICAqICAgQHB1YmxpY1xuICAgICogICBAY2xhc3MgQXJyb3dTTVxuICAgICogICBAY2xhc3NkZXNjXG4gICAgKiAgIEFycm93IFNNIGlzIGEgZmluaXRlIHN0YXRlIG1hY2hpbmUgaW1wbGVtZW50YXRpb24gaW4gamF2YXNjcmlwdC5cbiAgICAqICAgPGJyPjxicj5cbiAgICAqXG4gICAgKiAgIDxiPk92ZXJ2aWV3PC9iPlxuICAgICogICA8YnI+PGJyPlxuICAgICpcbiAgICAqICAgQSBzdGF0ZSBtYWNoaW5lIGl0c2VsZiBpcyBtZXJlbHkgYSB7QGxpbmsgQXJyb3dTTX5JbnN0YW5jZSBmdW5jdGlvbn1cbiAgICAqICAgICAgIHRoYXQgcmV0dXJucyB0aGUgc3RhdGUgaWRlbnRpZmllciBpZiBjYWxsZWQgd2l0aG91dCBhcmd1bWVudCxcbiAgICAqICAgICAgIG9yIG1ha2VzIGEgdHJhbnNpdGlvbiBnaXZlbiBhbiBhcmd1bWVudC5cbiAgICAqICAgPGJyPjxicj5cbiAgICAqXG4gICAgKiAgIEEgdHJhbnNpdGlvbiBtYXAgYmFzZWQgb24gY2FsbGJhY2tzIG11c3QgYmUgY3JlYXRlZFxuICAgICogICAgICAgYmVmb3JlIHN0YXJ0aW5nIHRoZSBtYWNoaW5lIChha2EgdGhlIDxpPmJ1aWxkZXI8L2k+IHBhdHRlcm4pLlxuICAgICogICBNdWx0aXBsZSBpbmRlcGVuZGVudCBtYWNoaW5lcyBtYXkgYmUgY3JlYXRlZCBmcm9tIHRoZSBzYW1lIHRlbXBsYXRlLlxuICAgICogICA8YnI+PGJyPlxuICAgICpcbiAgICAqICAgTWFjaGluZXMgbWF5IGJlIGJvdW5kIHRvIG9iamVjdHMgdG8gc2VydmUgYXMgbWV0aG9kc1xuICAgICogICAgICAgYW5kL29yIGFjY2VzcyBhdXhpbGlhcnkgc3RhdGUuXG4gICAgKiAgIEluIHN1Y2ggY2FzZSwgPHR0PnRoaXM8L3R0PiByZWZlcmVuY2UgaXMgcHJvcGFnYXRlZCBjb3JyZWN0bHlcbiAgICAqICAgICAgIHRocm91Z2ggYWxsIHRoZSBjYWxsYmFja3MgYW5kIGlzIHJldHVybmVkIHVwb24gY29tcGxldGlvbixcbiAgICAqICAgICAgIHNvIHRoYXQgdGhlIG1ldGhvZCBpcyBjaGFpbmFibGUuXG4gICAgKiAgIDxicj48YnI+XG4gICAgKlxuICAgICogICA8Yj5PbiBjYWxsYmFjayBleGVjdXRpb24gb3JkZXI8L2I+XG4gICAgKiAgIDxicj48YnI+XG4gICAgKlxuICAgICogICBDYWxsYmFja3MgYWRkZWQgYnkgbWV0aG9kcyBkZXNjcmliZWQgYmVsb3cgYXJlIGV4ZWN1dGVkIGFzIGZvbGxvd3M6XG4gICAgKiAgIDxicj48YnI+XG4gICAgKlxuICAgICogICA8aT5nbG9iYWwub25EZWNpZGU8L2k+IChzZWUge0BsaW5rIEFycm93U00jb25EZWNpZGUgb25EZWNpZGV9KVxuICAgICogICA8YnI+XG4gICAgKiAgIElmIGEgdmFsdWUgaXMgcmV0dXJuZWQsIGl0IGlzIGFzc3VtZWQgdG8gYmUgdGhlIG5leHQgc3RhdGVcbiAgICAqICAgICAgIGFuZCB0aGUgbmV4dCBzdGVwIGlzIHNraXBwZWQuXG4gICAgKiAgIDxicj48YnI+XG4gICAgKiAgIDxpPm9sZFN0YXRlLmRlY2lkZTwvaT5cbiAgICAqICAgKHNlZSB7QGxpbmsgQXJyb3dTTSNhZGRTdGF0ZSBhZGRTdGF0ZX0ve0BsaW5rIEFycm93U00jb24gb259KVxuICAgICogICA8YnI+XG4gICAgKiAgIElmIGEgdmFsdWUgaXMgcmV0dXJuZWQsIGl0IGlzIGFzc3VtZWQgdG8gYmUgdGhlIG5leHQgc3RhdGUuXG4gICAgKiAgIE90aGVyd2lzZSwgZXhlY3V0aW9uIHN0b3BzIGhlcmUuXG4gICAgKiAgIDxicj48YnI+XG4gICAgKiAgIDxpPm9sZFN0YXRlLmxlYXZlPC9pPlxuICAgICogICAoc2VlIHtAbGluayBBcnJvd1NNI2FkZFN0YXRlIGFkZFN0YXRlfS97QGxpbmsgQXJyb3dTTSNvbiBvbn0pXG4gICAgKiAgIDxicj48YnI+XG4gICAgKiAgIDxpPm5ld1N0YXRlLmVudGVyPC9pPlxuICAgICogICAoc2VlIHtAbGluayBBcnJvd1NNI2FkZFN0YXRlIGFkZFN0YXRlfS97QGxpbmsgQXJyb3dTTSNvbiBvbn0pXG4gICAgKiAgIDxicj48YnI+XG4gICAgKiAgIDxpPmdsb2JhbC5vblN3aXRjaDwvaT4gKHNlZSB7QGxpbmsgQXJyb3dTTSNvblN3aXRjaCBvblN3aXRjaH0pXG4gICAgKiAgIDxicj5cbiAgICAqICAgRmluYWxseSwgZ2xvYmFsIHRyYW5zaXRpb24gY2FsbGJhY2sgaXMgY2FsbGVkLlxuICAgICogICA8YnI+PGJyPlxuICAgICogICBPbmx5IGFmdGVyIHRoYXQgdGhlIHN0YXRlIGlzIHN3aXRjaGVkLlxuICAgICogICBFeGNlcHRpb24gaW4gYW55IG9mIHRoZSBhYm92ZSBhYm9ydHMgdGhlIHdob2xlIHRyYW5zaXRpb24uXG4gICAgKiAgIDxicj48YnI+XG4gICAgKlxuICAgICogICA8Yj5PbiByZWVudGVyYWJpbGl0eTwvYj5cbiAgICAqICAgPGJyPjxicj5cbiAgICAqXG4gICAgKiAgIFRoZSBtYWNoaW5lIGhhcyBubyB3YXkgdG8gcmVmZXJlbmNlIGl0c2VsZiwgaG93ZXZlciwgdXNpbmcgPHR0PnRoaXM8L3R0PlxuICAgICogICBtb3JlIGV2ZW50cyBtYXkgYmUgc2VudCB3aGlsZSBhIHRyYW5zaXRpb24gaXMgc3RpbGwgaW4gcHJvZ3Jlc3MuXG4gICAgKiAgIDxicj48YnI+XG4gICAgKlxuICAgICogICBJbiB0aGlzIGNhc2UsIHRoZSBuZXcgZXZlbnRzIGFyZSBxdWV1ZWQgYW5kIG9ubHkgZXhlY3V0ZWQgYWZ0ZXJcbiAgICAqICAgdGhlIG9uZ29pbmcgdHJhbnNpdGlvbiBpcyBjb21wbGV0ZS5cbiAgICAqICAgPGJyPjxicj5cbiAgICAqXG4gICAgKiAgIEluIGNhc2Ugb2YgYW4gZXhjZXB0aW9uLCB0aGUgbGFzdCBjb21wbGV0ZSB0cmFuc2l0aW9uIGJlY29tZXMgdGhlIGZpbmFsXG4gICAgKiAgICAgICBvbmUgYW5kIHRoZSBldmVudHMgaW4gcXVldWUgYXJlIHNpbXBseSBkaXNjYXJkZWQuXG4gICAgKiAgIDxicj48YnI+XG4gICAgKlxuICAgICogICBAZXhhbXBsZVxuICAgICogICBjb25zdCB0b2dnbGUgPSBuZXcgQXJyb3dTTSh7XG4gICAgKiAgICAgICB0cnVlOiAgXyA9PiBmYWxzZSxcbiAgICAqICAgICAgIGZhbHNlOiBfID0+IHRydWUsXG4gICAgKiAgIH0pXG4gICAgKiAgIC5vbiggJ2VudGVyJywgdHJ1ZSwgXyA9PiBjb25zb2xlLmxvZygnU3dpdGNoZWQgb24hJykpXG4gICAgKiAgIC5pbml0aWFsU3RhdGUoZmFsc2UpXG4gICAgKiAgIC5zdGFydCgpO1xuICAgICogICB0b2dnbGUoKTsgLy8gZmFsc2VcbiAgICAqICAgdG9nZ2xlKCdjbGljayBtZScpOyAvLyB1bmRlZmluZWQgKyBjb25zb2xlLmxvZ1xuICAgICogICB0b2dnbGUoKTsgLy8gdHJ1ZSBub3dcbiAgICAqXG4gICAgKiAgIEBwYXJhbSB7T2JqZWN0fSBbc3RhdGVNYXBdXG4gICAgKiAgIFN0YXRlIHRyYW5zaXRpb24gbWFwLlxuICAgICogICBLZXlzIGFyZSBzdGF0ZSBuYW1lcywgdmFsdWVzIGFyZSBvYmplY3RzLlxuICAgICogICBTZWUge0BsaW5rIEFycm93U00jYWRkU3RhdGUgYWRkU3RhdGV9IGZvciBzcGVjaWZpY2F0aW9uIGZvcm1hdC5cbiAgICAqL1xuICAgIGZ1bmN0aW9uIEFycm93U00oZHNsID0ge30pIHtcbiAgICAgICAgY29uc3Qgd2hlcmUgPSAnIGluIEFycm93U00gZGVmaW5lZCBhdCAnK2NhbGxlckluZm8oMSk7XG4gICAgICAgIGNvbnN0IGJsYW1lID0gbXNnID0+IHsgdGhyb3cgbmV3IEVycm9yKG1zZyt3aGVyZSk7IH07XG4gICAgICAgIGNvbnN0IHN0YWdlcyA9IFsnZGVjaWRlJywgJ2xlYXZlJywgJ2VudGVyJ107XG4gICAgICAgIGNvbnN0IHNraXAgPSBmdW5jdGlvbigpIHt9O1xuXG4gICAgICAgIGxldCBkZWZhdWx0U3RhdGU7XG4gICAgICAgIHRoaXMuc3RhdGVzID0ge307XG4gICAgICAgIHRoaXMuc3dpdGNoID0gc2tpcDtcbiAgICAgICAgdGhpcy5kZWNpZGUgPSBza2lwO1xuXG4gICAgICAgLyoqXG4gICAgICAgICogICBAbWVtYmVyT2YgQXJyb3dTTVxuICAgICAgICAqICAgQGluc3RhbmNlXG4gICAgICAgICogICBAZnVuY3Rpb24gYWRkU3RhdGVcbiAgICAgICAgKiAgIEByZXR1cm5zIHtBcnJvd1NNfSB0aGlzLCBjaGFpbmFibGVcbiAgICAgICAgKiAgIEBwYXJhbSB7QXJyb3dTTX5WYWxpZFN0YXRlfSBuYW1lXG4gICAgICAgICogICBAcGFyYW0ge09iamVjdHxBcnJvd1NNfkRlY2lkZXJ9IFtzcGVjXVxuICAgICAgICAqICAgSWYgYSBmdW5jdGlvbiBpcyBnaXZlbiwgaXQgaXMgYXNzdW1lZCB0byBiZVxuICAgICAgICAqICAgICAgIHRoZSA8dHQ+ZGVjaWRlPC90dD4gY2FsbGJhY2sgKHNlZSBiZWxvdykuXG4gICAgICAgICogICBAcGFyYW0ge0Fycm93U01+RGVjaWRlcn0gW3NwZWMuZGVjaWRlXSBSZWNlaXZlcyBldmVudCBhbmQgb2xkIHN0YXRlLFxuICAgICAgICAgICAgcmV0dXJucyBuZXcgc3RhdGUgb3IgPHR0PnVuZGVmaW5lZDwvdHQ+IGlmIG5vIHRyYW5zaXRpb24gaXMgbmVlZGVkXG4gICAgICAgICogICBAcGFyYW0ge0Fycm93U01+VHJhbnNpdGlvbn0gW3NwZWMuZW50ZXJdIEV4ZWN1dGVkIHVwb24gZW50ZXJpbmcgdGhlIHN0YXRlLlxuICAgICAgICAqICAgUmVjZWl2ZXMgZXZlbnQsIG9sZFN0YXRlLCBhbmQgbmV3U3RhdGUuXG4gICAgICAgICogICBSZXR1cm4gdmFsdWUgaXMgaWdub3JlZC5cbiAgICAgICAgKiAgIEBwYXJhbSB7QXJyb3dTTX5UcmFuc2l0aW9ufSBbc3BlYy5sZWF2ZV0gRXhlY3V0ZWQgdXBvbiBsZWF2aW5nIHRoZSBzdGF0ZS5cbiAgICAgICAgKiAgIFJlY2VpdmVzIGV2ZW50LCBvbGRTdGF0ZSwgYW5kIG5ld1N0YXRlLlxuICAgICAgICAqICAgUmV0dXJuIHZhbHVlIGlzIGlnbm9yZWQuXG4gICAgICAgICogICBAcGFyYW0ge0Jvb2xlYW59IFtzcGVjLmRlZmF1bHRdIElmIHRydWUsIHNldCB0aGlzIHN0YXRlXG4gICAgICAgICogICAgICAgYXMge0BsaW5rIEFycm93U00jaW5pdGlhbFN0YXRlIGluaXRpYWxTdGF0ZX0uXG4gICAgICAgICogICBPbmx5IG9uZSBzdGF0ZSBtYXkgYmUgdGhlIGRlZmF1bHQuXG4gICAgICAgICogICBAdGhyb3dzIFRocm93cyBpZiBzdGF0ZSBpcyBkdXBsaWNhdGUgb3Igc3BlYyBpcyB3cm9uZ1xuICAgICAgICAqICAgQGRlc2NcbiAgICAgICAgKiAgIEFkZCBhIG5ldyBzdGF0ZSB0byB0aGUgbWFjaGluZS5cbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5hZGRTdGF0ZSA9IGZ1bmN0aW9uKG5hbWUsIHNwZWM9e30pIHtcbiAgICAgICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgaW5wdXRcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygc3BlYyA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgICAgICBzcGVjID0geyBkZWNpZGU6IHNwZWMgfTtcblxuICAgICAgICAgICAgaWYgKHRoaXMuc3RhdGVzW25hbWVdKVxuICAgICAgICAgICAgICAgIGJsYW1lKCdBdHRlbXB0IHRvIHJlZGVmaW5lIHN0YXRlICcrbmFtZSk7XG5cbiAgICAgICAgICAgIGlmIChzcGVjLmRlZmF1bHQpIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdFN0YXRlICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgIGJsYW1lKCdBdHRlbXB0IHRvIHNldCBtdWx0aXBsZSBkZWZhdWx0IHN0YXRlczogJytkZWZhdWx0U3RhdGUrJyBhbmQgJytuYW1lKTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0U3RhdGUgPSBuYW1lO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLnN0YXRlc1tuYW1lXSA9IHt9O1xuICAgICAgICAgICAgZm9yKCBsZXQgaSBvZiBzdGFnZXMgKVxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVzW25hbWVdW2ldID0gc3BlY1tpXSB8fCBza2lwO1xuXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICBmb3IoIGxldCBuYW1lIGluIGRzbCApIHtcbiAgICAgICAgICAgIHRoaXMuYWRkU3RhdGUoIG5hbWUsIGRzbFtuYW1lXSApO1xuICAgICAgICB9XG5cbiAgICAgICAvKipcbiAgICAgICAgKiAgIEBtZW1iZXJPZiBBcnJvd1NNXG4gICAgICAgICogICBAaW5zdGFuY2VcbiAgICAgICAgKiAgIEByZXR1cm5zIHtBcnJvd1NNfSB0aGlzLCBjaGFpbmFibGVcbiAgICAgICAgKiAgIEBmdW5jdGlvbiBvblxuICAgICAgICAqICAgQHBhcmFtIHtTdHJpbmd9IHdoZW5cbiAgICAgICAgKiAgIFZhbGlkIHZhbHVlcyBhcmUgJ2VudGVyJywgJ2RlY2lkZScsIGFuZCAnbGVhdmUnLlxuICAgICAgICAqICAgQHBhcmFtIHtBcnJvd1NNflZhbGlkU3RhdGV9IHN0YXRlXG4gICAgICAgICogICBTdGF0ZSB0byBhcHBseSB0aGUgY2FsbGJhY2sgdG8uXG4gICAgICAgICogICBAcGFyYW0ge0Fycm93U01+RGVjaWRlcnxBcnJvd1NNflRyYW5zaXRpb259IGNhbGxiYWNrXG4gICAgICAgICogICBBY3Rpb24gdG8gZXhlY3V0ZS5cbiAgICAgICAgKiAgIEBkZXNjXG4gICAgICAgICogICBTZXQgYSBjYWxsYmFjayBmb3IgYSBwYXJ0aWN1bGFyIHN0YXRlLlxuICAgICAgICAqICAgVGhpcyBpcyBiYXNpY2FsbHkgdGhlIHNhbWUgYXMgcHJvdmlkaW5nIGNvcnJlc3BvbmRpbmcgZmllbGRzXG4gICAgICAgICogICAgICAgaW4ge0BsaW5rIEFycm93U00jYWRkU3RhdGUgYWRkU3RhdGUoKX0uXG4gICAgICAgICovXG4gICAgICAgIHRoaXMub24gPSBmdW5jdGlvbiggd2hlbiwgc3RhdGUsIGNhbGxiYWNrICkge1xuICAgICAgICAgICAgaWYgKHN0YWdlcy5pbmRleE9mKHdoZW4pID09PSAtMSlcbiAgICAgICAgICAgICAgICBibGFtZShcIklsbGVnYWwgdHJpZ2dlciBmb3Igb24oKTogXCIrd2hlbik7XG4gICAgICAgICAgICBpZiAodGhpcy5zdGF0ZXNbc3RhdGVdID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgYmxhbWUoXCJJbGxlZ2FsIHN0YXRlIG5hbWUgZm9yIG9uKCk6IFwiK3N0YXRlKTtcbiAgICAgICAgICAgIHRoaXMuc3RhdGVzW3N0YXRlXVt3aGVuXSA9IGNhbGxiYWNrO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAvKipcbiAgICAgICAgKiAgIEBtZW1iZXJPZiBBcnJvd1NNXG4gICAgICAgICogICBAaW5zdGFuY2VcbiAgICAgICAgKiAgIEByZXR1cm5zIHtBcnJvd1NNfSB0aGlzLCBjaGFpbmFibGVcbiAgICAgICAgKiAgIEBmdW5jdGlvbiBvblN3aXRjaFxuICAgICAgICAqICAgQHBhcmFtIHtBcnJvd1NNflRyYW5zaXRpb259IGNhbGxiYWNrXG4gICAgICAgICogICBAZGVzY1xuICAgICAgICAqICAgU2V0IGEgZ2xvYmFsIGNhbGxiYWNrIHRvIGJlIGV4ZWN1dGVkIDxpPmFmdGVyPC9pPlxuICAgICAgICAqICAgdGhlIHJlc3BlY3RpdmUgc3RhdGVzJyA8dHQ+ZW50ZXI8L3R0PiBhbmQgPHR0PmxlYXZlPC90dD4gY2FsbGJhY2tzLlxuICAgICAgICAqICAgQGV4YW1wbGVcbiAgICAgICAgKiAgIHNtLm9uU3dpdGNoKCAoZXZlbnQsIG9sZFN0YXRlLCBuZXdTdGF0ZSkgPT4gY29uc29sZS5sb2cob2xkU3RhdGUrJy0+JytuZXdTdGF0ZSkgKVxuICAgICAgICAqL1xuICAgICAgICB0aGlzLm9uU3dpdGNoID0gZnVuY3Rpb24oY2IpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgaW5wdXRcbiAgICAgICAgICAgIHRoaXMuc3dpdGNoID0gY2I7XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgIC8qKlxuICAgICAgICAqICAgQG1lbWJlck9mIEFycm93U01cbiAgICAgICAgKiAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgQHJldHVybnMge0Fycm93U019IHRoaXMsIGNoYWluYWJsZVxuICAgICAgICAqICAgQGZ1bmN0aW9uIG9uRGVjaWRlXG4gICAgICAgICogICBAcGFyYW0ge0Fycm93U01+RGVjaWRlcn0gY2FsbGJhY2tcbiAgICAgICAgKiAgIEBkZXNjXG4gICAgICAgICogICBTZXQgYSBnbG9iYWwgY2FsbGJhY2sgdG8gYmUgZXhlY3V0ZWQgPGk+YmVmb3JlPC9pPlxuICAgICAgICAqICAgdGhlIGN1cnJlbnQgc3RhdGUncyA8dHQ+ZGVjaWRlPC90dD4gY2FsbGJhY2suXG4gICAgICAgICogICBUaGlzIGNhbiBiZSB1c2VkIHRvIHR5cGVjaGVjayBldmVudHMsXG4gICAgICAgICogICBvciB0byBjcmVhdGUgdW5jb25kaXRpb25hbCB0cmFuc2l0aW9ucyBmcm9tIG11bHRpcGxlIHN0YXRlcy5cbiAgICAgICAgKlxuICAgICAgICAqICAgQGV4YW1wbGVcbiAgICAgICAgKiAgIC8vIHN3aXRjaCBzdGF0ZXMgYnkgaGFuZCwgdXRpbGl6aW5nIHNpZGUgZWZmZWN0cyBvZiBlbnRlci9sZWF2ZVxuICAgICAgICAqICAgY29uc3Qgc3dpdGNoZXIgPSBuZXcgQXJyb3dTTSgpXG4gICAgICAgICogICAgICAgLm9uRGVjaWRlKCB0byA9PiB0byApXG4gICAgICAgICogICAgICAgLmFkZFN0YXRlKCAnZm9vJyApXG4gICAgICAgICogICAgICAgLm9uKCAnZW50ZXInLCAnZm9vJywgZnVuY3Rpb24oKSB7IC4uLiB9ICk7XG4gICAgICAgICpcbiAgICAgICAgKiAgIEBleGFtcGxlXG4gICAgICAgICogICAvLyBkaXR0bywgYnV0IGZvcmJpZCBsb29wIHRyYW5zaXRpb246XG4gICAgICAgICogICBjb25zdCBzdGlja3lTd2l0Y2hlciA9IG5ldyBBcnJvd1NNKClcbiAgICAgICAgKiAgICAgICAub25EZWNpZGUoICh0bywgZnJvbSkgPT4gZnJvbSA9PT0gdG8gPyB1bmRlZmluZWQgOiB0byApXG4gICAgICAgICogICAgICAgLmFkZFN0YXRlKCAnZm9vJyApXG4gICAgICAgICogICAgICAgLm9uKCAnZW50ZXInLCAnZm9vJywgZnVuY3Rpb24oKSB7IC4uLiB9ICk7XG4gICAgICAgICovXG4gICAgICAgIHRoaXMub25EZWNpZGUgPSBmdW5jdGlvbihjYikge1xuICAgICAgICAgICAgLy8gVE9ETyB2YWxpZGF0ZSBpbnB1dFxuICAgICAgICAgICAgdGhpcy5kZWNpZGUgPSBjYjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgLyoqXG4gICAgICAgICogICBAbWVtYmVyT2YgQXJyb3dTTVxuICAgICAgICAqICAgQGluc3RhbmNlXG4gICAgICAgICogICBAcmV0dXJucyB7QXJyb3dTTX0gdGhpcywgY2hhaW5hYmxlXG4gICAgICAgICogICBAZnVuY3Rpb24gaW5pdGlhbFN0YXRlXG4gICAgICAgICogICBAcGFyYW0ge0Fycm93U01+VmFsaWRTdGF0ZX0gaW5pdGlhbFN0YXRlXG4gICAgICAgICogICBAdGhyb3dzIFRocm93cyBhbiBlcnJvciBpZiBubyBzdWNoIHN0YXRlIGhhcyB5ZXQgYmVlbiBkZWZpbmVkLlxuICAgICAgICAqICAgQGRlc2NcbiAgICAgICAgKiAgIFNldCB0aGUgc3RhdGUgdG8gc3RhcnQgZnJvbSBpZiB7QGxpbmsgQXJyb3dTTSNzdGFydCBzdGFydCgpfVxuICAgICAgICAqICAgaXMgY2FsbGVkIHdpdGhvdXQgYXJndW1lbnQuXG4gICAgICAgICovXG4gICAgICAgIHRoaXMuaW5pdGlhbFN0YXRlID0gZnVuY3Rpb24obmFtZSkge1xuICAgICAgICAgICAgaWYoICF0aGlzLnN0YXRlc1tuYW1lXSApXG4gICAgICAgICAgICAgICAgYmxhbWUoJ0F0dGVtcHQgdG8gc2V0IG5vbmV4aXN0ZW50IHN0YXRlIGFzIGluaXRpYWw6ICcrbmFtZSk7XG4gICAgICAgICAgICBkZWZhdWx0U3RhdGUgPSBuYW1lO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAvKipcbiAgICAgICAgKiAgIEBtZW1iZXJPZiBBcnJvd1NNXG4gICAgICAgICogICBAaW5zdGFuY2VcbiAgICAgICAgKiAgIEBmdW5jdGlvbiBzdGFydFxuICAgICAgICAqICAgQHJldHVybnMge0Fycm93U01+SW5zdGFuY2V9IHN0YXRlTWFjaGluZVxuICAgICAgICAqICAgQHBhcmFtIHtBcnJvd1NNflZhbGlkU3RhdGV9IFtpbml0aWFsU3RhdGVdXG4gICAgICAgICogICBNYXkgYmUgb21pdHRlZCBpZiB7QGxpbmsgQXJyb3dTTSNpbml0aWFsU3RhdGUgaW5pdGlhbFN0YXRlfVxuICAgICAgICAqICAgICAgIHdhcyBjYWxsZWQgYmVmb3JlLlxuICAgICAgICAqICAgQHRocm93cyBUaHJvd3MgYW4gZXJyb3IgaWYgaW5pdGlhbFN0YXRlIGlzIG5vdCBhIHZhbGlkIHN0YXRlLFxuICAgICAgICAqICAgICAgIG9yIGVudGVyaW5nIGl0IGlzIHNvbWVob3cgcHJvaGliaXRlZC5cbiAgICAgICAgKiAgIEBkZXNjXG4gICAgICAgICogICBDcmVhdGUgYW4gYWN0dWFsIHN0YXRlIG1hY2hpbmUgaW5zdGFuY2UuXG4gICAgICAgICogICBNdWx0aXBsZSBpbmRlcGVuZGVudCBpbnN0YW5jZXMgY2FuIGJlIGNyZWF0ZWRcbiAgICAgICAgKiAgICAgICBmcm9tIHRoZSBzYW1lIGJ1aWxkZXIgdGVtcGxhdGUuXG4gICAgICAgICogICBNYWNoaW5lcyBjYW4gYmUgYm91bmQgdG8gb2JqZWN0cyBhbmQvb3IgdXNlZCBhcyBtZXRob2RzLlxuICAgICAgICAqL1xuICAgICAgICB0aGlzLnN0YXJ0ID0gZnVuY3Rpb24oaW5pdGlhbFN0YXRlLCBpbml0aWFsVGFyZ2V0KSB7XG4gICAgICAgICAgICBjb25zdCBzcGVjID0gdGhpcztcbiAgICAgICAgICAgIGlmKCBpbml0aWFsU3RhdGUgPT09IHVuZGVmaW5lZCApIHtcbiAgICAgICAgICAgICAgICBpZiAoZGVmYXVsdFN0YXRlID09PSB1bmRlZmluZWQgKVxuICAgICAgICAgICAgICAgICAgICBibGFtZSgnTm8gaW5pdGlhbCBzdGF0ZSB3YXMgZ2l2ZW4nKTtcbiAgICAgICAgICAgICAgICBpbml0aWFsU3RhdGUgPSBkZWZhdWx0U3RhdGU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiggIXNwZWMuc3RhdGVzW2luaXRpYWxTdGF0ZV0gKVxuICAgICAgICAgICAgICAgIGJsYW1lKCdJbGxlZ2FsIGluaXRpYWwgc3RhdGUgJytpbml0aWFsU3RhdGUpO1xuXG4gICAgICAgICAgICBsZXQgc3RhdGU7XG5cbiAgICAgICAgICAgIC8qIEhlcmUgYW5kIGJlbG93OiB0YXJnZXQgPSBjb3B5IG9mIGB0aGlzYDtcbiAgICAgICAgICAgICAqICAgICBjYmFyZyA9IFsgZXZlbnQsIGZyb21TdGF0ZSwgdG9TdGF0ZSBdICovXG4gICAgICAgICAgICBjb25zdCBzZXRTdGF0ZSA9IGZ1bmN0aW9uKHRhcmdldCwgY2JhcmcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBuZXh0ID0gc3BlYy5zdGF0ZXNbY2JhcmdbMl1dO1xuICAgICAgICAgICAgICAgIGlmIChuZXh0ID09PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgIGJsYW1lKCdJbGxlZ2FsIHN0YXRlIGNoYW5nZSAnK3N0YXRlKyctPicrY2JhcmdbMl0pO1xuXG4gICAgICAgICAgICAgICAgaWYgKHN0YXRlICE9PSB1bmRlZmluZWQpXG4gICAgICAgICAgICAgICAgICAgIHNwZWMuc3RhdGVzW3N0YXRlXS5sZWF2ZS5hcHBseSh0YXJnZXQsIGNiYXJnKVxuICAgICAgICAgICAgICAgIC8vIFRPRE8gdHJhbnNpdGlvbiBjYWxsYmFja1xuICAgICAgICAgICAgICAgIG5leHQuZW50ZXIuYXBwbHkodGFyZ2V0LCBjYmFyZyk7XG4gICAgICAgICAgICAgICAgc3BlYy5zd2l0Y2guYXBwbHkodGFyZ2V0LCBjYmFyZyk7XG4gICAgICAgICAgICAgICAgc3RhdGUgPSBjYmFyZ1syXTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIGNvbnN0IGRlY2lkZSA9IGZ1bmN0aW9uKHRhcmdldCwgYXJnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2JhcmcgPSBbYXJnLCBzdGF0ZSwgdW5kZWZpbmVkXTtcbiAgICAgICAgICAgICAgICBjYmFyZ1syXSA9IHNwZWMuZGVjaWRlLmFwcGx5KHRhcmdldCwgY2JhcmcpO1xuICAgICAgICAgICAgICAgIGlmIChjYmFyZ1syXSA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICAgICAgY2JhcmdbMl0gPSBzcGVjLnN0YXRlc1tzdGF0ZV0uZGVjaWRlLmFwcGx5KHRhcmdldCwgY2JhcmcpO1xuICAgICAgICAgICAgICAgIGlmIChjYmFyZ1syXSAhPT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgICAgICBzZXRTdGF0ZSh0YXJnZXQsIGNiYXJnKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIHNldFN0YXRlKGluaXRpYWxUYXJnZXQsIFt1bmRlZmluZWQsIHVuZGVmaW5lZCwgaW5pdGlhbFN0YXRlXSk7XG5cbiAgICAgICAgICAgIGxldCBxdWV1ZTtcbiAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbihhcmcpIHtcbiAgICAgICAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gdGhpcztcbiAgICAgICAgICAgICAgICBpZiAocXVldWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKFt0YXJnZXQsIGFyZ10pO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgcXVldWUgPSBbW3RhcmdldCwgYXJnXV07XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFzayA9IHF1ZXVlLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWNpZGUoIHRhc2tbMF0sIHRhc2tbMV0gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XG4gICAgICAgICAgICAgICAgICAgIHF1ZXVlID0gdW5kZWZpbmVkO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gdGFyZ2V0O1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIEFycm93U007XG59KSgpO1xuXG5pZiAodHlwZW9mIG1vZHVsZSAhPT0gJ3VuZGVmaW5lZCcgJiYgbW9kdWxlICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcgKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBBcnJvd1NNO1xufVxuIiwiXG5cbi8qIERldGVybWluZSBuLXRoIGNhbGxlciB1cCB0aGUgc3RhY2sgKi9cbi8qIEluc3BpcmVkIGJ5IFBlcmwncyBDYXJwIG1vZHVsZSAqL1xuZnVuY3Rpb24gY2FsbGVySW5mbyhuKSB7XG4gICAgLyogYSB0ZXJyaWJsZSByZXggdGhhdCBiYXNpY2FsbHkgc2VhcmNoZXMgZm9yIGZpbGUuanM6bm5uOm5ubiBzZXZlcmFsIHRpbWVzKi9cbiAgICBjb25zdCBpblN0YWNrID0gLyhbXjpcXHNdKzpcXGQrKD86OlxcZCspPylcXFcqKFxcbnwkKS9nO1xuICAgIHJldHVybiAobmV3IEVycm9yKCkuc3RhY2subWF0Y2goaW5TdGFjaylbbisxXSB8fCAnJylcbiAgICAgICAgLnJlcGxhY2UoL1teL1xcd10qLywgJycpLnJlcGxhY2UoL1xcRCokLywnJyk7XG59XG5cbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiBtb2R1bGUgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzICE9PSAndW5kZWZpbmVkJyApIHtcbiAgICBtb2R1bGUuZXhwb3J0cyA9IGNhbGxlckluZm87XG59XG5cbiIsIi8qXG4gKiAganJuYS5qcyAtIGludGVyYWN0aXZlIHN0YXRlZnVsIFVJIHdpZGdldHNcbiAqL1xuXG5jb25zdCBqUm5hID0gKGZ1bmN0aW9uKCl7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICAvKlxuICAgIEZpcnN0IG9mIGFsbCwgc29tZSBtYWNyb3MgZm9yIGpzZG9jIGJlY2F1c2UgaXQncyB0b28gYm9yaW5nIHRvIHdyaXRlIGl0IGV2ZXJ5IHRpbWVcblxuICAgIEBtYWNybyBvbmVvZlxuICAgICAgICBvbmUgb2Yge0BsaW5rIGpSbmEjYXR0YWNoIGF0dGFjaH0sIHtAbGluayBqUm5hI2FwcGVuZFRvIGFwcGVuZFRvfSxcbiAgICAgICAgb3Ige0BsaW5rIGpSbmEjaW5zdGFudGlhdGUgaW5zdGFudGlhdGV9XG4gICAgQGVuZCBvbmVvZlxuXG4gICAgQG1hY3JvIG11dGF0b3IgbmFtZVxuICAgICAgICBAZnVuY3Rpb24gJShuYW1lKVxuICAgICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICBAaW5zdGFuY2VcbiAgICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICBAZW5kIG11dGF0b3JcblxuICAgIEBtYWNybyBpZFxuICAgICAgICBAcGFyYW0ge3N0cmluZ30gcmVjZXB0b3JcbiAgICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICBAZW5kIGlkXG5cbiAgICBAbWFjcm8gcmVjZXB0b3JcbiAgICAgICAgQHBhcmFtIHtzdHJpbmd8QXJyYXl9IHJlY2VwdG9yXG4gICAgICAgIEEganJuYS1wcmVmaXhlZCBjbGFzcyBpbiB0aGUgRE9NXG4gICAgICAgIGFuZCB0aGUgbmFtZSBvZiB0aGUgY29ycmVzcG9uZGluZyBwcm9wZXJ0eSBpbiB0aGUgalJuYSBpbnN0YW5jZS5cbiAgICAgICAgVXNlIGEgMi1lbGVtZW50IGFycmF5IGlmIGRpZmZlcmVudCBuYW1lcyBhcmUgbmVlZGVkLlxuICAgIEBlbmQgcmVjZXB0b3JcblxuICAgIEBtYWNybyBjdXJyeWNiIG5hbWUgYXJncyB3aGVuXG4gICAgICAgIEBwYXJhbSB7ZnVuY3Rpb258c3RyaW5nfEFycmF5fSAlKG5hbWUpXG4gICAgICAgIFJ1biA8dHQ+JShuYW1lKSglKGFyZ3MpKTwvdHQ+ICUod2hlbikuXG4gICAgICAgIDx0dD50aGlzPC90dD4gaXMgc2V0IHRvIGN1cnJlbnQgPGk+alJuYSBpbnN0YW5jZTwvaT4uXG4gICAgICAgIEEgbWV0aG9kIG5hbWUgbWF5IGJlIHVzZWQgaW5zdGVhZCBvZiBmdW5jdGlvbi5cbiAgICAgICAgQW4gQXJyYXkgbWF5IGJlIHVzZWQgY29udGFpbmluZyBhbnkgb2YgdGhlIGFib3ZlXG4gICAgICAgIHBsdXMgc29tZSBhZGRpdGlvbmFsIHZhbHVlcyB0byBiZSBwcmVwZW5kZWQgdG8gdGhlIGFyZ3VtZW50IGxpc3QuXG4gICAgQGVuZCBjdXJyeWNiXG5cbiAgICAqL1xuXG4gICAgLy8gZmlyc3QgY2hlY2sgZm9yICRcbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiZcbiAgICAgICAgKHR5cGVvZiB3aW5kb3cuJCAhPT0gJ2Z1bmN0aW9uJyB8fCB0eXBlb2Ygd2luZG93LmRvY3VtZW50ID09PSAndW5kZWZpbmVkJykpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2pSbmE6IHJlZnVzaW5nIHRvIHJ1biB3aXRob3V0IGEgd2luZG93LiQgYW5kIHdpbmRvdy5kb2N1bWVudCcpO1xuXG4gICAgY29uc3QgY2FsbGVySW5mbyA9IHJlcXVpcmUoJy4vZGVwL2NhbGxlci1pbmZvLmpzJyk7XG4gICAgY29uc3QgQXJyb3dTTSAgICA9IHJlcXVpcmUoJy4vZGVwL2Fycm93LXNtLmpzJyk7XG5cbiAgICAvKipcbiAgICAqICAgalJuYSBpcyBhbiBhcHBsaWNhdGlvbiBidWlsZGluZyBibG9jayB0aGF0IG1hcHMgaXRzIGludGVybmFsIHN0YXRlXG4gICAgKiAgIG9udG8gYSBET00gc3VidHJlZS5cbiAgICAqXG4gICAgKiAgIFRvIGFjdHVhbGx5IGJlY29tZSBlZmZlY3RmdWwsIGl0IG11c3QgYmUgaW5zdGFuY2lhdGVkIHdpdGhcbiAgICAqICAgQG9uZW9mXG4gICAgKiAgICAgICBvbmUgb2Yge0BsaW5rIGpSbmEjYXR0YWNoIGF0dGFjaH0sIHtAbGluayBqUm5hI2FwcGVuZFRvIGFwcGVuZFRvfSxcbiAgICAqICAgICAgIG9yIHtAbGluayBqUm5hI2luc3RhbnRpYXRlIGluc3RhbnRpYXRlfVxuICAgICogICBAZW5kIG9uZW9mXG4gICAgKiAgIG1ldGhvZHMuXG4gICAgKlxuICAgICogICBAY29uc3RydWN0b3JcbiAgICAqICAgQHRoaXMge2pSbmF9XG4gICAgKi9cbiAgICBmdW5jdGlvbiBqUm5hICgpIHtcbiAgICAgICAgLy8gYG9yaWdpbmAgaXMgdGhlIHBsYWNlIHdoZXJlIGBuZXcgalJuYSgpYCB3YXMgY2FsbGVkIGZvciBnaXZlbiBpbnN0YW5jZS5cbiAgICAgICAgLy8gYGJsYW1lYCB0aHJvd3MgZXJyb3IgYnV0IGFsc28gcG9pbnRzIG91dCB3aGVyZSB0aGUgZGVmaW5pdGlvbiB3YXMuXG4gICAgICAgIC8vIFRoaXMgaWRlYSB3YXMgbW9zdGx5IHN0b2xlbiBmcm9tIFBlcmwncyBDYXJwIG1vZHVsZS5cbiAgICAgICAgY29uc3Qgb3JpZ2luID0gdGhpcy5vcmlnaW4gPSBjYWxsZXJJbmZvKDEpO1xuICAgICAgICBjb25zdCBibGFtZSAgPSBmdW5jdGlvbihlcnJvcikge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCBlcnJvciArIFwiIC0galJuYUBcIitvcmlnaW4gKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBVc2UgYnJvd3NlciB0byBwYXJzZSBIVE1MLlxuICAgICAgICBjb25zdCBwYXJzZUhUTUwgPSBmdW5jdGlvbihzdHIpIHtcbiAgICAgICAgICAgIGNvbnN0IGZha2VIVE1MID0gd2luZG93LmRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgICAgICAgZmFrZUhUTUwuc2V0QXR0cmlidXRlKCAnc3R5bGUnLCAnZGlzcGxheTogbm9uZScgKTtcbiAgICAgICAgICAgIGZha2VIVE1MLmlubmVySFRNTCA9IHN0cjtcbiAgICAgICAgICAgIGlmICghZmFrZUhUTUwuZmlyc3RDaGlsZClcbiAgICAgICAgICAgICAgICBibGFtZShcIkF0dGVtcHQgdG8gdXNlIGVtcHR5IEhUTUxcIik7XG4gICAgICAgICAgICBpZiAoZmFrZUhUTUwuZmlyc3RDaGlsZC5ub2RlVHlwZSAhPT0gMSkge1xuICAgICAgICAgICAgICAgIGJsYW1lKFwiQXR0ZW1wdCB0byB1c2Ugbm9uLWVsZW1lbnQgYXMgSFRNTCBjb250YWluZXJcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZmFrZUhUTUwuZmlyc3RDaGlsZCAhPT0gZmFrZUhUTUwubGFzdENoaWxkKSB7XG4gICAgICAgICAgICAgICAgYmxhbWUoXCJBdHRlbXB0IHRvIGNyZWF0ZSBtdWx0aXBsZSB0YWcgSFRNTFwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBmYWtlSFRNTC5maXJzdENoaWxkO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGxvY2tOYW1lKCdmb28nKSAtIHByZXZlbnQgdXNpbmcgdGhlIG5hbWUgYWdhaW5cbiAgICAgICAgLy8gVGhpcyBpcyBpbnRlcm5hbCBmdW5jdGlvblxuICAgICAgICB0aGlzLl9rbm93biA9IHt9O1xuICAgICAgICBmb3IgKGxldCBpIG9mIFsgJ2FwcGVuZFRvJywgJ2NvbnRhaW5lcicsICdlbGVtZW50JywgJ2lkJywgJ29uQXR0YWNoJywgJ29uUmVtb3ZlJywgJ3JlbW92ZScgXSlcbiAgICAgICAgICAgIHRoaXMuX2tub3duW2ldID0gdHJ1ZTtcbiAgICAgICAgdGhpcy5sb2NrTmFtZSA9IGZ1bmN0aW9uIChuYW1lLCBzaGFyZWQpIHtcbiAgICAgICAgICAgIGlmICh0aGlzLl9rbm93bltuYW1lXSAmJiB0aGlzLl9rbm93bltuYW1lXSAhPT0gc2hhcmVkKSB7XG4gICAgICAgICAgICAgICAgYmxhbWUoIFwiUHJvcGVydHkgbmFtZSBhbHJlYWR5IGluIHVzZTogXCIrbmFtZSApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5fa25vd25bbmFtZV0gPSBzaGFyZWQgfHwgdHJ1ZTtcbiAgICAgICAgfTtcbiAgICAgICAgY29uc3QgaXNNZXRob2QgPSB7fTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiAgU2V0IGluLW1lbW9yeSBIVE1MIHNuaXBwZXQgdG8gYXR0YWNoIHRvLlxuICAgICAgICAqXG4gICAgICAgICogIEBtdXRhdG9yIGh0bWxcbiAgICAgICAgKiAgICAgIEBmdW5jdGlvbiBodG1sXG4gICAgICAgICogICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICBAcmV0dXJucyB7alJuYX0gPHR0PnRoaXM8L3R0PiAoY2hhaW5hYmxlKVxuICAgICAgICAqICBAZW5kIG11dGF0b3JcbiAgICAgICAgKiAgQHBhcmFtIHtzdHJpbmd9IGh0bWwgLSBtdXN0IGNvbnRhaW4gZXhhY3RseSBvbmUgcm9vdCBub2RlXG4gICAgICAgICovXG4gICAgICAgIHRoaXMuaHRtbCA9IGZ1bmN0aW9uKCBodG1sICkge1xuICAgICAgICAgICAgaWYgKGh0bWwgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBwYXJzZUhUTUwoIGh0bWwgKTtcbiAgICAgICAgICAgICAgICB0aGlzLl9tYXN0ZXIgPSBlbGVtZW50O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB0aGlzLl9tYXN0ZXIgPSB1bmRlZmluZWQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiAgRmV0Y2ggSFRNTCBzbmlwcGV0IGZyb20gdGhlIGRvY3VtZW50IGl0c2VsZi5cbiAgICAgICAgKiAgVHlwaWNhbGx5IHN1Y2ggc25pcHBldHMgc2hvdWxkIHJlc2lkZSB3aXRoaW4gYSBoaWRkZW4gYmxvY2suXG4gICAgICAgICpcbiAgICAgICAgKiAgQG11dGF0b3IgaHRtbEZyb21cbiAgICAgICAgKiAgICAgIEBmdW5jdGlvbiBodG1sRnJvbVxuICAgICAgICAqICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogIEBwYXJhbSB7c3RyaW5nfGpRdWVyeX0gc2VsZWN0b3IgLSB3aGVyZSB0byBzZWFyY2ggZm9yIHRoZSByb290IGVsZW1lbnRcbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5odG1sRnJvbSA9IGZ1bmN0aW9uKHNlbGVjdG9yKSB7XG4gICAgICAgICAgICBzZWxlY3RvciA9IHRoaXMuY2hlY2tFbGVtZW50KHNlbGVjdG9yLCBcImdldCBIVE1MIGZyb21cIik7XG4gICAgICAgICAgICB0aGlzLmh0bWwoIHNlbGVjdG9yWzBdLm91dGVySFRNTCApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3Qgbm9BcmdzID0ge31cbiAgICAgICAgZm9yIChsZXQgaSBpbiB0aGlzLl9rbm93bilcbiAgICAgICAgICAgIG5vQXJnc1tpXSA9IHRydWU7XG4gICAgICAgIGNvbnN0IGFsbG93QXJncyA9IHsgaWQgOiB0cnVlIH07XG4gICAgICAgIGNvbnN0IGFzc2lnbkFyZ3MgPSB7IGlkIDogdHJ1ZSB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqICBBZGQgb25lIGFsbG93ZWQgYXJndW1lbnQgd2l0aCBmaW5lLWdyYWluZWQgY29udHJvbCBmb3JcbiAgICAgICAgKiAgQG9uZW9mXG4gICAgICAgICogICAgICBvbmUgb2Yge0BsaW5rIGpSbmEjYXR0YWNoIGF0dGFjaH0sIHtAbGluayBqUm5hI2FwcGVuZFRvIGFwcGVuZFRvfSxcbiAgICAgICAgKiAgICAgIG9yIHtAbGluayBqUm5hI2luc3RhbnRpYXRlIGluc3RhbnRpYXRlfVxuICAgICAgICAqICBAZW5kIG9uZW9mXG4gICAgICAgICpcbiAgICAgICAgKiAgQG11dGF0b3IgYWRkQXJndW1lbnRcbiAgICAgICAgKiAgICAgIEBmdW5jdGlvbiBhZGRBcmd1bWVudFxuICAgICAgICAqICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIGFyZ3VtZW50XG4gICAgICAgICogIEBwYXJhbSB7T2JqZWN0fSBzcGVjXG4gICAgICAgICogIHsgYXNzaWduOiB0cnVlIHwgZmFsc2UgfSAtIHdoZXRoZXIgdG8gdHJ5IGFzc2lnbmluZyB0aGlzIGFyZ3VtZW50XG4gICAgICAgICogIHRvIGVwb255bW91cyBwcm9wZXJ0eVxuICAgICAgICAqL1xuICAgICAgICB0aGlzLmFkZEFyZ3VtZW50ID0gZnVuY3Rpb24oIG5hbWUsIHNwZWM9e30gKSB7XG4gICAgICAgICAgICBpZiAoc3BlYy5mb3JiaWRkZW4pIHtcbiAgICAgICAgICAgICAgICAvLyBzcGVjaWFsIGNhc2VcbiAgICAgICAgICAgICAgICBpZiAoYWxsb3dBcmdzW25hbWVdKVxuICAgICAgICAgICAgICAgICAgICBibGFtZSggJ0ZvcmJpZGRlbiBhcmd1bWVudCBuYW1lOiAnK25hbWUgKTtcbiAgICAgICAgICAgICAgICBub0FyZ3NbbmFtZV0gPSB0cnVlO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAobm9BcmdzW25hbWVdKVxuICAgICAgICAgICAgICAgIGJsYW1lKCAnRm9yYmlkZGVuIGFyZ3VtZW50IG5hbWU6ICcrbmFtZSApO1xuICAgICAgICAgICAgYWxsb3dBcmdzIFtuYW1lXSA9IHRydWU7XG4gICAgICAgICAgICBhc3NpZ25BcmdzW25hbWVdID0gc3BlYy5hc3NpZ247XG4gICAgICAgICAgICAvLyBUT0RPIG1vcmUgZmFuY3kgc3R1ZmZcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqICBTcGVjaWZ5IG9uZSBvciBtb3JlIG9wdGlvbmFsIGFyZ3VtZW50IGtleXMgZm9yXG4gICAgICAgICogIEBvbmVvZlxuICAgICAgICAqICAgICAgb25lIG9mIHtAbGluayBqUm5hI2F0dGFjaCBhdHRhY2h9LCB7QGxpbmsgalJuYSNhcHBlbmRUbyBhcHBlbmRUb30sXG4gICAgICAgICogICAgICBvciB7QGxpbmsgalJuYSNpbnN0YW50aWF0ZSBpbnN0YW50aWF0ZX1cbiAgICAgICAgKiAgQGVuZCBvbmVvZlxuICAgICAgICAqICBtZXRob2RzLlxuICAgICAgICAqICBNYXkgYmUgY2FsbGVkIG1vcmUgdGhhbiBvbmNlLlxuICAgICAgICAqICBCeSBkZWZhdWx0LCBvbmx5ICdpZCcgYXJndW1lbnQgaXMgYWxsb3dlZC5cbiAgICAgICAgKlxuICAgICAgICAqICBAbXV0YXRvciBhcmdzXG4gICAgICAgICogICAgICBAZnVuY3Rpb24gYXJnc1xuICAgICAgICAqICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogIEBwYXJhbSB7Li4uc3RyaW5nfSBhcmd1bWVudE5hbWUgLSBsaXN0IG9mIGFsbG93ZWQgYXJndW1lbnRzXG4gICAgICAgICovXG4gICAgICAgIHRoaXMuYXJncyA9IGZ1bmN0aW9uKC4uLmxpc3QpIHtcbiAgICAgICAgICAgIC8vIFRPRE8gdGhpbmsgYWJvdXQgcmVxdWlyZWQgYXJncyAmIHR5cGUgY2hlY2tzXG4gICAgICAgICAgICBmb3IoIGxldCBpIG9mIGxpc3QgKVxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQXJndW1lbnQoIGksIHsgYXNzaWduOiB0cnVlIH0gKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqICBVcG9uIDxpPmJpbmRpbmc8L2k+LCBsb2NhdGUgZWxlbWVudCB3aXRoIHJlY2VwdG9yIGNsYXNzXG4gICAgICAgICogIGFuZCBleGVjdXRlIGNhbGxiYWNrIG9uIGl0IGFuZCB0aGUgbmV3bHkgY3JlYXRlZCBpbnN0YW5jZS5cbiAgICAgICAgKlxuICAgICAgICAqICBQbGVhc2Ugc2VyaW91c2x5IGNvbnNpZGVyIHNlbmRpbmcgYSBidWcgcmVwb3J0IGlmIHlvdSBldmVyIG5lZWRcbiAgICAgICAgKiAgdG8gY2FsbCB0aGlzIGRpcmVjdGx5LlxuICAgICAgICAqXG4gICAgICAgICogIEBtdXRhdG9yIHNldHVwXG4gICAgICAgICogICAgICBAZnVuY3Rpb24gc2V0dXBcbiAgICAgICAgKiAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogIEBlbmQgbXV0YXRvclxuICAgICAgICAqICBAaWRcbiAgICAgICAgKiAgICAgIEBwYXJhbSB7c3RyaW5nfSByZWNlcHRvclxuICAgICAgICAqICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgKiAgQGVuZCBpZFxuICAgICAgICAqICBAcGFyYW0ge2Z1bmN0aW9ufSBhY3Rpb25cbiAgICAgICAgKiAgQ2FsbCBhY3Rpb24oIGluc3RhbmNlLCBlbGVtZW50ICkgd2hpbGUgdGhlIGJvdW5kIGpSbmEgaW5zdGFuY2VcbiAgICAgICAgKiAgaXMgYmVpbmcgY3JlYXRlZC4gTm90ZSA8dHQ+dGhpczwvdHQ+IGlzIDxpPm5vdDwvaT4gc2V0LlxuICAgICAgICAqL1xuICAgICAgICB0aGlzLl9zZXR1cCA9IFtdO1xuICAgICAgICB0aGlzLl93YW50ZWQgPSB7fTtcbiAgICAgICAgdGhpcy5zZXR1cCA9IGZ1bmN0aW9uKCBpZCwgYWN0aW9uICkge1xuICAgICAgICAgICAgdGhpcy5fc2V0dXAucHVzaCggW2lkLCBhY3Rpb24gXSApO1xuICAgICAgICAgICAgdGhpcy5fd2FudGVkWyBqUm5hLnByZWZpeCArIGlkIF0gPSBpZDtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHVuaWZ5IGNhbGxiYWNrczpcbiAgICAgICAgLy8gZnVuY3Rpb24gPT4gaXRzZWxmXG4gICAgICAgIC8vIHN0cmluZyAgID0+IGluc3RhbmNlIG1ldGhvZFxuICAgICAgICAvLyBbIGZ1bmN0aW9ufHN0cmluZywgLi4uYXJncyBdID0+IGZ1Y250aW9uKCBhcmdzLCAuLi4gKSAvLyBjdXJyeSFcbiAgICAgICAgLy8gb3RoZXJ3aXNlIHRocm93XG4gICAgICAgIGNvbnN0IGN1cnJ5ID0gZnVuY3Rpb24oaXRlbSwgc3BlYykge1xuICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHNwZWMpKVxuICAgICAgICAgICAgICAgIHNwZWMgPSBbIHNwZWMgXTtcbiAgICAgICAgICAgIGNvbnN0IFt0b2RvLCAuLi5wcmVhcmdzXSA9IHNwZWM7XG5cbiAgICAgICAgICAgIC8vIG5hbWVkIG1ldGhvZCAtIFRPRE8gd3JpdGUgbW9yZSBlZmZpY2llbnQgY29kZVxuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2RvID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtW3RvZG9dLmFwcGx5KCBpdGVtLCBwcmVhcmdzLmNvbmNhdChhcmdzKSApO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG5vcm1hbCBmdW5jdGlvbiB3aXRoIHByZWFyZ3NcbiAgICAgICAgICAgIGlmIChwcmVhcmdzLmxlbmd0aCAmJiB0eXBlb2YgdG9kbyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIHJldHVybiBmdW5jdGlvbiguLi5hcmdzKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0b2RvLmFwcGx5KCBpdGVtLCBwcmVhcmdzLmNvbmNhdChhcmdzKSApO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIG5vcm1hbCBmdW5jdGlvblxuICAgICAgICAgICAgLy8gVE9ETyBkZXRlY3QgYWxyZWFkeSBib3VuZCBmdW5jdGlvbnMgJiB0aHJvd1xuICAgICAgICAgICAgaWYgKHR5cGVvZiB0b2RvID09PSAnZnVuY3Rpb24nKVxuICAgICAgICAgICAgICAgIHJldHVybiB0b2RvLmJpbmQoaXRlbSk7XG5cbiAgICAgICAgICAgIC8vIGZpbmFsbHkgLSBkb24ndCBrbm93IHdoYXQgdXNlciB3YW50c1xuICAgICAgICAgICAgYmxhbWUoICdVbmV4cGVjdGVkIGNhbGxiYWNrIGFyZ3VtZW50JyApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqICAgIENyZWF0ZSBhIHdyaXRhYmxlIHByb3BlcnR5LiBVcGRhdGUgd2lsbCB0cmlnZ2VyIHNldHRpbmcgdGhlIHRleHRcbiAgICAgICAgKiAgICBjb250ZW50IG9mIHRoZSBhZmZlY3RlZCBET00gZWxlbWVudC5cbiAgICAgICAgKiAgICBAbXV0YXRvciBvdXRwdXRcbiAgICAgICAgKiAgICAgICAgQGZ1bmN0aW9uIG91dHB1dFxuICAgICAgICAqICAgICAgICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICAgICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgICBAZW5kIG11dGF0b3JcbiAgICAgICAgKiAgICBAcmVjZXB0b3JcbiAgICAgICAgKiAgICAgICAgQHBhcmFtIHtzdHJpbmd8QXJyYXl9IHJlY2VwdG9yXG4gICAgICAgICogICAgICAgIEEganJuYS1wcmVmaXhlZCBjbGFzcyBpbiB0aGUgRE9NXG4gICAgICAgICogICAgICAgIGFuZCB0aGUgbmFtZSBvZiB0aGUgY29ycmVzcG9uZGluZyBwcm9wZXJ0eSBpbiB0aGUgalJuYSBpbnN0YW5jZS5cbiAgICAgICAgKiAgICAgICAgVXNlIGEgMi1lbGVtZW50IGFycmF5IGlmIGRpZmZlcmVudCBuYW1lcyBhcmUgbmVlZGVkLlxuICAgICAgICAqICAgIEBlbmQgcmVjZXB0b3JcbiAgICAgICAgKi9cblxuICAgICAgICB0aGlzLm91dHB1dCA9IGZ1bmN0aW9uKCByZWNlcHRvciApIHtcbiAgICAgICAgICAgIGNvbnN0IFtpZCwgbmFtZV0gPSBqUm5hLnBhcnNlSWQoIHJlY2VwdG9yICk7XG4gICAgICAgICAgICB0aGlzLmxvY2tOYW1lKG5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0dXAoIGlkLCBmdW5jdGlvbiAoIGluc3QsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICAgICAgbGV0IHZhbHVlO1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpbnN0LCBuYW1lLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHNldDogZnVuY3Rpb24obmV3dmFsKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBlbGVtZW50LnRleHQodmFsdWUgPSBuZXd2YWwpO1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9ICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICogICAgQ3JlYXRlIGEgd3JpdGFibGUgcHJvcGVydHkuXG4gICAgICAgICogICAgT24gdXBkYXRlLCB0aGUgaW5uZXJIVE1MIG9mIGFmZmVjdGVkIGVsZW1lbnQgd2lsbCBiZSBzZXQuXG4gICAgICAgICogICAgTm8gY2hlY2tzIGFyZSBtYWRlIHdoYXRzb2V2ZXIuXG4gICAgICAgICogICAgQG11dGF0b3IgcmF3T3V0cHV0XG4gICAgICAgICogICAgICAgIEBmdW5jdGlvbiByYXdPdXRwdXRcbiAgICAgICAgKiAgICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICAgIEByZXR1cm5zIHtqUm5hfSA8dHQ+dGhpczwvdHQ+IChjaGFpbmFibGUpXG4gICAgICAgICogICAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogICAgQHJlY2VwdG9yXG4gICAgICAgICogICAgICAgIEBwYXJhbSB7c3RyaW5nfEFycmF5fSByZWNlcHRvclxuICAgICAgICAqICAgICAgICBBIGpybmEtcHJlZml4ZWQgY2xhc3MgaW4gdGhlIERPTVxuICAgICAgICAqICAgICAgICBhbmQgdGhlIG5hbWUgb2YgdGhlIGNvcnJlc3BvbmRpbmcgcHJvcGVydHkgaW4gdGhlIGpSbmEgaW5zdGFuY2UuXG4gICAgICAgICogICAgICAgIFVzZSBhIDItZWxlbWVudCBhcnJheSBpZiBkaWZmZXJlbnQgbmFtZXMgYXJlIG5lZWRlZC5cbiAgICAgICAgKiAgICBAZW5kIHJlY2VwdG9yXG4gICAgICAgICovXG4gICAgICAgIHRoaXMucmF3T3V0cHV0ID0gZnVuY3Rpb24oIHJlY2VwdG9yICkge1xuICAgICAgICAgICAgY29uc3QgW2lkLCBuYW1lXSA9IGpSbmEucGFyc2VJZCggcmVjZXB0b3IgKTtcbiAgICAgICAgICAgIHRoaXMubG9ja05hbWUobmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXR1cCggaWQsIGZ1bmN0aW9uICggaW5zdCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgICAgICBsZXQgdmFsdWU7XG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGluc3QsIG5hbWUsIHtcbiAgICAgICAgICAgICAgICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbihuZXd2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQuaHRtbCggdmFsdWUgPSBuZXd2YWwgKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAqICAgIENyZWF0ZSBhIHdyaXRhYmxlIHByb3BlcnR5XG4gICAgICAgICogICAgd2hvc2UgdmFsdWUgaXMgZXF1YWwgdG8gYWZmZWN0ZWQgZWxlbWVudCdzIHZhbCgpXG4gICAgICAgICogICAgKHNlZSB2YWwoKSBpbiBqUXVlcnkpLlxuICAgICAgICAqXG4gICAgICAgICogICAgQG11dGF0b3IgaW5wdXRcbiAgICAgICAgKiAgICAgICAgQGZ1bmN0aW9uIGlucHV0XG4gICAgICAgICogICAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgICBAcmV0dXJucyB7alJuYX0gPHR0PnRoaXM8L3R0PiAoY2hhaW5hYmxlKVxuICAgICAgICAqICAgIEBlbmQgbXV0YXRvclxuICAgICAgICAqICAgIEByZWNlcHRvclxuICAgICAgICAqICAgICAgICBAcGFyYW0ge3N0cmluZ3xBcnJheX0gcmVjZXB0b3JcbiAgICAgICAgKiAgICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgKiAgICAgICAgYW5kIHRoZSBuYW1lIG9mIHRoZSBjb3JyZXNwb25kaW5nIHByb3BlcnR5IGluIHRoZSBqUm5hIGluc3RhbmNlLlxuICAgICAgICAqICAgICAgICBVc2UgYSAyLWVsZW1lbnQgYXJyYXkgaWYgZGlmZmVyZW50IG5hbWVzIGFyZSBuZWVkZWQuXG4gICAgICAgICogICAgQGVuZCByZWNlcHRvclxuICAgICAgICAqL1xuICAgICAgICB0aGlzLmlucHV0ID0gZnVuY3Rpb24oIHJlY2VwdG9yICkge1xuICAgICAgICAgICAgY29uc3QgW2lkLCBuYW1lXSA9IGpSbmEucGFyc2VJZCggcmVjZXB0b3IgKTtcbiAgICAgICAgICAgIHRoaXMubG9ja05hbWUobmFtZSk7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZXR1cCggaWQsIGZ1bmN0aW9uKCBpbnN0LCBlbGVtZW50ICkge1xuICAgICAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShpbnN0LCBuYW1lLCB7XG4gICAgICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZWxlbWVudC52YWwoKTtcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbihuZXd2YWwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsZW1lbnQudmFsKG5ld3ZhbCk7XG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gKTtcbiAgICAgICAgfTtcbiAgICAgICAgLyoqXG4gICAgICAgICogICBBZGQgYSBjbGljayBoYW5kbGVyLlxuICAgICAgICAqXG4gICAgICAgICogICBAbXV0YXRvciBjbGlja1xuICAgICAgICAqICAgICAgIEBmdW5jdGlvbiBjbGlja1xuICAgICAgICAqICAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgIEBlbmQgbXV0YXRvclxuICAgICAgICAqXG4gICAgICAgICogICBAcGFyYW0ge3N0cmluZ30gaWQgLSB0aGUganJuYS1wcmVmaXhlZCBjbGFzcyBvZiB0aGUgZWxlbWVudCB0byB3b3JrIG9uXG4gICAgICAgICpcbiAgICAgICAgKiAgIEBjdXJyeWNiIGNhbGxiYWNrIGNsaWNrRXZlbnQgXCJ3aGVuIHRoZSBlbGVtZW50IGlzIGNsaWNrZWRcIlxuICAgICAgICAqICAgICAgIEBwYXJhbSB7ZnVuY3Rpb258c3RyaW5nfEFycmF5fSBjYWxsYmFja1xuICAgICAgICAqICAgICAgIFJ1biA8dHQ+Y2FsbGJhY2soY2xpY2tFdmVudCk8L3R0PiB3aGVuIHRoZSBlbGVtZW50IGlzIGNsaWNrZWQuXG4gICAgICAgICogICAgICAgPHR0PnRoaXM8L3R0PiBpcyBzZXQgdG8gY3VycmVudCA8aT5qUm5hIGluc3RhbmNlPC9pPi5cbiAgICAgICAgKiAgICAgICBBIG1ldGhvZCBuYW1lIG1heSBiZSB1c2VkIGluc3RlYWQgb2YgZnVuY3Rpb24uXG4gICAgICAgICogICAgICAgQW4gQXJyYXkgbWF5IGJlIHVzZWQgY29udGFpbmluZyBhbnkgb2YgdGhlIGFib3ZlXG4gICAgICAgICogICAgICAgcGx1cyBzb21lIGFkZGl0aW9uYWwgdmFsdWVzIHRvIGJlIHByZXBlbmRlZCB0byB0aGUgYXJndW1lbnQgbGlzdC5cbiAgICAgICAgKiAgIEBlbmQgY3VycnljYlxuICAgICAgICAqL1xuICAgICAgICB0aGlzLmNsaWNrID0gZnVuY3Rpb24oIGlkLCBjYiApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNldHVwKCBpZCwgZnVuY3Rpb24oIGluc3QsIGVsZW1lbnQgKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYm91bmQgPSBjdXJyeSggaW5zdCwgY2IgKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCAnY2xpY2snLCBmdW5jdGlvbiAoZXYpIHsgYm91bmQoZXYpOyByZXR1cm4gZmFsc2U7IH0gKTtcbiAgICAgICAgICAgIH0gKTtcbiAgICAgICAgfTtcbiAgICAgICAgLyoqXG4gICAgICAgICogICBBbHRlcm5hdGUgYmV0d2VlbiB0d28gY2FsbGJhY2tzIHdoZW4gZWxlbWVudCBpcyBjbGlja2VkLlxuICAgICAgICAqXG4gICAgICAgICogICBAbXV0YXRvciB0b2dnbGVcbiAgICAgICAgKiAgICAgICBAZnVuY3Rpb24gdG9nZ2xlXG4gICAgICAgICogICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgICBAaW5zdGFuY2VcbiAgICAgICAgKiAgICAgICBAcmV0dXJucyB7alJuYX0gPHR0PnRoaXM8L3R0PiAoY2hhaW5hYmxlKVxuICAgICAgICAqICAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogICBAaWRcbiAgICAgICAgKiAgICAgICBAcGFyYW0ge3N0cmluZ30gcmVjZXB0b3JcbiAgICAgICAgKiAgICAgICBBIGpybmEtcHJlZml4ZWQgY2xhc3MgaW4gdGhlIERPTVxuICAgICAgICAqICAgQGVuZCBpZFxuICAgICAgICAqICAgQGN1cnJ5Y2IgY2FsbGJhY2tPbiBjbGlja0V2ZW50IFwib24gMXN0LCAzcmQsIGV0YyBjbGlja3NcIlxuICAgICAgICAqICAgICAgIEBwYXJhbSB7ZnVuY3Rpb258c3RyaW5nfEFycmF5fSBjYWxsYmFja09uXG4gICAgICAgICogICAgICAgUnVuIDx0dD5jYWxsYmFja09uKGNsaWNrRXZlbnQpPC90dD4gb24gMXN0LCAzcmQsIGV0YyBjbGlja3MuXG4gICAgICAgICogICAgICAgPHR0PnRoaXM8L3R0PiBpcyBzZXQgdG8gY3VycmVudCA8aT5qUm5hIGluc3RhbmNlPC9pPi5cbiAgICAgICAgKiAgICAgICBBIG1ldGhvZCBuYW1lIG1heSBiZSB1c2VkIGluc3RlYWQgb2YgZnVuY3Rpb24uXG4gICAgICAgICogICAgICAgQW4gQXJyYXkgbWF5IGJlIHVzZWQgY29udGFpbmluZyBhbnkgb2YgdGhlIGFib3ZlXG4gICAgICAgICogICAgICAgcGx1cyBzb21lIGFkZGl0aW9uYWwgdmFsdWVzIHRvIGJlIHByZXBlbmRlZCB0byB0aGUgYXJndW1lbnQgbGlzdC5cbiAgICAgICAgKiAgIEBlbmQgY3VycnljYlxuICAgICAgICAqICAgQGN1cnJ5Y2IgY2FsbGJhY2tPZmYgY2xpY2tFdmVudCBcIm9uIGV2ZXJ5IHNlY29uZCBjbGlja1wiXG4gICAgICAgICogICAgICAgQHBhcmFtIHtmdW5jdGlvbnxzdHJpbmd8QXJyYXl9IGNhbGxiYWNrT2ZmXG4gICAgICAgICogICAgICAgUnVuIDx0dD5jYWxsYmFja09mZihjbGlja0V2ZW50KTwvdHQ+IG9uIGV2ZXJ5IHNlY29uZCBjbGljay5cbiAgICAgICAgKiAgICAgICA8dHQ+dGhpczwvdHQ+IGlzIHNldCB0byBjdXJyZW50IDxpPmpSbmEgaW5zdGFuY2U8L2k+LlxuICAgICAgICAqICAgICAgIEEgbWV0aG9kIG5hbWUgbWF5IGJlIHVzZWQgaW5zdGVhZCBvZiBmdW5jdGlvbi5cbiAgICAgICAgKiAgICAgICBBbiBBcnJheSBtYXkgYmUgdXNlZCBjb250YWluaW5nIGFueSBvZiB0aGUgYWJvdmVcbiAgICAgICAgKiAgICAgICBwbHVzIHNvbWUgYWRkaXRpb25hbCB2YWx1ZXMgdG8gYmUgcHJlcGVuZGVkIHRvIHRoZSBhcmd1bWVudCBsaXN0LlxuICAgICAgICAqICAgQGVuZCBjdXJyeWNiXG4gICAgICAgICovXG4gICAgICAgIHRoaXMudG9nZ2xlID0gZnVuY3Rpb24oIGlkLCBjYl9vbiwgY2Jfb2ZmICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0dXAoIGlkLCBmdW5jdGlvbiggaW5zdCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBib3VuZF9vbiA9IGN1cnJ5KCBpbnN0LCBjYl9vbiApO1xuICAgICAgICAgICAgICAgIGNvbnN0IGJvdW5kX29mZiA9IGN1cnJ5KCBpbnN0LCBjYl9vZmYgKTtcbiAgICAgICAgICAgICAgICBsZXQgb24gPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBlbGVtZW50Lm9uKCdjbGljaycsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoKG9uIF49IHRydWUpID09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdW5kX29uKGV2KTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJvdW5kX29mZihldik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gKTtcbiAgICAgICAgICAgIH0gKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgKiAgU2V0dXAgYSBzdGlja3kgY2xpY2sgaGFuZGxlci4gT25jZSBjbGlja2VkLCBpdCB3aWxsIGhhdmUgbm8gZWZmZWN0XG4gICAgICAgICogIHVudGlsIGEgXCJsb2NrXCIgcHJvcGVydHkgaXMgcmVzZXQgdG8gYSBmYWxzZSB2YWx1ZS5cbiAgICAgICAgKiAgQG11dGF0b3Igc3RpY2t5Q2xpY2tcbiAgICAgICAgKiAgICAgIEBmdW5jdGlvbiBzdGlja3lDbGlja1xuICAgICAgICAqICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogIEBpZFxuICAgICAgICAqICAgICAgQHBhcmFtIHtzdHJpbmd9IHJlY2VwdG9yXG4gICAgICAgICogICAgICBBIGpybmEtcHJlZml4ZWQgY2xhc3MgaW4gdGhlIERPTVxuICAgICAgICAqICBAZW5kIGlkXG4gICAgICAgICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lXG4gICAgICAgICogIEJvb2xlYW4gcHJvcGVydHkgdGhhdCBsb2NrcyB0aGUgY2xpY2tcbiAgICAgICAgKiAgQGN1cnJ5Y2IgIGNhbGxiYWNrIGNsaWNrRXZlbnQgXCIgb24gY2xpY2ssIHByb3ZpZGVkIHRoYXQgdGhlIGxvY2sgcHJvcGVydHkgaXMgZmFsc2VcIlxuICAgICAgICAqICAgICAgQHBhcmFtIHtmdW5jdGlvbnxzdHJpbmd8QXJyYXl9IGNhbGxiYWNrXG4gICAgICAgICogICAgICBSdW4gPHR0PmNhbGxiYWNrKGNsaWNrRXZlbnQpPC90dD4gIG9uIGNsaWNrLCBwcm92aWRlZCB0aGF0IHRoZSBsb2NrIHByb3BlcnR5IGlzIGZhbHNlLlxuICAgICAgICAqICAgICAgPHR0PnRoaXM8L3R0PiBpcyBzZXQgdG8gY3VycmVudCA8aT5qUm5hIGluc3RhbmNlPC9pPi5cbiAgICAgICAgKiAgICAgIEEgbWV0aG9kIG5hbWUgbWF5IGJlIHVzZWQgaW5zdGVhZCBvZiBmdW5jdGlvbi5cbiAgICAgICAgKiAgICAgIEFuIEFycmF5IG1heSBiZSB1c2VkIGNvbnRhaW5pbmcgYW55IG9mIHRoZSBhYm92ZVxuICAgICAgICAqICAgICAgcGx1cyBzb21lIGFkZGl0aW9uYWwgdmFsdWVzIHRvIGJlIHByZXBlbmRlZCB0byB0aGUgYXJndW1lbnQgbGlzdC5cbiAgICAgICAgKiAgQGVuZCBjdXJyeWNiXG4gICAgICAgICovXG4gICAgICAgIHRoaXMuc3RpY2t5Q2xpY2sgPSBmdW5jdGlvbiggaWQsIG5hbWUsIGNiICkge1xuICAgICAgICAgICAgdGhpcy5sb2NrTmFtZSggbmFtZSwgJ3N0aWNreUNsaWNrJyApO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0dXAoIGlkLCBmdW5jdGlvbiggaW5zdCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgICAgICBjb25zdCBib3VuZCA9IGN1cnJ5KCBpbnN0LCBjYiApO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQub24oJ2NsaWNrJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghaW5zdFtuYW1lXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdFtuYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBib3VuZChldik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH0gKTtcbiAgICAgICAgICAgIH0gKTtcbiAgICAgICAgfTtcbiAgICAgICAgLyoqXG4gICAgICAgICogICBDcmVhdGUgYW4gZWxlbWVudCBzaG9ydGN1dCBpbiB0aGUgalJuYSBpbnN0YW5jZS5cbiAgICAgICAgKiAgIFVzZSA8dHQ+dGhpcy5lbGVtZW50LiZsdDtjbGFzc05hbWUmZ3Q7PC90dD4gaW5zdGVhZC5cbiAgICAgICAgKiAgIEBtdXRhdG9yIGVsZW1lbnRcbiAgICAgICAgKiAgICAgICBAZnVuY3Rpb24gZWxlbWVudFxuICAgICAgICAqICAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgIEBlbmQgbXV0YXRvclxuICAgICAgICAqICAgQHJlY2VwdG9yXG4gICAgICAgICogICAgICAgQHBhcmFtIHtzdHJpbmd8QXJyYXl9IHJlY2VwdG9yXG4gICAgICAgICogICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgKiAgICAgICBhbmQgdGhlIG5hbWUgb2YgdGhlIGNvcnJlc3BvbmRpbmcgcHJvcGVydHkgaW4gdGhlIGpSbmEgaW5zdGFuY2UuXG4gICAgICAgICogICAgICAgVXNlIGEgMi1lbGVtZW50IGFycmF5IGlmIGRpZmZlcmVudCBuYW1lcyBhcmUgbmVlZGVkLlxuICAgICAgICAqICAgQGVuZCByZWNlcHRvclxuICAgICAgICAqL1xuICAgICAgICB0aGlzLmVsZW1lbnQgPSBmdW5jdGlvbiAoIHJlY2VwdG9yICkge1xuICAgICAgICAgICAgY29uc3QgW2lkLCBuYW1lXSA9IGpSbmEucGFyc2VJZCggcmVjZXB0b3IgKTtcbiAgICAgICAgICAgIHRoaXMubG9ja05hbWUobmFtZSk7XG4gICAgICAgICAgICB0aGlzLmFkZEFyZ3VtZW50KG5hbWUsIHsgZm9yYmlkZGVuOiAxIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0dXAoIGlkLCBmdW5jdGlvbiggaW5zdCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgICAgICBpbnN0W25hbWVdID0gZWxlbWVudDtcbiAgICAgICAgICAgIH0gKTtcbiAgICAgICAgfTtcbiAgICAgICAgLyoqXG4gICAgICAgICogICBAbXV0YXRvciBvblxuICAgICAgICAqICAgICAgIEBmdW5jdGlvbiBvblxuICAgICAgICAqICAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgIEBlbmQgbXV0YXRvclxuICAgICAgICAqICAgQHBhcmFtIHtzdHJpbmd9IHRyaWdnZXJcbiAgICAgICAgKiAgIEV2ZW50IHRvIGxpc3RlbiB0by4gU2VlIGpRdWVyeSBkb2NzIGZvciBzdXBwb3J0ZWQgZXZlbnQgdHlwZXMuXG4gICAgICAgICogICBAaWRcbiAgICAgICAgKiAgICAgICBAcGFyYW0ge3N0cmluZ30gcmVjZXB0b3JcbiAgICAgICAgKiAgICAgICBBIGpybmEtcHJlZml4ZWQgY2xhc3MgaW4gdGhlIERPTVxuICAgICAgICAqICAgQGVuZCBpZFxuICAgICAgICAqICAgQGN1cnJ5Y2IgY2FsbGJhY2sgZXZlbnQgXCJ3aGVuZXZlciBldmVudCBpcyB0cmlnZ2VyZWQgb24gPHR0PnJlY2VwdG9yPC90dD4gZWxlbWVudFwiXG4gICAgICAgICogICAgICAgQHBhcmFtIHtmdW5jdGlvbnxzdHJpbmd8QXJyYXl9IGNhbGxiYWNrXG4gICAgICAgICogICAgICAgUnVuIDx0dD5jYWxsYmFjayhldmVudCk8L3R0PiB3aGVuZXZlciBldmVudCBpcyB0cmlnZ2VyZWQgb24gPHR0PnJlY2VwdG9yPC90dD4gZWxlbWVudC5cbiAgICAgICAgKiAgICAgICA8dHQ+dGhpczwvdHQ+IGlzIHNldCB0byBjdXJyZW50IDxpPmpSbmEgaW5zdGFuY2U8L2k+LlxuICAgICAgICAqICAgICAgIEEgbWV0aG9kIG5hbWUgbWF5IGJlIHVzZWQgaW5zdGVhZCBvZiBmdW5jdGlvbi5cbiAgICAgICAgKiAgICAgICBBbiBBcnJheSBtYXkgYmUgdXNlZCBjb250YWluaW5nIGFueSBvZiB0aGUgYWJvdmVcbiAgICAgICAgKiAgICAgICBwbHVzIHNvbWUgYWRkaXRpb25hbCB2YWx1ZXMgdG8gYmUgcHJlcGVuZGVkIHRvIHRoZSBhcmd1bWVudCBsaXN0LlxuICAgICAgICAqICAgQGVuZCBjdXJyeWNiXG4gICAgICAgICovXG4gICAgICAgIHRoaXMub24gPSBmdW5jdGlvbiggdHJpZ2dlciwgaWQsIGNiICkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0dXAoaWQsIGZ1bmN0aW9uKGluc3QsIGVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBib3VuZCA9IGN1cnJ5KCBpbnN0LCBjYiApO1xuICAgICAgICAgICAgICAgIGVsZW1lbnQub24odHJpZ2dlciwgYm91bmQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH07XG4gICAgICAgIC8qKlxuICAgICAgICAqICAgQXNzb2NpYXRlIGEgPHR0PiZsZztpbnB1dCB0eXBlPVwiZmlsZVwiJmd0OzwvdHQ+XG4gICAgICAgICogICB3aXRoIGEgZmlsZSB1cGxvYWQgZnVuY3Rpb24gdGhhdCByZXR1cm5zIGEgcHJvbWlzZS5cbiAgICAgICAgKlxuICAgICAgICAqICAgUGxlYXNlIGNvbnNpZGVyIHVzaW5nIHN0YXRpYyA8dHQ+alJuYS51cGxvYWQ8L3R0PiBpbnN0ZWFkLlxuICAgICAgICAqICAgQG11dGF0b3IgdXBsb2FkXG4gICAgICAgICogICAgICAgQGZ1bmN0aW9uIHVwbG9hZFxuICAgICAgICAqICAgICAgIEBtZW1iZXJPZiBqUm5hXG4gICAgICAgICogICAgICAgQGluc3RhbmNlXG4gICAgICAgICogICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgIEBlbmQgbXV0YXRvclxuICAgICAgICAqICAgQHJlY2VwdG9yXG4gICAgICAgICogICAgICAgQHBhcmFtIHtzdHJpbmd8QXJyYXl9IHJlY2VwdG9yXG4gICAgICAgICogICAgICAgQSBqcm5hLXByZWZpeGVkIGNsYXNzIGluIHRoZSBET01cbiAgICAgICAgKiAgICAgICBhbmQgdGhlIG5hbWUgb2YgdGhlIGNvcnJlc3BvbmRpbmcgcHJvcGVydHkgaW4gdGhlIGpSbmEgaW5zdGFuY2UuXG4gICAgICAgICogICAgICAgVXNlIGEgMi1lbGVtZW50IGFycmF5IGlmIGRpZmZlcmVudCBuYW1lcyBhcmUgbmVlZGVkLlxuICAgICAgICAqICAgQGVuZCByZWNlcHRvclxuICAgICAgICAqICAgQHBhcmFtIHtzdHJpbmd9IFt0eXBlXSBDYW4gYmUgJ3RleHQnIChkZWZhdWx0KSwgJ3JhdycsIG9yICd1cmwnLlxuICAgICAgICAqXG4gICAgICAgICovXG4gICAgICAgIHRoaXMudXBsb2FkID0gZnVuY3Rpb24oIHJlY2VwdG9yLCB0eXBlICkge1xuICAgICAgICAgICAgY29uc3QgW2lkLCBuYW1lXSA9IGpSbmEucGFyc2VJZCggcmVjZXB0b3IgKTtcbiAgICAgICAgICAgIHRoaXMubG9ja05hbWUobmFtZSk7XG4gICAgICAgICAgICB0aGlzLmFkZEFyZ3VtZW50KG5hbWUsIHsgZm9yYmlkZGVuOiAxIH0pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2V0dXAoIGlkLCBmdW5jdGlvbiggaW5zdCwgZWxlbWVudCApIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIFRoaXMgcmVxdWlyZXMgYSBzcGVjaWFsIGVsZW1lbnQgLSBjaGVjayB3aGV0aGVyIGl0IGNhbiBpbnRvIGZpbGVzXG4gICAgICAgICAgICAgICAgaW5zdFtuYW1lXSA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgICAgICAgICAgICAgICAgIGxldCBwcm9tID0galJuYS51cGxvYWRGaWxlKCBlbGVtZW50WzBdLmZpbGVzWzBdLCB0eXBlICk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjYilcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb20gPSBwcm9tLnRoZW4oY2IuYmluZChpbnN0KSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBwcm9tO1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9ICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICogIERlZmluZSBhIHByb3BlcnR5IG9yIGZ1Y250aW9uLiBBbnkgYXJyYXkgb3Igb2JqZWN0IHdpbGwgYmUgc2hhcmVkXG4gICAgICAgICogIGFjcm9zcyBhbGwgaW5zdGFuY2VzLiBTZWUgYWxzbyA8dHQ+aW5pdDwvdHQ+LlxuICAgICAgICAqXG4gICAgICAgICogIEBtdXRhdG9yIGRlZlxuICAgICAgICAqICAgICAgQGZ1bmN0aW9uIGRlZlxuICAgICAgICAqICAgICAgQG1lbWJlck9mIGpSbmFcbiAgICAgICAgKiAgICAgIEBpbnN0YW5jZVxuICAgICAgICAqICAgICAgQHJldHVybnMge2pSbmF9IDx0dD50aGlzPC90dD4gKGNoYWluYWJsZSlcbiAgICAgICAgKiAgQGVuZCBtdXRhdG9yXG4gICAgICAgICogIEBwYXJhbSB7c3RyaW5nfSBuYW1lIE5hbWUgb2YgdGhlIHByb3BlcnR5XG4gICAgICAgICogIEBwYXJhbSB7Li4ufSBpbml0aWFsIFNldCA8dHQ+bmFtZTwvdHQ+IHByb3BlcnR5IHRvIHRoaXMgdmFsdWVcbiAgICAgICAgKi9cbiAgICAgICAgdGhpcy5faW5pdCA9IHt9O1xuICAgICAgICB0aGlzLmRlZiA9IGZ1bmN0aW9uKCBuYW1lLCBpbml0aWFsICkge1xuICAgICAgICAgICAgdGhpcy5sb2NrTmFtZShuYW1lKTtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaW5pdGlhbCA9PT0gJ2Z1bmN0aW9uJylcbiAgICAgICAgICAgICAgICBpc01ldGhvZFtuYW1lXSA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLl9pbml0W25hbWVdID0gZnVuY3Rpb24oKSB7IHJldHVybiBpbml0aWFsOyB9O1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG4gICAgICAgIHRoaXMuaW5pdCA9IGZ1bmN0aW9uKCBuYW1lLCBhY3Rpb24gKSB7XG4gICAgICAgICAgICB0aGlzLmxvY2tOYW1lKG5hbWUpO1xuICAgICAgICAgICAgdGhpcy5faW5pdFtuYW1lXSA9IGFjdGlvbjtcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICB9O1xuICAgICAgICAvLyBUT0RPIGluaXRBcnJheSAmIGluaXRPYmplY3Qgb25seSB1c2Ugc2hhbGxvdyBjb3B5LCBzbyBiZXdhcmVcbiAgICAgICAgdGhpcy5pbml0QXJyYXkgPSBmdW5jdGlvbiggbmFtZSwgc3RhcnQgPSBbXSApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXQoIG5hbWUsICgpID0+IFsgLi4uc3RhcnQgXSApO1xuICAgICAgICB9O1xuICAgICAgICB0aGlzLmluaXRPYmplY3QgPSBmdW5jdGlvbiggbmFtZSwgc3RhcnQgPSB7fSApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXQoIG5hbWUsICgpID0+IHsgcmV0dXJuIHsgLi4uc3RhcnQgfSB9ICk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQSBzdHVwaWQgc3RhdGUgbWFjaGluZSB0aGF0IGFsbG93cyB0byBvbmx5IGVudGVyIGV2ZXJ5IHN0YXRlIG9uY2VcbiAgICAgICAgdGhpcy5zdGlja3lTdGF0ZSA9IGZ1bmN0aW9uKCBuYW1lLCBhY3Rpb25faGFzaCwgaW5pdGlhbCApIHtcbiAgICAgICAgICAgIGNvbnN0IHJ1bm5lciA9IGpSbmEuc3RpY2t5U00oIGFjdGlvbl9oYXNoLCB7IG9yaWdpbjogbmFtZSArICcgYXQgJytvcmlnaW4sIGluaXRpYWwgfSApO1xuXG4gICAgICAgICAgICBpc01ldGhvZFtuYW1lXSA9IHRydWU7XG4gICAgICAgICAgICAvLyBtdXN0IHVzZSBpbml0IHRvIGF2b2lkIHNoYXJpbmcgc3RhdGUgYmV0d2VlbiBpbnN0YW5jZXNcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluaXQoIG5hbWUsICgpID0+IHJ1bm5lci5ydW4oKSApO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8vIGNhbGxiYWNrcyFcbiAgICAgICAgdGhpcy5fb25BdHRhY2ggPSBbXTtcbiAgICAgICAgdGhpcy5vbkF0dGFjaCA9IGZ1bmN0aW9uKGZ1bikge1xuICAgICAgICAgICAgdGhpcy5fb25BdHRhY2gucHVzaChmdW4pO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgIH07XG5cbiAgICAgICAgY29uc3QgY2FsbGJhY2tzICA9IHtcbiAgICAgICAgICAgIG9uUmVtb3ZlICAgOiBbXSxcbiAgICAgICAgfTtcbiAgICAgICAgZm9yKGxldCBpIGluIGNhbGxiYWNrcykge1xuICAgICAgICAgICAgdGhpc1tpXSA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2tzW2ldLnB1c2goY2IpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuY2hlY2tFbGVtZW50ID0gZnVuY3Rpb24oZWxlbWVudCwgYWN0aW9uPVwiYWRkcmVzc1wiKSB7XG4gICAgICAgICAgICAvLyBUT0RPIGV4dHJhY3QgdGhlIHNlbGVjdG9yIGZyb20gJCwgdG9vXG4gICAgICAgICAgICBpZiAoZWxlbWVudCA9PT0gdW5kZWZpbmVkKVxuICAgICAgICAgICAgICAgIGJsYW1lKCBcIkNhbm5vdCBcIithY3Rpb24rXCIgYSBudWxsIGVsZW1lbnRcIik7XG5cbiAgICAgICAgICAgIGxldCBzZWxlY3RvciA9ICcnO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBlbGVtZW50ID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHNlbGVjdG9yID0gJyAkKCcrZWxlbWVudCsnKSc7XG4gICAgICAgICAgICAgICAgZWxlbWVudCA9IHdpbmRvdy4kKCBlbGVtZW50ICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIShlbGVtZW50IGluc3RhbmNlb2Ygd2luZG93LiQpKVxuICAgICAgICAgICAgICAgIGJsYW1lKCBcIkNhbm5vdCBcIithY3Rpb24rXCIgYSBub24tJCBvYmplY3RcIiApO1xuICAgICAgICAgICAgaWYgKCFlbGVtZW50Lmxlbmd0aClcbiAgICAgICAgICAgICAgICBibGFtZSggXCJDYW5ub3QgXCIrYWN0aW9uK1wiIGEgbWlzc2luZyBlbGVtZW50XCIrc2VsZWN0b3IgKTtcbiAgICAgICAgICAgIGlmICggZWxlbWVudC5sZW5ndGggPiAxKVxuICAgICAgICAgICAgICAgIGJsYW1lKCBcIkNhbm5vdCBcIithY3Rpb24rXCIgYW4gYW1iaWd1b3VzIGVsZW1lbnRcIitzZWxlY3RvciApO1xuICAgICAgICAgICAgcmV0dXJuIGVsZW1lbnQuZmlyc3QoKTtcbiAgICAgICAgfTtcblxuICAgICAgICBmdW5jdGlvbiB3YWxrVHJlZSggcm9vdCwgY2IgKSB7XG4gICAgICAgICAgICBjYihyb290KTtcbiAgICAgICAgICAgIGZvciggbGV0IHB0ciA9IHJvb3QuZmlyc3RDaGlsZDsgcHRyICE9PSBudWxsOyBwdHIgPSBwdHIubmV4dFNpYmxpbmcpXG4gICAgICAgICAgICAgICAgaWYgKHB0ci5ub2RlVHlwZSA9PT0gMSkgLy8gb25seSBFbGVtZW50J3MgYXJlIGludml0ZWRcbiAgICAgICAgICAgICAgICAgICAgd2Fsa1RyZWUocHRyLCBjYik7XG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBmaW5kQ2xhc3Nlcyggcm9vdCwgd2FudGVkICkge1xuICAgICAgICAgICAgY29uc3QgZm91bmQgPSB7fTtcblxuICAgICAgICAgICAgd2Fsa1RyZWUoIHJvb3QsIGVsZW0gPT4ge1xuICAgICAgICAgICAgICAgIGZvciAoIGxldCBjbHMgb2YgZWxlbS5jbGFzc0xpc3QgKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmKCB3YW50ZWRbY2xzXSA9PT0gdW5kZWZpbmVkICkgY29udGludWU7XG4gICAgICAgICAgICAgICAgICAgIGlmKCBmb3VuZFtjbHNdIClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRHVwbGljYXRlIGVsZW1lbnQgd2l0aCBjbGFzcyAnK2Nscyk7XG4gICAgICAgICAgICAgICAgICAgIGZvdW5kW2Nsc10gPSBlbGVtO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBmb3IoIGxldCBjbHMgaW4gd2FudGVkIClcbiAgICAgICAgICAgICAgICBpZiAoIWZvdW5kW2Nsc10pXG4gICAgICAgICAgICAgICAgICAgIGJsYW1lKCdGYWlsZWQgdG8gbG9jYXRlIGNsYXNzICcrY2xzKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZvdW5kO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICpcbiAgICAgICAgKiAgQGZ1bmN0aW9uIGF0dGFjaFxuICAgICAgICAqICBAbWVtYmVyT2YgalJuYVxuICAgICAgICAqICBAaW5zdGFuY2VcbiAgICAgICAgKiAgQHJldHVybnMge2pSbmEuQm91bmR9IEEgbmV3IGpSbmEgaW5zdGFuY2UgYm91bmQgdG8gYSBET00gc3VidHJlZVxuICAgICAgICAqICBAcGFyYW0ge2pRdWVyeX0gY29udGFpbmVyIC0gdGhlIHJvb3Qgb2YgRE9NIHN1YnRyZWUgdG8gYXR0YWNoIHRvLlxuICAgICAgICAqICBJdCBNVVNUIGNvbnRhaW4gZXhhY3RseSBvbmUgZWxlbWVudC5cbiAgICAgICAgKiAgSXQgTVVTVCBjb250YWluIGV4YWN0bHkgb25lIGluc3RhbmNlIG9mIGVhY2gge0BsaW5rIGpSbmEucmVjZXB0b3J9XG4gICAgICAgICogIEBwYXJhbSB7T2JqZWN0fSBbYXJnc10gLSBvcHRpb25hbCBhcmd1bWVudCB2YWx1ZXMgc3BlY2lmaWVkXG4gICAgICAgICogIHZpYSB7QGxpbmsgalJuYSNhcmdzfVxuICAgICAgICAqL1xuICAgICAgICB0aGlzLmF0dGFjaCA9IGZ1bmN0aW9uKGNvbnRhaW5lciwgYXJncz17fSkge1xuICAgICAgICAgICAgLy8gdmFsaWRhdGUgY29udGFpbmVyIGZpcnN0LCBjaGVjayBhcmdzIGFmdGVyIGluc3RhbmNlIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgY29udGFpbmVyID0gdGhpcy5jaGVja0VsZW1lbnQoY29udGFpbmVyLCBcImF0dGFjaCB0b1wiKTtcblxuICAgICAgICAgICAgLy8gcmVuYW1lIHRoaXMgdG8gbWV0YSB0byBhdm9pZCBjb25mdXNpb24gd2l0aCBpbnN0YW5jZSdzIGB0aGlzYFxuICAgICAgICAgICAgY29uc3QgbWV0YSA9IHRoaXM7XG5cbiAgICAgICAgICAgIGNvbnN0IGluc3QgPSBuZXcgalJuYS5Cb3VuZCgpO1xuICAgICAgICAgICAgaW5zdC5jb250YWluZXIgICA9IGNvbnRhaW5lcjtcblxuICAgICAgICAgICAgZm9yIChsZXQgaSBpbiBjYWxsYmFja3MpIHtcbiAgICAgICAgICAgICAgICAvLyBpbnN0Ll9mb29iYXIgYWN0dWFsIGNhbGxiYWNrIGxpc3QsIGluc3QuZm9vYmFyIGFwcGVuZGVyXG4gICAgICAgICAgICAgICAgaW5zdFsnXycraV0gPSBbXS5jb25jYXQoY2FsbGJhY2tzW2ldKTtcbiAgICAgICAgICAgICAgICBpbnN0W2ldID0gZnVuY3Rpb24oY2IpIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdFsnXycraV0ucHVzaChjYik7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpbnN0O1xuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEFsbCBqcm5hLWNsYXNzZWQgXCJyZWNlcHRvclwiIGVsZW1lbnRzXG4gICAgICAgICAgICBpbnN0LmVsZW1lbnQgICAgPSB7fTtcblxuICAgICAgICAgICAgLy8gVE9ETyBiZXR0ZXIgbmFtZVxuICAgICAgICAgICAgaW5zdC5hcHBlbmRUbyA9IGZ1bmN0aW9uKCBlbGVtZW50ICkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQgPSBtZXRhLmNoZWNrRWxlbWVudChlbGVtZW50LCBcImFwcGVuZCB0b1wiKTtcbiAgICAgICAgICAgICAgICBlbGVtZW50LmFwcGVuZCggaW5zdC5jb250YWluZXIgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW5zdDtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFRPRE8gc3BsaXQgaW50byBkZXN0cm95KCkgYW5kIGRldGFjaCgpXG4gICAgICAgICAgICAvLyBUT0RPIHNob3VsZCB3ZSBob29rIGludG8gY29udGFpbmVyJ3Mgb25SZW1vdmU/XG4gICAgICAgICAgICBpbnN0LnJlbW92ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGNiIG9mIGluc3QuX29uUmVtb3ZlICkge1xuICAgICAgICAgICAgICAgICAgICBjYi5iaW5kKGluc3QpKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluc3QuY29udGFpbmVyLnJlbW92ZSgpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gcmVzb2x2ZSBhbGwgbmVlZGVkIGVsZW1lbnRzIGF0IG9uY2VcbiAgICAgICAgICAgIGNvbnN0IHJlc29sdmVkID0gZmluZENsYXNzZXMoIGNvbnRhaW5lclswXSwgdGhpcy5fd2FudGVkICk7XG4gICAgICAgICAgICBpbnN0LmVsZW1lbnQgID0ge307XG4gICAgICAgICAgICBmb3IgKGxldCBjbHMgaW4gcmVzb2x2ZWQpXG4gICAgICAgICAgICAgICAgaW5zdC5lbGVtZW50WyB0aGlzLl93YW50ZWRbY2xzXSBdID0gd2luZG93LiQoIHJlc29sdmVkW2Nsc10gKTtcblxuICAgICAgICAgICAgZm9yIChsZXQgYWN0aW9uIG9mIG1ldGEuX3NldHVwKSB7XG4gICAgICAgICAgICAgICAgYWN0aW9uWzFdKGluc3QsIGluc3QuZWxlbWVudFsgYWN0aW9uWzBdIF0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBwcm9jZXNzIGFyZ3VtZW50cyAmIGluaXRpYWwgdmFsdWVzXG4gICAgICAgICAgICBmb3IoIGxldCBpIGluIG1ldGEuX2luaXQgKSB7XG4gICAgICAgICAgICAgICAgLy8gc2tpcCBpbml0aWFsaXplciBmb3IgZ2l2ZW4gYXJndW1lbnRzIC0gYnV0IG5vdCBmb3IgbWV0aG9kc1xuICAgICAgICAgICAgICAgIGlmICghaXNNZXRob2RbaV0gJiYgaSBpbiBhcmdzKVxuICAgICAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgICAgICBpbnN0W2ldID0gbWV0YS5faW5pdFtpXS5hcHBseShpbnN0LCBbYXJnc10pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZm9yKCBsZXQga2V5IGluIGFyZ3MgKSB7XG4gICAgICAgICAgICAgICAgLy8gVE9ETyB0aHJvdyBhbGwgb2YgZXh0cmEgYXJncywgbm90IGp1c3QgdGhlIGZpcnN0XG4gICAgICAgICAgICAgICAgaWYgKCFhbGxvd0FyZ3Nba2V5XSApXG4gICAgICAgICAgICAgICAgICAgIGJsYW1lKCBcInVua25vd24gYXJndW1lbnQgXCIra2V5KTtcbiAgICAgICAgICAgICAgICBpZiAoIWFzc2lnbkFyZ3Nba2V5XSlcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICAgICAgaWYgKGlzTWV0aG9kW2tleV0pIHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdFtrZXldKCBhcmdzW2tleV0gKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpbnN0W2tleV0gPSBhcmdzW2tleV07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBleGVjdXRlIGNhbGxiYWNrc1xuICAgICAgICAgICAgLy8gVE9ETyByZXdyaXRlIHRoaXNcbiAgICAgICAgICAgIGZvciAobGV0IGkgaW4gbWV0YS5fb25BdHRhY2ggKSB7XG4gICAgICAgICAgICAgICAgY3VycnkoaW5zdCwgbWV0YS5fb25BdHRhY2hbaV0pKGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGluc3Q7XG4gICAgICAgIH07IC8vIGVuZCBvZiB0aGlzLmF0dGFjaFxuXG4gICAgICAgIHRoaXMuYXBwZW5kVG8gPSBmdW5jdGlvbiggZWxlbWVudCwgYXJncyApIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmluc3RhbnRpYXRlKGFyZ3MpLmFwcGVuZFRvKGVsZW1lbnQpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuaW5zdGFudGlhdGUgPSBmdW5jdGlvbiggYXJncyApIHtcbiAgICAgICAgICAgIC8vIFRPRE8gdGhpcyBkaWVzIGlmID4xIG5vZGVzLCBzbyBtb3ZlIHRoZSBjaGVjayBpbnRvIGh0bWwoKVxuICAgICAgICAgICAgaWYgKCF0aGlzLl9tYXN0ZXIpXG4gICAgICAgICAgICAgICAgYmxhbWUoJ1RyeWluZyB0byBpbnN0YW50aWF0ZSB3aXRoIGFuIGVtcHR5IGh0bWwoKScpO1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gd2luZG93LiQoIHRoaXMuX21hc3Rlci5jbG9uZU5vZGUodHJ1ZSkgKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmF0dGFjaCggY29udGFpbmVyLCBhcmdzICk7XG4gICAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gZW1wdHkgY29uc3RydWN0b3IgZm9yIGluc3RhbmNlb2YnaW5nXG4gICAgLy8gVE9ETyBob3cgdG8gZG8gaXQgYmV0dGVyP1xuICAgIC8qKlxuICAgICogICBAY29uc3RydWN0b3JcbiAgICAqICAgQHRoaXMge2pSbmEuQm91bmR9XG4gICAgKlxuICAgICogICBEbyBub3QgY2FsbCB0aGlzIGRpcmVjdGx5LiBVc2Uge0BsaW5rIGpSbmEjYXR0YWNofSBpbnN0ZWFkLlxuICAgICovXG4gICAgalJuYS5Cb3VuZCA9IGZ1bmN0aW9uICgpIHt9O1xuXG4gICAgLy8gcHJlZml4IGFsbCBDU1MgY2xhc3NlcyB0byBhdm9pZCBuYW1lc3BhY2UgcG9sbHV0aW9uXG4gICAgalJuYS5wcmVmaXggPSAnanJuYS0nO1xuXG4gICAgalJuYS5kb2N1bWVudFRpdGxlID0gZnVuY3Rpb24oLi4uYXJncykge1xuICAgICAgICBjb25zdCBtZSA9IHt9O1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoIG1lLCAndXBkYXRlJywge1xuICAgICAgICAgICAgdmFsdWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5kb2N1bWVudC50aXRsZSA9IGFyZ3Muam9pbignJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1lO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBjb3NwbGF5IGFuIGFycmF5IC0gYnV0IHdpdGggYSBtb2RpZmljYXRpb24gaG9va1xuICAgICAgICBmb3IgKGxldCBpIGluIGFyZ3MpIHtcbiAgICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShtZSwgaSwge1xuICAgICAgICAgICAgICAgIGdldDogZnVuY3Rpb24oKSB7IHJldHVybiBhcmdzW2ldIH0sXG4gICAgICAgICAgICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHsgYXJnc1tpXSA9IHZhbDsgdGhpcy51cGRhdGUoKSB9LFxuICAgICAgICAgICAgICAgIGVudW1lcmFibGU6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSggbWUsICdsZW5ndGgnLCB7XG4gICAgICAgICAgICB2YWx1ZTogYXJncy5sZW5ndGhcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBtZTtcbiAgICB9O1xuXG4gICAgalJuYS51cGxvYWQgPSBmdW5jdGlvbihvcHRpb25zPXt9KSB7XG4gICAgICAgIGNvbnN0IGlucHV0RmlsZSA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbnB1dCcpO1xuICAgICAgICBpbnB1dEZpbGUuc2V0QXR0cmlidXRlKCd0eXBlJywgICAnZmlsZScpO1xuICAgICAgICBpbnB1dEZpbGUuc2V0QXR0cmlidXRlKCdzdHlsZScsICAnZGlzcGxheTogbm9uZScpO1xuICAgICAgICByZXR1cm4gbmV3IFByb21pc2UoIGRvbmUgPT4ge1xuICAgICAgICAgICAgaW5wdXRGaWxlLm9uaW5wdXQgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBqUm5hLnVwbG9hZEZpbGUoIHRoaXMuZmlsZXNbMF0sIG9wdGlvbnMudHlwZSApLnRoZW4oIHJlc3VsdCA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlucHV0RmlsZS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgZG9uZSggcmVzdWx0ICk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgd2luZG93LmRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaW5wdXRGaWxlKTsgLy8gcmVxdWlyZWQgZm9yIGZpcmVmb3hcbiAgICAgICAgICAgIGlucHV0RmlsZS5jbGljaygpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgalJuYS51cGxvYWRGaWxlID0gZnVuY3Rpb24gKCBmaWxlLCB0eXBlICkge1xuICAgICAgICBjb25zdCB0eXBlcyA9IHtcbiAgICAgICAgICAgIHRleHQgOiAncmVhZEFzVGV4dCcsXG4gICAgICAgICAgICByYXcgIDogJ3JlYWRBc0JpbmFyeVN0cmluZycsXG4gICAgICAgICAgICB1cmwgIDogJ3JlYWRBc0RhdGFVcmwnXG4gICAgICAgIH07XG4gICAgICAgIGNvbnN0IGhvdyA9IHR5cGVzWyB0eXBlIHx8ICd0ZXh0JyBdO1xuICAgICAgICBpZiAoIWhvdylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVwbG9hZEZpbGUoKTogdHlwZSBtdXN0IGJlICd0ZXh0JyhkZWZhdWx0KSwgJ3JhdycsIG9yICd1cmwnXCIpO1xuICAgICAgICBjb25zdCByZWFkZXIgPSBuZXcgd2luZG93LkZpbGVSZWFkZXIoKTtcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uKGRvbmUpIHtcbiAgICAgICAgICAgIHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IHJlc3VsdCA9IHsgY29udGVudDogcmVhZGVyLnJlc3VsdCwgaW5mbzogZmlsZSB9O1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGtleSBpbiBmaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdFtrZXldID0gZmlsZVtrZXldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBkb25lKHJlc3VsdCk7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgcmVhZGVyW2hvd10oZmlsZSk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBqUm5hLmRvd25sb2FkID0gZnVuY3Rpb24oZmlsZW5hbWUsIGNvbnRlbnQsIGN0eXBlKSB7XG4gICAgICAgIGlmICghY3R5cGUpXG4gICAgICAgICAgICBjdHlwZSA9ICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nO1xuICAgICAgICAvLyBUT0RPIGFsc28gYWRkIGNoYXJzZXQ9dXRmLTggdW5sZXNzIGJpbmFyeVxuXG4gICAgICAgIC8vIFNoYW1lbGVzc2x5IHN0b2xlbiBmcm9tIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vYS8zMDgwMDcxNS8yODA0NDlcbiAgICAgICAgY29uc3QgZGF0YVN0ciA9ICdkYXRhOicrY3R5cGUrJywnK2VuY29kZVVSSUNvbXBvbmVudCggY29udGVudCApO1xuICAgICAgICBjb25zdCBhSHJlZiA9IHdpbmRvdy5kb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gICAgICAgIGFIcmVmLnNldEF0dHJpYnV0ZShcImhyZWZcIiwgICAgIGRhdGFTdHIpO1xuICAgICAgICBhSHJlZi5zZXRBdHRyaWJ1dGUoXCJkb3dubG9hZFwiLCBmaWxlbmFtZSk7XG4gICAgICAgIHdpbmRvdy5kb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGFIcmVmKTsgLy8gcmVxdWlyZWQgZm9yIGZpcmVmb3hcbiAgICAgICAgYUhyZWYuY2xpY2soKTtcbiAgICAgICAgYUhyZWYucmVtb3ZlKCk7XG4gICAgfTtcblxuICAgIGpSbmEuYmFja2VuZCA9IGZ1bmN0aW9uKHNwZWMgPSB7fSkge1xuICAgICAgICBjb25zdCB1cmwgPSBzcGVjLnVybDtcbiAgICAgICAgaWYgKCF1cmwpXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJqUm5hLmJhY2tlbmQ6ICd1cmwnIHBhcmFtZXRlciBpcyByZXF1aXJlZFwiKTtcblxuICAgICAgICBjb25zdCBtZXRob2QgPSAoc3BlYy5tZXRob2QgfHwgJ1BPU1QnKS50b1VwcGVyQ2FzZSgpO1xuICAgICAgICBsZXQgY29udGVudF90eXBlLCBwYXJzZSwgc3RyaW5naWZ5O1xuXG4gICAgICAgIC8vIFRPRE8gaWYgdHlwZSA9PSBqc29uXG4gICAgICAgIGNvbnRlbnRfdHlwZSA9ICdhcHBsaWNhdGlvbi9qc29uJztcbiAgICAgICAgcGFyc2UgICAgICAgID0gSlNPTi5wYXJzZTtcbiAgICAgICAgc3RyaW5naWZ5ICAgID0gSlNPTi5zdHJpbmdpZnk7XG5cbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFyZ3MpIHtcbiAgICAgICAgICAgIGxldCBxdWVyeSA9ICcnO1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlKCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHhociA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuXG4gICAgICAgICAgICAgICAgeGhyLmFkZEV2ZW50TGlzdGVuZXIoIFwibG9hZFwiLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHBhcnNlKHRoaXMucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgICAgICAgICAgZG9uZShkYXRhKTtcbiAgICAgICAgICAgICAgICB9ICk7XG4gICAgICAgICAgICAgICAgeGhyLm9wZW4obWV0aG9kLCB1cmwgKyBxdWVyeSk7XG4gICAgICAgICAgICAgICAgaWYgKGNvbnRlbnRfdHlwZSlcbiAgICAgICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIoIFwiQ29udGVudC1UeXBlXCIsIGNvbnRlbnRfdHlwZSApO1xuICAgICAgICAgICAgICAgIHhoci5zZW5kKHN0cmluZ2lmeShhcmdzKSk7XG4gICAgICAgICAgICB9ICk7XG4gICAgICAgIH07XG4gICAgfTtcblxuICAgIC8vIGNvbnN0IHN3aXRjaGVyb28gPSBqUm5hLnN0aWNreVNNKCB7IHN0YXRlOiBvblN3aXRjaCwgLi4uIH0sIC4uLiApLnJ1bigpXG4gICAgLy8gc3dpdGNoZXJvbyhzYW1lX3N0YXRlKTsgLy8gZG9lcyBub3RoaW5nXG4gICAgLy8gc3dpdGNoZXJvbyhvdGhlcl9zdGF0ZSk7IC8vIGV4ZWN1dGVzIHJlc3BlY3RpdmUgb25Td2l0Y2hcbiAgICAvLyBzd2l0Y2hlcm9vKCk7IC8vIHJldHVybnMgY3VycmVudCBzdGF0ZVxuICAgIGpSbmEuc3RpY2t5U00gPSBmdW5jdGlvbiggYWN0aW9uX2hhc2gsIGFyZ3MgKSB7XG4gICAgICAgIC8vIFRPRE8gdmFsaWRhdGUgYXJnc1xuICAgICAgICBjb25zdCBvcmlnaW4gPSBhcmdzLm9yaWdpbiB8fCAnLSBqUm5hLnN0aWNreVNNQCcrY2FsbGVySW5mbygxKTtcblxuICAgICAgICBpZiAoYXJncy5pbml0aWFsICE9PSB1bmRlZmluZWQgJiYgIWFjdGlvbl9oYXNoW2FyZ3MuaW5pdGlhbF0pXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJJbGxlZ2FsIGluaXRpYWwgc3RhdGU6IFwiK2FyZ3MuaW5pdGlhbCsnICcrb3JpZ2luKTtcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcnVuOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIHRoaXMucnVuKGluaXRpYWxfc3RhdGUpXG4gICAgICAgICAgICAgICAgbGV0IHN0YXRlID0gYXJncy5pbml0aWFsO1xuXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGFyZykge1xuICAgICAgICAgICAgICAgICAgICAvLyAwLWFyZyA9PiBnZXR0ZXJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBhcmcgPT09ICd1bmRlZmluZWQnKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0YXRlO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUudHJhY2UoJ3N3aXRjaCAnK3N0YXRlKyctPicrYXJnKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoYXJnICE9PSBzdGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9kbyA9IGFjdGlvbl9oYXNoW2FyZ107XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRvZG8pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbGxlZ2FsIHN0YXRlIHN3aXRjaCAnK3N0YXRlKyctPicrYXJnICsnICcrb3JpZ2luKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvZG8uYXBwbHkodGhpcywgW3N0YXRlLCBhcmddKTsgLy8gKG9sZCwgbmV3KVxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSBhcmc7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9O1xuXG4gICAgLy8gdXNhZ2U6XG4gICAgLy8gY29uc3QgWyBlbGVtZW50TmFtZSwgcHJvcGVydHlOYW1lIF0gPSBqUm5hLnBhcnNlSWQgKCBzdHJpbmcgfCBbIHN0cmluZywgc3RyaW5nIF0gKVxuICAgIGpSbmEucGFyc2VJZCA9IGZ1bmN0aW9uKHJlY2VwdG9yLCBvcHRpb25zPXt9KSB7XG4gICAgICAgIGxldCBvdXQ7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlY2VwdG9yKSkge1xuICAgICAgICAgICAgaWYgKHJlY2VwdG9yLmxlbmd0aCA+IDIpXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCAnalJuYSByZWNlcHRvciBtdXN0IGJlIGEgc3RyaW5nIG9yIDItZWxlbWVudCBhcnJheScpO1xuICAgICAgICAgICAgb3V0ID0gW10uY29uY2F0KHJlY2VwdG9yKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG91dCA9IFsgcmVjZXB0b3IgXVxuICAgICAgICB9XG4gICAgICAgIGlmICh0eXBlb2Ygb3V0WzBdICE9PSAnc3RyaW5nJyAmJiB0eXBlb2Ygb3V0WzBdICE9PSAnbnVtYmVyJylcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ2pSbmEgcmVjZXB0b3IgbXVzdCBiZSBhIHN0cmluZyBvciAyLWVsZW1lbnQgYXJyYXknKTtcbiAgICAgICAgaWYgKG91dFsxXSA9PT0gdW5kZWZpbmVkICYmICFvcHRpb25zLnNraXBNaXNzaW5nKVxuICAgICAgICAgICAgb3V0WzFdID0gb3V0WzBdO1xuICAgICAgICByZXR1cm4gb3V0O1xuICAgIH07XG4gICAgcmV0dXJuIGpSbmE7XG59KSgpO1xuXG5pZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcpXG4gICAgd2luZG93LmpSbmEgPSBqUm5hO1xuZWxzZVxuICAgIG1vZHVsZS5leHBvcnRzID0galJuYTtcbiJdfQ==
