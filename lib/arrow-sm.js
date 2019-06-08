

function ArrowSM (initial, handler) {
    // TODO better validation
    if (typeof handler != 'object')
        throw new Error("An object argument is required by ArrowSM");

    let state;
    const setState = function(newstate) {
        // null values are not valid states, but false & 0 are
        if (newstate == undefined || newstate == null)
            return;
        if (!handler[newstate])
            throw new Error("illegal state change requested: "+state+"->"+newstate);
        state = newstate;
    }

    let me;
    me = function(...args) {
        const todo = handler[ state ];
        const next = todo.apply(this, args);
        if (Array.isArray(next)) {
            setState(next[0]);
            return next[1];
        } else {
            setState(next);
            return me;
        }
    };
    me.state = function() { return state; };

    setState(initial);
    return me;
}

if (typeof module === 'object' && typeof module.exports === 'object' ) {
    // we're being exported
    module.exports = ArrowSM;
}
