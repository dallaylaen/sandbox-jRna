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
