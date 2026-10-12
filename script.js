/* ===========================================================
   ECHELON YOUNG INNOVATORS HACKATHON 2026
   Page behaviour

   1. Countdown to the next milestone
   2. Mobile menu
   3. Glass scene (hero parallax)
   4. Flip cards
   5. Timeline progress
   6. Reveal on scroll
   7. Custom cursor
   8. Status strip
   9. Track spotlight
  10. Poster popup
  11. Footer year
   =========================================================== */

/* "use strict" makes the browser report sloppy mistakes
   instead of silently guessing what you meant. */
"use strict";


/* -----------------------------------------------------------
   1. COUNTDOWN

   The page counts down to whichever milestone is next.
   Once registration closes, it moves on to the online round,
   and so on. After the finale it shows a closing message.

   EDIT HERE if a date changes. The format is:
   YYYY-MM-DDTHH:MM:SS+05:30   ( +05:30 means India time )
   ----------------------------------------------------------- */
var MILESTONES = [
  { label: "Registration opens in",   date: "2026-10-12T10:00:00+05:30" },
  { label: "Registration closes in",  date: "2026-10-30T23:59:59+05:30" },
  { label: "Online round closes in",  date: "2026-11-05T23:59:59+05:30" },
  { label: "Results announced in",    date: "2026-11-10T10:00:00+05:30" },
  { label: "Grand finale begins in",  date: "2026-11-21T09:00:00+05:30" }
];

var FINISHED_MESSAGE = "The hackathon has concluded. Thank you for taking part.";

function initCountdown() {
  var box      = document.getElementById("countdown");
  var labelEl  = document.getElementById("countdown-label");
  var daysEl   = document.getElementById("cd-days");
  var hoursEl  = document.getElementById("cd-hours");
  var minsEl   = document.getElementById("cd-mins");
  var secsEl   = document.getElementById("cd-secs");

  // If any piece is missing from the HTML, stop rather than crash.
  if (!box || !labelEl || !daysEl || !hoursEl || !minsEl || !secsEl) {
    return;
  }

  // Turn the text dates into real dates, dropping any that are invalid.
  var schedule = [];
  for (var i = 0; i < MILESTONES.length; i++) {
    var when = new Date(MILESTONES[i].date);
    if (isNaN(when.getTime())) {
      // A mistyped date is skipped instead of showing "NaN" on the page.
      continue;
    }
    schedule.push({ label: MILESTONES[i].label, when: when });
  }

  // Earliest first, so "the next one" is simply the first future entry.
  schedule.sort(function (a, b) { return a.when - b.when; });

  var timerId = null;

  function pad(value) {
    return value < 10 ? "0" + value : String(value);
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Only touches a number when it has actually changed, and replays the
  // small drop-in animation on it. Reading offsetWidth in between is what
  // lets the same animation play a second time.
  function setDigit(el, value) {
    if (el.textContent === value) { return; }
    el.textContent = value;
    if (reducedMotion) { return; }
    el.classList.remove("is-ticking");
    void el.offsetWidth;
    el.classList.add("is-ticking");
  }

  function showFinished() {
    labelEl.textContent = FINISHED_MESSAGE;
    var row = box.querySelector(".countdown-row");
    if (row) { row.style.display = "none"; }
    if (timerId !== null) { clearInterval(timerId); }
  }

  function tick() {
    var now = Date.now();
    var next = null;

    for (var j = 0; j < schedule.length; j++) {
      if (schedule[j].when.getTime() > now) {
        next = schedule[j];
        break;
      }
    }

    // Every date is in the past, or none were valid.
    if (next === null) {
      showFinished();
      return;
    }

    var msLeft = next.when.getTime() - now;
    var totalSeconds = Math.floor(msLeft / 1000);

    labelEl.textContent = next.label;
    setDigit(daysEl,  pad(Math.floor(totalSeconds / 86400)));
    setDigit(hoursEl, pad(Math.floor((totalSeconds % 86400) / 3600)));
    setDigit(minsEl,  pad(Math.floor((totalSeconds % 3600) / 60)));
    setDigit(secsEl,  pad(totalSeconds % 60));
  }

  tick();                              // fill the numbers immediately
  timerId = setInterval(tick, 1000);   // then update every second
}


/* -----------------------------------------------------------
   2. MOBILE MENU
   ----------------------------------------------------------- */
function initMenu() {
  var button = document.getElementById("menu-toggle");
  var menu   = document.getElementById("site-nav");

  if (!button || !menu) { return; }

  button.addEventListener("click", function () {
    var isOpen = menu.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(isOpen));
    button.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  });

  // Tapping a link should close the menu, not leave it covering the page.
  var links = menu.querySelectorAll("a");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function () {
      menu.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open menu");
    });
  }

  // If the window is widened past the mobile breakpoint while the menu
  // is open, clear the open state so the desktop layout is correct.
  window.addEventListener("resize", function () {
    if (window.innerWidth > 700 && menu.classList.contains("is-open")) {
      menu.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", "Open menu");
    }
  });
}


