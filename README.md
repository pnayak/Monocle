# Monocle

A silky, tactile browser-based ebook reader.

Invented by [Inventive Labs](http://inventivelabs.com.au). Released under the
MIT license.

More information (including demos): http://monocle.inventivelabs.com.au

Contributions welcome - fork the repository on
[GitHub](http://github.com/joseph/monocle).


## Getting started

Here's the simplest thing that could possibly work.

    <!-- Include the Monocle library -->
    <script type="text/javascript" src="monocle-min.js"></script>

    <!-- Create the reader when the page has loaded -->
    <script type="text/javascript">
      Monocle.addListener(window, 'load', function () {Monocle.Reader('rdr')});
    </script>

    <!-- Somewhere in the page body, an element with a matching id... -->
    <div id="rdr" style="width: 300px; height: 400px">
      <h1>Hello world.</h1>
    </div>

In this example, we initialise the reader with the contents of the div
itself. In theory there's no limit on the size of the contents of that div.

A more advanced scenario involves feeding Monocle a "book data object", from
which it can lazily load the contents of the book as the user requests it.


### Specification of the book data object

The book data object should provide certain required methods.

Methods:

* `getComponents`: returns an array of all the component ids that are to be
    accessed in linear reading order (ie, like the spine in an EPUB OPF file --
    you don't have to list every component, just the ones that are read in
    order).
* `getContents`: a function that returns an array of nested objects. Each
    object responds to `title` (a string), and `src`. `src` is a string that
    "addresses" a component and (optionally) a location within that component.
    Locations within components are indicated using standard HTML anchor
    notation — for example, "cmpt1#part3" points to an element with an id
    of "part3" within the component named "cmpt1".

    This is an example of a contents structure with one top-level section
    containing two sub-sections:

        [
          {
            title: "I: A curious incident",
            src: "component1.xhtml",
            children: [
              {
                title: "I. a. Part the first",
                src: 'component1.xhtml#part-the-first'
              },
              {
                title: "I. a. Part the second",
                src: 'component3.xhtml#part-the-second'
               }
             ]
           }
        ]
* `getComponent(componentId)`: takes a component id (from the list returned
    by `getComponents`) and returns the body text of the corresponding
    component.
* `getMetaData(key)`: takes a string "key" and returns the value of that
    metadata for this book. There is not yet any standardized list of
    possible keys -- we'll just see what happens for a bit. Note that if
    nothing will go wrong if you return null or an empty string for any
    requested key.

Note that if these methods retrieve any data from a server using AJAX
techniques, it should be a synchronous operation, because the clients of the
book data object expect the result to be returned from the method itself
(not via a callback).


### Example of a book data object

    var bookData = {
      getComponents: function () {
        return [
          'component1.xhtml',
          'component2.xhtml',
          'component3.xhtml',
          'component4.xhtml'
        ];
      },
      getContents: function () {
        return [
          {
            title: "Chapter 1",
            src: "component1.xhtml"
          },
          {
            title: "Chapter 2",
            src: "component3.xhtml#chapter-2"
          }
        ]
      },
      getComponent: function (componentId) {
        return {
          'component1.xhtml':
            '<h1>Chapter 1</h1><p>Hello world</p>',
          'component2.xhtml':
            '<p>Chapter 1 continued.</p>',
          'component3.xhtml':
            '<p>Chapter 1 continued again.</p>' +
            '<h1 id="chapter-2">Chapter 2</h1>' +
            '<p>Hello from the second chapter.</p>',
          'component4.xhtml':
            '<p>THE END.</p>'
        }[componentId];
      },
      getMetaData: function(key) {
        return {
          title: "A book",
          creator: "Inventive Labs"
        }[key];
      }
    }

    // Initialize the reader element.
    var reader = Monocle.Reader('reader');

    // Initialize a book object. (Of course we could have just passed it in
    // as the second argument to the reader constructor, which would also
    // obviate the need for the setBook call below. This is the scenic route.)
    var book = Monocle.Book(bookData);

    // Assign the book to the reader and go to the 3rd page.
    reader.setBook(book);
    reader.moveTo({ page: 3 });


## Building Monocle for production

The core of Monocle (everything except the standard controls) is managed with
Sprockets - a Ruby library for JavaScript projects. This is the easiest way to
get a minified, concatenated production script. You'll need Ruby, and a
few Ruby gems:

* rake
* sprockets
* yui-compressor

Then, inside the Monocle distribution directory, run `rake`. Your file
will be waiting for you in the `dist` sub-directory.

The standard controls are not minified or concatenated - they're pretty
small, and you can simply select which ones you want to include on the page.
They're in `src/controls`.


### Advanced Monocle

Monocle is built to be extended. It's pretty flexible. You can create custom
controls and custom page-turning interactions (called 'flippers' in Monocle).
You can also hack away at the built-in styles. This section explains some of
this stuff -- but we also recommend that you explore some of the examples in
the `tests` directory in this distribution.


### Concepts

There are few different classes you need to know. Here's a conceptual
hierarchy.

    Monocle.Reader
      has a Monocle.Book
        has many Monocle.Components (parts of the total book content)
        has many Monocle.Places (which can point to arbitrary pages)
      has a Flipper (from the Monocle.Flippers namespace)
        has one or more DOM page elements
      has many Controls (standard controls only are in Monocle.Controls)

Then there is `Monocle.Styles`, which is a nested look-up hash of CSS style
properties and values. You can add properties and alter values in this
hash at will (but if you've already created the reader object, you'll need
to run `reader.reapplyStyles()` to display your changes).

That's most of it. The two main extension points are custom controls and
custom flippers.


### Reader Events

The Monocle Reader fires custom events when interesting things happen. Here's
a list of event names. Events marked with (c) are cancellable -- call
preventDefault() on them if you need to.

* monocle:initializing (NB: too early to call addControl)
* monocle:loading
* monocle:loaded
* monocle:resizing (c)
* monocle:resize
* monocle:bookchanging (c)
* monocle:bookchange
* monocle:pagechanging (c)
* monocle:pagechange
* monocle:contact:start (c)
* monocle:contact:move (c)
* monocle:contact:end (c)
* monocle:contact:start:unhandled (c)
* monocle:contact:move:unhandled (c)
* monocle:contact:end:unhandled (c)
* monocle:turn


## Adding your own controls

Controls are objects that adhere to a specified interface. They can
be any kind of object. They are added to a Reader object like this:

    // The reader object being in the variable named 'reader'...
    var reader = Monocle.Reader(someDiv);
    // And the control object being in the variable named 'control'...
    var control = someObject;

    reader.addControl(control, 'standard');

The Reader's addControl method takes the control, a control type string, and
an options object. The control type string can be one of:

* `standard` (a DOM element that floats above or near the pages)
* `page` (DOM elements that sit within the page - one control element is
    created for each page element)
* `modal` (an overlaying DOM element where clicking away does nothing)
* `popover` (an overlaying DOM element where clicking away hides the control)
* `invisible`

Presently, the options argument to addControl has one recognized property:

* `hidden` - if true, control element is hidden as soon as it is created.

The control interface is as follows:

Methods:

* `createControlElements(parentNode)`

Note that the `createControlElements` method is not strictly required for
controls that are always added as 'invisible'. The method should return a
DOM element (which can contain as many child elements as you like) -
although again, this is optional for invisible controls. You should not
insert the DOM element into the parentNode - the Reader will do this for you.


### Alternative page flipping mechanisms

Flippers are objects that follow a defined interface, and do the hard labour
of actually turning the page. They typically listen for user interaction of
some kind, then tell the reader that they are changing the page.

Flippers must be a 'class' (ie, instantiable via 'new') - the reader does
the instantiation.

You can set the flipper as an option to the Reader initialization command, eg:

    var reader = Monocle.Reader('someElementId', null, { flipper: MyFlipper });

Monocle comes with three built in flipper classes:

* `Monocle.Flippers.Slider` - the animated, sliding page turns (default)
* `Monocle.Flippers.Scroller` - text rolls across the screen, like a scroll
* `Monocle.Flippers.Instant` - pages immediately change, without animation
* `Monocle.Flippers.Legacy` - for browsers that don't support columns.

The flipper interface is as follows.

Constructor arguments:

* `reader`
* `setPageFunction` - the 'private' method of the reader that should be invoked
    whenever a page is being changed. The actual flipper-specific logic to
    change the page is generally provided in a callback to this invocation.
    See the existing flippers for examples.

Properties:

* `pageCount` - must be an integer

Methods:

* `addPage(pageDiv)`
* `visiblePages()`
* `getPlace(pageDiv)`
* `moveTo(locus)`
* `listenForInteraction()`


### Javascript Object Style

In this incarnation at least, Monocle uses a Javascript idiom for defining
many of the core classes. This is designed to declutter the classes, clarify
their API, and reduce dependency problems that would constrain the progress of
the project at this early stage.

Essentially, the constructor function returns not the instance itself, but
an object that references the public methods and properties of that object.

The class idiom looks like this:

    Monocle.Foo = function (args) {
      // Allows the constructor function to be an object factory itself,
      // ie: "Monocle.Foo()" is the same as "new Monocle.Foo()".
      if (Monocle == this) { return new Monocle.Foo(args); }

      // Conventional name for any class constants.
      var k = {
        A_CONSTANT: 'Foo',
        PI: 3.14
      };

      // Conventional name for any publicly accessible properties (instance
      // variables).
      var p = {
        someVariable: 'bar'
      };

      // Conventional name for the object that is returned by the constructor,
      // allowing access to the public methods and properties by external
      // code.
      var API = {
        constructor: Monocle.Foo,
        properties: p,
        constants: k
      };


      // A method that will be exposed via the API.
      function examplePublicMethod() {
      }


      // A method that is only available to code within the constructor itself.
      function exampleInternalMethod() {
      }

      // Typically, public methods are attached to the API just before
      // returning, for easier scannability of the API.
      API.examplePublicMethod = examplePublicMethod;

      return API;
    }

This allows a quite concise, clear coding style. However, it does make class
inheritance somewhat limited. Let's see how it goes.
