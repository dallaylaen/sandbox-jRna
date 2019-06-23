# Learning some JavaScript - nothing to see here, move along

A JS library built by a Perl developer based on jQuery,
10 years old Stackoverflow advices, and random googling.

## Description

[jRna](lib/jrna.js) stands for *JavaScript Ribonucleic Acid*.
It is built upon jQuery and provides application building blocks
that attempt to minimize the knowledge sharing between
the code and the HTML/CSS.

Each jRna block maps its internal state onto a subset of the DOM.
It only cares about an element it is *bound* to (called a *container*)
and zero or more elements inside the container
that expose `jrna-`-prefixed classes (caller *receptors*).

jRna utilizes the *builder* pattern.

A `new jRna()` creates a *jRna builder* whose methods
are mostly chainable mutators.

The builder's `attach` method is then used to create a *jRna instance*
bound to specific container.
Its frontends `appendTo` and `instantiate` can be used to bind to an
in-memory HTML snippet provided via `html()` mutator.

Upon `attach`, all receptors within the container are resolved
and initial state of a jRna block is instantiated.

## Example

Consider the following HTML:

```html
<div id="container">
    <button class="jrna-showhide">hide</button>
    <div class="jrna-content">
        <!-- some other tags in here in here -->
    </div>
</div>
```

And the associated JS code:

```javascript
const toggle = new jRna();

// map element with class="jrna-content" onto property named 'content'
// add a second argument to set a different property name
toggle.element('content');

// changing the property 'showhide' will now
// trigger writing text to element with class 'jrna-showhide'
// again, the second argument
toggle.output('showhide');

// set onclick event for element with class="showhide"
// that alternates between the two callbacks
// (switching content visibility & inscription on the button)
toggle.toggle('showhide', function() {
    this.content.hide();
    this.showhide = 'show';
}, function() {
    this.content.show();
    this.showhide = 'hide';
};

// create a concrete instance of toggle
// tied to the above HTML snippet
const mytoggle = toggle.attach('#container');

// note that all of the above method calls can be chained
```

See [examples](example/) for more.

See the [Ultimate task estimator](apps/estimator.html), too.
