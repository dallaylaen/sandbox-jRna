# Learning some JavaScript - nothing to see here, move along

A JS library built by a Perl developer based on jQuery, 
10 years old Stackoverflow advices, and random googling.

## Description

[jRna](lib/jRna.js) stands for *JavaScript Ribonucleic Acid*.
It is built upon jQuery and provides application building blocks
that attempt to minimize the knowledge sharing between
the code and the HTML/CSS.

Each jRna block maps its internal state onto a subset of the DOM.
It only cares about an element it is *bound* to (called a *container*)
and zero or more elements inside the container
that expose `jrna-`-prefixed classed.

jRna utilizes the *builder* pattern
to allow for reusable/repeated/nested blocks.

A `new jRna()` creates a *description* of a block whose methods
are mostly mutators that return self and may thus be chained.

In order for a block to become effectful, the `attach` method
or one of its cousins, `appendTo` and `spawn`, must be called.

Upon `attach`, all elements within container are resolved
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
