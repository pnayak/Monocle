Monocle.Events = {}


// Register a function to be invoked when an event fires.
//
Monocle.Events.listen = function (elem, evtType, fn, useCapture) {
  if (elem.addEventListener) {
    return elem.addEventListener(evtType, fn, useCapture || false);
  } else if (elem.attachEvent) {
    return elem.attachEvent('on'+evtType, fn);
  }
}


// De-register a function from an event.
//
Monocle.Events.deafen = function (elem, evtType, fn, useCapture) {
  if (elem.removeEventListener) {
    return elem.removeEventListener(evtType, fn, useCapture || false);
  } else if (elem.detachEvent) {
    try {
      return elem.detachEvent('on'+evtType, fn);
    } catch(e) {}
  }
}


// 'fns' argument is an object like:
//
//   {
//     'start': function () { ... },
//     'move': function () { ... },
//     'end': function () { ... },
//     'cancel': function () { ... }
//   }
//
// All of the functions in this object are optional.
//
// 'options' argument:
//
//   {
//     'useCapture': true/false
//   }
//
// Returns an object that can later be passed to Monocle.Events.deafenForContact
//
Monocle.Events.listenForContact = function (elem, fns, options) {
  var listeners = {};

  var cursorInfo = function (evt, ci) {
    evt.m = evt.monocleData = {
      offsetX: ci.offsetX,
      offsetY: ci.offsetY,
      pageX: ci.pageX,
      pageY: ci.pageY
    };
    return evt;
  }

  if (!Monocle.Browser.has.touch) {
    if (fns.start) {
      listeners.mousedown = function (evt) {
        if (evt.button != 0) { return; }
        fns.start(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mousedown', listeners.mousedown);
    }
    if (fns.move) {
      listeners.mousemove = function (evt) {
        fns.move(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mousemove', listeners.mousemove);
    }
    if (fns.end) {
      listeners.mouseup = function (evt) {
        fns.end(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mouseup', listeners.mouseup);
    }
    if (fns.cancel) {
      listeners.mouseout = function (evt) {
        obj = evt.relatedTarget || e.fromElement;
        while (obj && (obj = obj.parentNode)) {
          if (obj == elem) { return; }
        }
        fns.cancel(cursorInfo(evt, evt));
      }
      Monocle.Events.listen(elem, 'mouseout', listeners.mouseout);
    }
  } else {
    if (fns.start) {
      listeners.touchstart = function (evt) {
        if (evt.touches.length > 1) { return; }
        fns.start(cursorInfo(evt, evt.targetTouches[0]));
      }
      Monocle.Events.listen(elem, 'touchstart', listeners.touchstart);
    }
    if (fns.move) {
      listeners.touchmove = function (evt) {
        if (evt.touches.length > 1) { return; }
        // cursorInfo(evt, evt.targetTouches[0]);
        // if (
        //   evt.m.offsetX <= 0 ||
        //   evt.m.offsetY <= 0 ||
        //   evt.m.offsetX >= elem.offsetWidth ||
        //   evt.m.offsetY >= elem.offsetHeight
        // ) {
        //   return fns.cancel ? fns.cancel(evt) : null;
        // } else {
        //   fns.move(evt);
        // }
        fns.move(cursorInfo(evt, evt.targetTouches[0]));
      }
      Monocle.Events.listen(elem, 'touchmove', listeners.touchmove);
    }
    if (fns.end) {
      listeners.touchend = function (evt) {
        fns.end(cursorInfo(evt, evt.changedTouches[0]));
        evt.preventDefault();
      }
      Monocle.Events.listen(elem, 'touchend', listeners.touchend);
    }
    if (fns.cancel) {
      listeners.touchcancel = function (evt) {
        fns.cancel(cursorInfo(evt, evt.changedTouches[0]));
      }
      Monocle.Events.listen(elem, 'touchcancel', listeners.touchcancel);
    }
  }

  return listeners;
}


// The 'listeners' argument is a hash of event names and the functions that
// are registered to them -- de-registers the functions from the events.
//
Monocle.Events.deafenForContact = function (elem, listeners) {
  for (evtType in listeners) {
    Monocle.Events.deafen(elem, evtType, listeners[evtType]);
  }
}