/* -----------------------------------------------------------
   3. GLASS SCENE

   The cube and puzzle pieces in the hero respond to the pointer
   and to scrolling. The whole group turns a little towards the
   pointer, and each shape shifts by its own data-depth number, so
   near pieces move more than far ones. That difference is what
   makes it read as layered glass rather than a flat picture.

   Only on wide screens. Phones keep just the gentle floating from
   the stylesheet, and anyone who asked their device to reduce
   motion gets a still scene.
   ----------------------------------------------------------- */
function initHeroScene() {
  var hero  = document.getElementById("home");
  var inner = document.getElementById("hero-scene-inner");

  if (!hero || !inner) { return; }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) { return; }

  var shapes   = inner.querySelectorAll(".shape");
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var wide     = window.matchMedia("(min-width: 981px)");

  var mx = 0;          // pointer position across the hero, -1 to 1
  var my = 0;
  var pending = false;

  function clamp(n) { return Math.max(-1, Math.min(1, n)); }

  function render() {
    pending = false;

    // On a narrow screen, clear anything set earlier and stop
    if (!wide.matches) {
      inner.style.transform = "";
      for (var k = 0; k < shapes.length; k++) { shapes[k].style.transform = ""; }
      return;
    }

    // Only scrolling within the hero matters
    var scrolled = Math.min(window.pageYOffset || 0, hero.offsetHeight);

    inner.style.transform =
      "rotateY(" + (mx * 14).toFixed(2) + "deg) rotateX(" + (-my * 10).toFixed(2) + "deg)";

    for (var i = 0; i < shapes.length; i++) {
      var depth = parseFloat(shapes[i].getAttribute("data-depth")) || 1;
      var x = mx * depth * 26;
      var y = my * depth * 18 - scrolled * depth * 0.18;
      var z = depth * 40;
      shapes[i].style.transform =
        "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px," + z.toFixed(0) + "px)";
    }
  }

  // At most one update per screen refresh, however fast events arrive
  function schedule() {
    if (pending) { return; }
    pending = true;
    window.requestAnimationFrame(render);
  }

  if (canHover) {
    hero.addEventListener("mousemove", function (event) {
      var box = hero.getBoundingClientRect();
      mx = clamp((event.clientX - box.left) / box.width * 2 - 1);
      my = clamp((event.clientY - box.top) / box.height * 2 - 1);
      schedule();
    });

    // Settle back to the middle when the pointer leaves
    hero.addEventListener("mouseleave", function () {
      mx = 0;
      my = 0;
      schedule();
    });
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  render();
}


/* -----------------------------------------------------------
   3b. 3D GLASS CUBE

   Builds the big cube in the hero out of eight glass blocks, each
   with six faces, so it is genuinely three dimensional and can turn.
   All the look and movement live in the stylesheet; this only
   creates the pieces. If anything here fails, the flat drawing that
   is already in the HTML stays on screen.
   ----------------------------------------------------------- */
