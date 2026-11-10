/* Shared header, footer and menu for every page except the homepage
   (the homepage has its own copy of this markup so it can float over the hero).
   To add a page to the menu, add one line to PAGES. */
(function () {
  "use strict";
  var PAGES = [
    { href: "components.html", label: "Components" },
    { href: "quiz.html", label: "Quiz" },
    { href: "learn.html", label: "Learn" },
    { href: "log.html", label: "Log" }
  ];

  document.documentElement.classList.add("js");

  var body = document.body;
  var root = body.getAttribute("data-root") || "";            // "/" on 404.html so links work from any depth
  var keep = new URLSearchParams(location.search).get("preview") === "all" ? "?preview=all" : "";
  var current = location.pathname.split("/").pop() || "index.html";
  if (current === "component.html") current = "components.html";   // detail pages belong to the library

  var links = PAGES.map(function (p, i) {
    var here = p.href === current;
    return '<li><a href="' + root + p.href + keep + '"' + (here ? ' aria-current="page"' : "") + '>' +
      '<span class="n">0' + (i + 1) + '</span>' + p.label + '</a></li>';
  }).join("");

  var headerHtml =
    '<header class="hd is-solid" id="hd">' +
      '<a class="hd__brand" href="' + root + 'index.html" aria-label="My Aviation Playground, home">' +
        '<svg class="hd__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="M16 3 L19 12 L29 18 L29 21 L19 18 L18 26 L22 29 L22 30.5 L16 29 L10 30.5 L10 29 L14 26 L13 18 L3 21 L3 18 L13 12 Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>' +
        '<span>Aviation Playground</span></a>' +
      '<button class="hd__toggle" id="menuBtn" type="button" aria-expanded="false" aria-controls="menu">' +
        '<span class="hd__label">Menu</span><span class="hd__bars" aria-hidden="true"></span></button>' +
      '<nav class="hd__nav" id="menu" aria-label="Main"><ul>' + links + '</ul></nav>' +
    '</header>';

  var footerHtml =
    '<footer class="ft"><div class="wrap ft__grid">' +
      '<div><p class="ft__brand">Aviation Playground</p>' +
        '<p class="small">Personal educational project. Not for maintenance or operational use. Always refer to approved maintenance data.</p></div>' +
      '<nav aria-label="Footer"><p class="mono ft__h">Explore</p><ul>' +
        '<li><a href="' + root + 'components.html' + keep + '">Components</a></li>' +
        '<li><a href="' + root + 'quiz.html' + keep + '">Quiz</a></li>' +
        '<li><a href="' + root + 'learn.html' + keep + '">Learn</a></li>' +
        '<li><a href="' + root + 'log.html' + keep + '">Today I Learned</a></li></ul></nav>' +
      '<div><p class="mono ft__h">Please note</p>' +
        '<p class="small">Study notes are an unofficial aid. Refer to the current DGCA CAR-66. The aircraft drawings are generic illustrations and do not show a specific aircraft type.</p></div>' +
    '</div></footer>';

  var skip = document.createElement("a");
  skip.className = "skip"; skip.href = "#main"; skip.textContent = "Skip to content";
  body.insertBefore(skip, body.firstChild);

  var headerSlot = document.getElementById("site-header");
  var footerSlot = document.getElementById("site-footer");
  if (headerSlot) headerSlot.outerHTML = headerHtml;
  if (footerSlot) footerSlot.outerHTML = footerHtml;

  /* mobile menu: opens full screen, Esc closes, focus stays inside while open */
  var menuBtn = document.getElementById("menuBtn");
  var menu = document.getElementById("menu");
  if (!menuBtn || !menu) return;

  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
    document.documentElement.classList.toggle("menu-open", open);
    if (open) setTimeout(function () { var a = menu.querySelector("a"); if (a) a.focus(); }, 60);
  }
  menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
  document.addEventListener("keydown", function (e) {
    if (menuBtn.getAttribute("aria-expanded") !== "true") return;
    if (e.key === "Escape") { setMenu(false); menuBtn.focus(); return; }
    if (e.key === "Tab") {
      var items = [menuBtn].concat([].slice.call(menu.querySelectorAll("a")));
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && i === items.length - 1) { e.preventDefault(); items[0].focus(); }
    }
  });
  [].slice.call(menu.querySelectorAll("a")).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  window.matchMedia("(min-width: 761px)").addEventListener("change", function (m) { if (m.matches) setMenu(false); });
})();
