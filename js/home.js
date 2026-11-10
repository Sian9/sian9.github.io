/* Home page behaviour. Vanilla JS, no dependencies.
   Sections: 1 helpers · 2 header + menu · 3 reveal · 4 hero parallax · 5 data
             6 systems explorer · 7 discover blocks · 8 statement scroll
   Add ?preview=all to the address while building to include unreviewed content. */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var SHOW_ALL = params.get("preview") === "all";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* 1 · helpers ------------------------------------------------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(text) { var d = document.createElement("div"); d.textContent = text == null ? "" : String(text); return d.innerHTML; }
  function formatDate(iso) {
    var d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function today() { return new Date().toLocaleDateString("en-CA"); }
  function yesterday() { return new Date(Date.now() - 86400000).toLocaleDateString("en-CA"); }
  function plural(n, one, many) { return n + " " + (n === 1 ? one : many); }
  function withPreview(href) {
    if (!SHOW_ALL) return href;
    return href + (href.indexOf("?") === -1 ? "?" : "&") + "preview=all";
  }

  // Keep ?preview=all when moving between pages while building
  $$("[data-keep-preview]").forEach(function (a) { a.setAttribute("href", withPreview(a.getAttribute("href"))); });

  /* 2 · header + mobile menu ----------------------------------------- */
  var hd = $("#hd");
  var sentinel = $("#sentinel");
  if (hd && sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      hd.classList.toggle("is-solid", !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  var menuBtn = $("#menuBtn");
  var menu = $("#menu");
  function setMenu(open) {
    if (!menuBtn || !menu) return;
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("menu-open", open);
    if (open) { setTimeout(function () { var first = $("a", menu); if (first) first.focus(); }, 60); }   // after the menu becomes visible
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    document.addEventListener("keydown", function (e) {
      var open = menuBtn.getAttribute("aria-expanded") === "true";
      if (!open) return;
      if (e.key === "Escape") { setMenu(false); menuBtn.focus(); return; }
      if (e.key === "Tab") {                                    // keep focus inside the open menu
        var items = [menuBtn].concat($$("a", menu));
        var i = items.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
        else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    });
    $$("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    window.matchMedia("(min-width: 761px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });
  }

  /* 3 · reveal on scroll --------------------------------------------- */
  var revealEls = $$(".rv");
  if (revealEls.length) {
    if (!("IntersectionObserver" in window) || reduceMotion) {
      revealEls.forEach(function (el) { el.classList.add("in"); });
    } else {
      var rvIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); rvIO.unobserve(en.target); } });
      }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
      revealEls.forEach(function (el) { rvIO.observe(el); });
    }
  }

  /* 4 · hero parallax (desktop pointer only) ------------------------- */
  var hero = $("#hero");
  if (hero && finePointer && !reduceMotion) {
    var raf = 0, nx = 0, ny = 0;
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      nx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ny = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(function () {
        hero.style.setProperty("--px", nx.toFixed(3));
        hero.style.setProperty("--py", ny.toFixed(3));
        raf = 0;
      });
    }, { passive: true });
    hero.addEventListener("pointerleave", function () { hero.style.setProperty("--px", 0); hero.style.setProperty("--py", 0); });
  }

  /* 5 · data ---------------------------------------------------------- */
  function getJson(path) {
    return fetch(path).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function list(x) { return Array.isArray(x) ? x : []; }

  Promise.all([
    getJson("data/components.json"), getJson("data/questions.json"),
    getJson("data/questions-module3.json"), getJson("data/log.json"), getJson("data/learn.json")
  ]).then(function (res) {
    var comps = list(res[0]).filter(function (c) { return SHOW_ALL || c.reviewed === true; });
    var questions = list(res[1]).concat(list(res[2])).filter(function (q) { return SHOW_ALL || q.reviewed === true; });
    var posts = list(res[3]).filter(function (p) { return SHOW_ALL || p.published === true; })
      .sort(function (a, b) { return b.date.localeCompare(a.date); });
    var learn = res[4] && res[4].modules ? res[4] : null;

    fillIndexStats(comps, questions, posts, learn);
    setupExplorer(comps);
    fillCotd(comps);
    fillLatest(posts);
    fillDaily();
    fillChapters(comps);
  });

  function setStat(key, text) {
    var el = $('[data-stat="' + key + '"] [data-out]');
    if (el && text) el.textContent = text;
  }

  function fillIndexStats(comps, questions, posts, learn) {
    if (comps.length) {
      var chapters = {};
      comps.forEach(function (c) { chapters[c.ata] = 1; });
      setStat("components", plural(comps.length, "entry", "entries") + " · " + plural(Object.keys(chapters).length, "ATA chapter", "ATA chapters"));
    }
    if (questions.length) setStat("quiz", plural(questions.length, "question", "questions"));
    if (posts.length) setStat("log", plural(posts.length, "post", "posts"));
    var learnEl = $("#learnStatus");
    if (learn) {
      var m3 = learn.modules.filter(function (m) { return m.number === 3 && m.available; })[0];
      if (m3) {
        var total = (m3.topics || []).length;
        var ready = (m3.topics || []).filter(function (t) { return t.ready && (t.reviewed || SHOW_ALL); }).length;
        var txt = "Module 3 · " + ready + " of " + total + " topics ready";
        setStat("learn", txt);
        if (learnEl) learnEl.textContent = txt;
      }
    }
  }

  /* 6 · systems explorer --------------------------------------------- */
  var SYSTEMS = {
    ata34: { label: "ATA 34", title: "Navigation", range: [34, 34],
      text: "Systems that tell the aircraft where it is and how it is moving: air data, inertial reference, radio navigation aids, weather radar and collision-avoidance equipment." },
    ata22: { label: "ATA 22", title: "Auto flight", range: [22, 22],
      text: "The autopilot, flight director and flight management computers that guide the aircraft along its planned path." },
    ata27: { label: "ATA 27", title: "Flight controls", range: [27, 27],
      text: "Primary and secondary control surfaces, their actuators and the computers that command them." },
    ata28: { label: "ATA 28", title: "Fuel", range: [28, 28],
      text: "Tanks, pumps, valves and quantity indication that store the fuel and deliver it to the engines and the APU." },
    ata32: { label: "ATA 32", title: "Landing gear", range: [32, 32],
      text: "Gear structure, extension and retraction, wheels and brakes, steering and the computers that monitor them." },
    ata7x: { label: "ATA 71\u201380", title: "Power plant", range: [71, 80],
      text: "The power plant: engine, fuel and control, ignition, oil, exhaust and starting." },
    ata49: { label: "ATA 49", title: "Auxiliary power", range: [49, 49],
      text: "The auxiliary power unit, which supplies electrical power and bleed air when the main engines are not running." }
  };

  function setupExplorer(comps) {
    var panel = $("#panel");
    var spots = $$(".hs");
    if (!panel || !spots.length) return;

    // labels and accessible names come from one table, so the markup cannot drift from the data
    spots.forEach(function (b) {
      var s = SYSTEMS[b.dataset.key];
      if (!s) return;
      b.setAttribute("aria-label", s.label + " " + s.title);
      var lbl = $(".hs__lbl", b); if (lbl) lbl.textContent = s.label;
    });

    function countFor(s) {
      return comps.filter(function (c) { return c.ata >= s.range[0] && c.ata <= s.range[1]; }).length;
    }

    function select(key) {
      var s = SYSTEMS[key]; if (!s) return;
      spots.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.key === key)); });
      var n = countFor(s);
      var href = s.range[0] === s.range[1]
        ? withPreview("components.html?ata=" + s.range[0])
        : withPreview("components.html");
      panel.innerHTML =
        '<p class="mono panel__ata">' + esc(s.label) + '</p>' +
        '<h3>' + esc(s.title) + '</h3>' +
        '<p class="panel__blurb">' + esc(s.text) + '</p>' +
        '<p class="mono panel__data">' + (n ? esc(plural(n, "component", "components")) + " in the library" : "Library entries for this chapter are in preparation") + '</p>' +
        (n ? '<a class="btn btn--primary" href="' + esc(href) + '">Open ' + esc(s.label) + '</a>' : "");
    }

    spots.forEach(function (b) { b.addEventListener("click", function () { select(b.dataset.key); }); });
    select("ata27");
  }

  /* 7 · discover blocks ---------------------------------------------- */
  function fillCotd(comps) {
    var box = $("#cotd"); if (!box) return;
    if (!comps.length) {
      box.innerHTML = '<p class="mono kicker">Component of the day</p><h3 id="cotd-h">Library in preparation</h3>' +
        '<p class="empty">Entries appear here once they have been checked against sources.</p>';
      return;
    }
    // one component all day, a different one tomorrow
    var day = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
    var sorted = comps.slice().sort(function (a, b) { return a.id.localeCompare(b.id); });
    var c = sorted[day % sorted.length];
    var summary = c.function.length > 230 ? c.function.slice(0, 230).replace(/\s+\S*$/, "") + "\u2026" : c.function;
    box.setAttribute("data-ghost", c.ata);
    box.innerHTML =
      '<p class="mono kicker">Component of the day &middot; ATA ' + esc(c.ata) + ' ' + esc(c.ataTitle) + '</p>' +
      '<h3 id="cotd-h">' + esc(c.name) + '</h3><p>' + esc(summary) + '</p>' +
      '<a class="link-arrow" href="' + esc(withPreview("component.html?id=" + encodeURIComponent(c.id))) + '">Read more <span aria-hidden="true">&rarr;</span></a>';
  }

  function fillLatest(posts) {
    var box = $("#latest"); if (!box) return;
    if (!posts.length) {
      box.innerHTML = '<p class="mono kicker">Today I learned</p><h3 id="latest-h">First posts coming</h3><p class="empty">Short notes with sources will appear here.</p>';
      return;
    }
    var p = posts[0];
    var first = (p.body || [])[0] || "";
    if (first.length > 190) first = first.slice(0, 190).replace(/\s+\S*$/, "") + "\u2026";
    box.innerHTML =
      '<p class="mono kicker when">' + esc(formatDate(p.date)) + '</p><h3 id="latest-h">' + esc(p.title) + '</h3><p>' + esc(first) + '</p>' +
      '<a class="link-arrow" href="' + esc(withPreview("log.html")) + '">All posts <span aria-hidden="true">&rarr;</span></a>';
  }

  function fillDaily() {
    var box = $("#daily"); if (!box) return;
    var streak = 0, best = 0;
    try {
      var s = JSON.parse(localStorage.getItem("playground-quiz") || "null");
      if (s) { best = s.best || 0; streak = (s.lastPlayed === today() || s.lastPlayed === yesterday()) ? (s.streak || 0) : 0; }
    } catch (e) { /* storage unavailable */ }
    var bits = [];
    if (streak) bits.push("Streak: " + plural(streak, "day", "days"));
    if (best) bits.push("Best: " + best + "%");
    box.innerHTML =
      '<p class="mono kicker">Daily 5</p><h3 id="daily-h">Five questions. Every day.</h3>' +
      '<p>Explanations and sources after every answer.' + (bits.length ? "<br><strong>" + esc(bits.join(" \u00b7 ")) + "</strong>" : "") + '</p>' +
      '<a class="btn" href="' + esc(withPreview("quiz.html")) + '">Start now</a>';
  }

  function fillChapters(comps) {
    var ul = $("#chapters"); if (!ul) return;
    var seen = {}; comps.forEach(function (c) { seen[c.ata] = 1; });
    var nums = Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });
    if (!nums.length) { ul.hidden = true; return; }
    ul.innerHTML = '<li>In the library</li>' + nums.map(function (n) { return '<li>ATA ' + n + '</li>'; }).join("");
  }

  /* 8 · statement: slide the two lines as the section crosses the screen */
  var stmt = $("#statement");
  if (stmt && "IntersectionObserver" in window && !reduceMotion) {
    var ticking = false;
    function update() {
      var r = stmt.getBoundingClientRect();
      var p = 1 - (r.bottom / (window.innerHeight + r.height));     // 0 as it enters, 1 as it leaves
      stmt.style.setProperty("--p", Math.min(1, Math.max(0, p)).toFixed(3));
      ticking = false;
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { window.addEventListener("scroll", onScroll, { passive: true }); update(); }
      else window.removeEventListener("scroll", onScroll);
    }).observe(stmt);
  }
})();