function initCube3D() {
  var holder = document.getElementById("cube3d");
  if (!holder) { return; }

  // Needs 3D transforms and container units. Very old browsers keep
  // the flat drawing.
  if (!window.CSS || !CSS.supports("width", "1cqw") ||
      !CSS.supports("transform-style", "preserve-3d")) {
    return;
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var rot = document.createElement("div");
  rot.className = "c3-rot" + (reduced ? "" : " is-breathing");

  var FACES = ["front", "back", "right", "left", "top", "bottom"];

  // Which edge of each outer face gets a jigsaw tab, so the tabs sit
  // on the seams between blocks. Worked out per block position.
  function tabFor(face, x, y, z) {
    if (face === "front")  { return x < 0 ? "tab-r" : null; }
    if (face === "back")   { return x < 0 ? "tab-l" : null; }
    if (face === "right")  { return z > 0 ? "tab-r" : null; }
    if (face === "left")   { return z < 0 ? "tab-r" : null; }
    if (face === "top")    { return y < 0 && z < 0 ? "tab-b" : null; }
    return null;
  }

  // Is this face on the outside of the big cube?
  function isOuter(face, x, y, z) {
    return (face === "front" && z > 0) || (face === "back" && z < 0) ||
           (face === "right" && x > 0) || (face === "left" && x < 0) ||
           (face === "top" && y < 0)   || (face === "bottom" && y > 0);
  }

  [-1, 1].forEach(function (x) {
    [-1, 1].forEach(function (y) {
      [-1, 1].forEach(function (z) {
        var cell = document.createElement("div");
        cell.className = "c3-cell";
        cell.style.setProperty("--x", x);
        cell.style.setProperty("--y", y);
        cell.style.setProperty("--z", z);

        FACES.forEach(function (face) {
          var el = document.createElement("div");
          el.className = "c3-face c3-" + face;
          var tab = isOuter(face, x, y, z) ? tabFor(face, x, y, z) : null;
          if (tab) { el.className += " has-tab " + tab; }
          cell.appendChild(el);
        });

        rot.appendChild(cell);
      });
    });
  });

  holder.innerHTML = "";
  holder.appendChild(rot);
}


/* -----------------------------------------------------------
   4. FLIP CARDS

   Each card in "Who can take part" turns over when pressed.
   Opening one turns any other open card back over.
   The cards are buttons, so Enter and Space already work and
   screen readers announce them. All this does is flip the
   aria-expanded value; the CSS does the turning.
   ----------------------------------------------------------- */
function initFlipCards() {
  var cards = document.querySelectorAll(".rule");

  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener("click", function () {
      var wasOpen = this.getAttribute("aria-expanded") === "true";

      // Turn every card back to its front first, so only one is ever open
      for (var k = 0; k < cards.length; k++) {
        cards[k].setAttribute("aria-expanded", "false");
      }

      // Then open this one, unless it was the open one being closed
      if (!wasOpen) { this.setAttribute("aria-expanded", "true"); }
    });
  }
}


/* -----------------------------------------------------------
   5. TIMELINE PROGRESS

   Reads the dates written on each stage in the HTML and marks each
   one as finished, happening now, or still to come. It also fills
   the rail up to wherever we are. Nothing here needs editing when a
   date changes; change the date in index.html and this follows.
   ----------------------------------------------------------- */
