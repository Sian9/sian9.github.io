const pages = [
  { href: "index.html", label: "Home" },
  { href: "components.html", label: "Components" },
  { href: "learn.html", label: "Learn" },
  { href: "quiz.html", label: "Quiz" },
  { href: "log.html", label: "Today I Learned" }
];

const current = location.pathname.split("/").pop() || "index.html";

const nav = pages
  .map(p => `<a href="${p.href}" class="${p.href === current ? "active" : ""}">${p.label}</a>`)
  .join("");

document.getElementById("site-header").innerHTML =
  `<header class="site"><a class="brand" href="index.html">✈ My Aviation Playground</a><nav>${nav}</nav></header>`;

document.getElementById("site-footer").innerHTML =
  `<footer class="site">Personal educational project. Not for maintenance or operational use. Always refer to approved maintenance data.</footer>`;