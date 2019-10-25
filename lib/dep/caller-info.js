

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