function initTimeline() {
  var list = document.getElementById("timeline");
  var fill = document.getElementById("tl-fill");

  if (!list) { return; }

  var steps = list.querySelectorAll(".tl-step");
  if (steps.length === 0) { return; }

  var now = Date.now();
  var lastFinished = -1;
  var currentIndex = -1;

  for (var i = 0; i < steps.length; i++) {
    var step = steps[i];
    var start = new Date(step.getAttribute("data-start")).getTime();
    var end   = new Date(step.getAttribute("data-end")).getTime();

    // A mistyped date is skipped rather than breaking the whole row
    if (isNaN(start) || isNaN(end)) { continue; }

    var label = document.createElement("span");
    label.className = "tl-status";

    if (now > end) {
      step.classList.add("is-done");
      label.className += " tl-status-done";
      label.textContent = "Done";
      lastFinished = i;
    } else if (now >= start) {
      step.classList.add("is-now");
      label.className += " tl-status-now";
      label.textContent = "Happening now";
      currentIndex = i;
    } else {
      label.className += " tl-status-next";
      label.textContent = (i === 0 || lastFinished === i - 1) ? "Up next" : "To come";
    }

    step.appendChild(label);
  }

  // How far along the rail to fill. Each stage sits at its own
  // fraction of the width, so the fill stops under the live stage.
  if (fill) {
    var reached = currentIndex >= 0 ? currentIndex : lastFinished;
    var fraction = reached < 0 ? 0 : (reached / (steps.length - 1));
    // Published as a variable so the horizontal rail on a laptop and
    // the vertical rail on a phone can both use the same number.
    window.setTimeout(function () {
      fill.style.setProperty("--tl-progress", (fraction * 100).toFixed(1) + "%");
    }, 300);
  }
}


/* -----------------------------------------------------------
   6. REVEAL ON SCROLL

   Sections fade and lift into place the first time they come into
   view. Skipped entirely for anyone who has asked their device to
   reduce motion, and if the browser is too old to support it the
   content simply shows normally.
   ----------------------------------------------------------- */
function initReveal() {
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var targets = document.querySelectorAll("[data-reveal], [data-stagger]");

  if (targets.length === 0) { return; }

  // No support, or motion turned down: show everything at once
  if (reduced || typeof window.IntersectionObserver !== "function") {
    for (var i = 0; i < targets.length; i++) {
      targets[i].classList.add("is-revealed");
    }
    return;
  }

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        watcher.unobserve(entry.target);   // only ever happens once
      }
    });
  }, {
    // Fires once about a tenth of the thing is showing, and a little
    // before it reaches the bottom edge, so it is already settling
    // by the time it is properly in view.
    threshold: 0.1,
    rootMargin: "0px 0px -60px 0px"
  });

  for (var j = 0; j < targets.length; j++) {
    watcher.observe(targets[j]);
  }
}


/* -----------------------------------------------------------
   6b. PUZZLE SNAP

   The two pieces above "Registration closes" click together every
   time they come into view, and drift apart again once they leave,
   so the snap replays each time someone scrolls back to it.
   ----------------------------------------------------------- */
function initSnap() {
  var snap = document.getElementById("snap");
  if (!snap) { return; }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // No motion wanted, or a very old browser: just show them joined
  if (reduced || typeof window.IntersectionObserver !== "function") {
    snap.classList.add("is-revealed");
    return;
  }

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        snap.classList.add("is-revealed");
      } else {
        snap.classList.remove("is-revealed");
      }
    });
  }, { threshold: 0.6 });

  watcher.observe(snap);
}


/* -----------------------------------------------------------
   7. CUSTOM CURSOR

   A dot that sits exactly on the pointer and a ring that trails
   behind it. The ring catches up a fraction of the distance on
   every frame, which is what gives it the lag.

   Only runs where there is a real mouse. The native cursor is
   hidden only after this is working, so if anything here fails
   the visitor still has an ordinary pointer.
   ----------------------------------------------------------- */
