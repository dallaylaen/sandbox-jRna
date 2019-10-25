#!/bin/sh

assert() {
    echo "Executing $*"
    "$@" || exit 1
    echo "Success"
}

CHANGE=`git status --porcelain | grep -v docs/js/`
if [ ! -z "$CHANGE" ]; then
    echo >&2 "$CHANGE"
    echo >&2 "Uncommitted changes present, aborting"
    exit 1
fi

assert browserify -d -o docs/js/jrna.js lib/jrna.js
assert minify lib/jrna.js>docs/js/jrna.min.js
assert git add docs/js
# TODO insert tests
assert git commit -m "AUX Update minified version"

