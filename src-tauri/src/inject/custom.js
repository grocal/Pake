// Pake custom injection — Slack wrapper fix.
//
// Slack hands off login/workspace launch (e.g. the ".../login/z-app-..." URL)
// by calling window.open(). With no in-app new-window handler, Pake/WebView2
// sends that request to the system browser, breaking sign-in inside the app.
//
// Fix: intercept window.open for Slack URLs and navigate the CURRENT window
// instead, so the whole flow stays inside the wrapper. Non-Slack URLs keep
// their normal behavior. Uses a get/set property so it survives Pake's own
// event.js re-assigning window.open, regardless of injection order.
(function () {
  function toAbs(u) {
    try { return new URL(u, location.href).href; } catch (e) { return null; }
  }
  function isSlack(u) {
    var h;
    try { h = new URL(u, location.href).hostname; } catch (e) { return false; }
    return h === 'slack.com' || (h && h.slice(-10) === '.slack.com');
  }

  // Whatever window.open is at any moment (native, or Pake's event.js wrapper).
  var current = (typeof window.open === 'function') ? window.open.bind(window) : null;

  function pakeOpen(url, target, features) {
    try {
      if (url && isSlack(url)) {
        window.location.assign(toAbs(url));
        return window; // truthy stub so callers don't crash on null
      }
    } catch (e) { /* fall through to default */ }
    return current ? current(url, target, features) : null;
  }

  try {
    Object.defineProperty(window, 'open', {
      configurable: true,
      get: function () { return pakeOpen; },
      set: function (fn) {
        if (typeof fn === 'function') {
          current = fn.bind(window);
        }
      },
    });
  } catch (e) {
    window.open = pakeOpen;
  }
})();