function initCursor() {
  var ring = document.getElementById("cursor-ring");
  var dot  = document.getElementById("cursor-dot");

  if (!ring || !dot) { return; }

  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduced  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canHover || reduced) { return; }

  // Start both shapes in the middle so they do not jump in from a corner
  var pointerX = window.innerWidth / 2;
  var pointerY = window.innerHeight / 2;
  var ringX = pointerX;
  var ringY = pointerY;

  var EASING = 0.18;         // how quickly the ring catches up, 0 to 1
  var started = false;

  document.addEventListener("mousemove", function (event) {
    pointerX = event.clientX;
    pointerY = event.clientY;

    if (!started) {
      started = true;
      ringX = pointerX;
      ringY = pointerY;
      // Only now, once it is definitely working, hide the real cursor
      document.documentElement.classList.add("has-cursor");
    }
  });

  // Hide the pair when the pointer leaves the window
  document.addEventListener("mouseleave", function () {
    ring.style.opacity = "0";
    dot.style.opacity = "0";
  });

  document.addEventListener("mouseenter", function () {
    if (started) {
      ring.style.opacity = "";
      dot.style.opacity = "";
    }
  });

  // Open the ring up over anything you can click
  var clickable = "a, button, summary, [role='button']";

  document.addEventListener("mouseover", function (event) {
    if (event.target.closest && event.target.closest(clickable)) {
      ring.classList.add("is-over");
    }
  });

  document.addEventListener("mouseout", function (event) {
    if (event.target.closest && event.target.closest(clickable)) {
      ring.classList.remove("is-over");
    }
  });

  function frame() {
    // Move the ring a fraction of the remaining distance each frame
    ringX += (pointerX - ringX) * EASING;
    ringY += (pointerY - ringY) * EASING;

    ring.style.transform = "translate(" + ringX.toFixed(1) + "px," + ringY.toFixed(1) + "px)";
    dot.style.transform  = "translate(" + pointerX + "px," + pointerY + "px)";

    window.requestAnimationFrame(frame);
  }

  window.requestAnimationFrame(frame);
}


/* -----------------------------------------------------------
   8. STATUS STRIP

   Writes the live state into the strip at the top of the hero,
   using the same stage dates as the timeline so the two can
   never disagree.
   ----------------------------------------------------------- */
function initHud() {
  var out = document.getElementById("hud-state");
  if (!out) { return; }

  var steps = document.querySelectorAll(".tl-step");
  var now = Date.now();
  var text = "SYS \u00B7 ONLINE";

  for (var i = 0; i < steps.length; i++) {
    var start = new Date(steps[i].getAttribute("data-start")).getTime();
    var end   = new Date(steps[i].getAttribute("data-end")).getTime();
    var name  = steps[i].querySelector("h3");

    if (isNaN(start) || isNaN(end) || !name) { continue; }

    var label = name.textContent.trim().toUpperCase();

    if (now >= start && now <= end) {
      text = label + " \u00B7 LIVE";
      break;
    }
    if (now < start) {
      text = label + " \u00B7 OPENS SOON";
      break;
    }
  }

  out.textContent = text;
}


/* -----------------------------------------------------------
   9. TRACK SPOTLIGHT

   While the tracks section is on screen, each track lights up in
   turn and a glow slides along the rail to it. The cycle stops
   when the section scrolls away, so nothing runs in the
   background, and hovering a track holds the light on that one.
   ----------------------------------------------------------- */
function initTrackSpotlight() {
  var list = document.querySelector(".tracks");
  if (!list) { return; }

  var items = list.querySelectorAll(".tk-item");
  if (items.length === 0) { return; }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) { return; }

  var HOLD = 1900;          // how long each one stays lit
  var index = 0;
  var timer = null;
  var paused = false;

  var glow = document.getElementById("tk-glow");

  function light(i) {
    for (var n = 0; n < items.length; n++) {
      items[n].classList.toggle("is-active", n === i);
    }
    list.style.setProperty("--tk-active", String(i));

    // Measure where the lit circle actually is and move the light
    // there. Measuring is reliable on both layouts; working it out
    // from percentages was not, because the circles sit in grid
    // columns while the rail is inset from the edges.
    if (glow) {
      var node = items[i].querySelector(".tk-node");
      if (node) {
        var a = node.getBoundingClientRect();
        var b = list.getBoundingClientRect();
        glow.style.setProperty("--tk-x", (a.left - b.left + a.width / 2).toFixed(1) + "px");
        glow.style.setProperty("--tk-y", (a.top - b.top + a.height / 2).toFixed(1) + "px");
      }
    }
  }

  // Re-measure if the window is resized while a track is lit
  window.addEventListener("resize", function () {
    if (timer !== null || paused) { light(index); }
  });

  function step() {
    if (paused) { return; }
    index = (index + 1) % items.length;
    light(index);
  }

  function start() {
    if (timer !== null) { return; }
    list.classList.add("is-cycling");
    light(index);
    timer = window.setInterval(step, HOLD);
  }

  function stop() {
    if (timer === null) { return; }
    window.clearInterval(timer);
    timer = null;
    list.classList.remove("is-cycling");
    for (var n = 0; n < items.length; n++) {
      items[n].classList.remove("is-active");
    }
  }

  // Hovering holds the light on whichever one you are pointing at
  for (var i = 0; i < items.length; i++) {
    (function (item, position) {
      item.addEventListener("mouseenter", function () {
        if (timer === null) { return; }
        paused = true;
        index = position;
        light(position);
      });
      item.addEventListener("mouseleave", function () {
        paused = false;
      });
    })(items[i], i);
  }

  // Only run while the section is actually on screen
  if (typeof window.IntersectionObserver !== "function") {
    start();
    return;
  }

  var watcher = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { start(); } else { stop(); }
    });
  }, { threshold: 0.25 });

  watcher.observe(list);
}


/* -----------------------------------------------------------
   10. POSTER POPUP

   Appears two seconds after the page loads, so the visitor sees
   the site first. Rules it keeps to:

     - shown at most once an hour per browser
     - closes on the X, on "Maybe later", on Escape, or on a click
       outside the card
     - the page behind cannot scroll while it is open
     - hidden in the stylesheet by default, so a broken script
       cannot leave the site covered by a dead overlay
     - keyboard focus moves into it and returns afterwards

   Add ?popup=1 to the address to force it to show.
   ----------------------------------------------------------- */
function initPromo() {
  var promo = document.getElementById("promo");
  if (!promo) { return; }

  var card    = promo.querySelector(".promo-card");
  var closeEl = document.getElementById("promo-close");
  var later   = document.getElementById("promo-dismiss");

  var STORAGE_KEY = "eyi-promo-seen";

  // How long before a returning visitor sees it again.
  // 60 * 60 * 1000 is one hour. For a day, use 24 * 60 * 60 * 1000.
  var SHOW_AGAIN_AFTER = 60 * 60 * 1000;

  var DELAY = 2000;          // how long after load it appears

  var forced = window.location.search.indexOf("popup=1") !== -1 ||
               window.location.hash === "#popup";

  if (!forced) {
    try {
      var last = window.localStorage.getItem(STORAGE_KEY);
      if (last && (Date.now() - Number(last)) < SHOW_AGAIN_AFTER) { return; }
    } catch (e) { /* no storage available, carry on and show it */ }
  }

  var opener = null;
  var open = false;

  window.setTimeout(function () {
    opener = document.activeElement;

    promo.removeAttribute("hidden");
    document.documentElement.classList.add("promo-open");

    // Next frame, so the fade and slide actually run
    window.requestAnimationFrame(function () {
      promo.classList.add("is-open");
      open = true;
      if (closeEl) { closeEl.focus(); }
    });

    try { window.localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (e) {}
  }, DELAY);

  function close() {
    if (!open) { return; }
    open = false;

    promo.classList.remove("is-open");
    document.documentElement.classList.remove("promo-open");

    // Take it out of the page once it has faded, so it can never sit
    // invisibly on top and swallow clicks.
    window.setTimeout(function () {
      promo.setAttribute("hidden", "");
      if (opener && typeof opener.focus === "function") { opener.focus(); }
    }, 400);
  }

  if (closeEl) { closeEl.addEventListener("click", close); }
  if (later)   { later.addEventListener("click", close); }

  // A click on the dark area outside the card closes it
  promo.addEventListener("click", function (event) {
    if (card && !card.contains(event.target)) { close(); }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { close(); }
  });
}


/* -----------------------------------------------------------
   11. FOOTER YEAR
   ----------------------------------------------------------- */
function initYear() {
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }
}


/* -----------------------------------------------------------
   START
   The script tag sits at the end of the body, so the HTML is
   already loaded by the time this runs.
   ----------------------------------------------------------- */
initPromo();
initCountdown();
initMenu();
initCube3D();
initHeroScene();
initFlipCards();
initTimeline();
initHud();
initReveal();
initSnap();
initTrackSpotlight();
initCursor();
initYear();