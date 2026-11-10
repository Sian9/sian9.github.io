// Add ?preview=all to the address while writing to see unpublished topics.
const params = new URLSearchParams(location.search);
const SHOW_ALL = params.get("preview") === "all";

const root = document.getElementById("learn");

let topics = [];
let activeCategory = "";
let searchQuery = "";

function esc(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

async function init() {
  try {
    const response = await fetch("data/learn.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    topics = SHOW_ALL ? data : data.filter(t => t.published !== false);

    window.addEventListener("popstate", route);
    route();
  } catch (err) {
    root.innerHTML = `<p class="muted">Could not load learn topics (${esc(err.message)}).</p>`;
  }
}

function route() {
  const currentParams = new URLSearchParams(location.search);
  const slug = currentParams.get("topic");
  if (slug) {
    const topic = topics.find(t => t.slug === slug || String(t.id) === slug);
    if (topic) {
      renderDetail(topic);
      window.scrollTo(0, 0);
      return;
    }
  }
  renderCatalog();
}

function navigateTo(slug) {
  const url = new URL(location.href);
  if (slug) {
    url.searchParams.set("topic", slug);
  } else {
    url.searchParams.delete("topic");
  }
  history.pushState({}, "", url);
  route();
}

function renderCatalog() {
  const categories = [...new Set(topics.map(t => t.category).filter(Boolean))];

  root.innerHTML = `
    <header class="page-head">
      <p class="kicker mono"><span>[03]</span> Beyond the manuals</p>
      <h1>How Aviation Actually Works.</h1>
      <p class="lead">Behind-the-scenes engineering philosophy, airworthiness rules, leasing realities, and line-maintenance practices that explain why the industry operates the way it does.</p>
    </header>

    <div class="filters">
      <input type="search" id="learn-search" placeholder="Search questions, concepts, or keywords (e.g., 400 Hz, MEL, LLP, lease)..." value="${esc(searchQuery)}" aria-label="Search topics">
    </div>

    <div class="chips" id="learn-chips"></div>
    <p class="muted mono" id="learn-count"></p>
    <div class="topic-list" id="learn-list"></div>
  `;

  const searchInput = document.getElementById("learn-search");
  searchInput.addEventListener("input", e => {
    searchQuery = e.target.value.trim();
    updateCatalogList();
  });

  renderCategoryChips(categories);
  updateCatalogList();
}

function renderCategoryChips(categories) {
  const chipsBox = document.getElementById("learn-chips");
  if (!chipsBox) return;
  chipsBox.innerHTML = "";

  const makeChip = (label, value) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip" + (activeCategory === value ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      activeCategory = value;
      renderCategoryChips(categories);
      updateCatalogList();
    });
    return btn;
  };

  chipsBox.appendChild(makeChip("All Topics", ""));
  categories.forEach(cat => chipsBox.appendChild(makeChip(cat, cat)));
}

function updateCatalogList() {
  const listEl = document.getElementById("learn-list");
  const countEl = document.getElementById("learn-count");
  if (!listEl || !countEl) return;

  const q = searchQuery.toLowerCase();
  const filtered = topics.filter(t => {
    const matchesCat = !activeCategory || t.category === activeCategory;
    if (!matchesCat) return false;
    if (!q) return true;
    const hay = [
      t.title,
      t.category,
      t.summary,
      ...(t.tags || []),
      ...(t.keyTakeaways || [])
    ].join(" ").toLowerCase();
    return hay.includes(q);
  });

  countEl.textContent = `${filtered.length} topic${filtered.length === 1 ? "" : "s"}`;

  if (filtered.length === 0) {
    listEl.innerHTML = `<p class="muted" style="padding: 1.5rem 0;">No topics match your filter.</p>`;
    return;
  }

  listEl.innerHTML = filtered.map(t => {
    const href = `?topic=${encodeURIComponent(t.slug)}${SHOW_ALL ? "&preview=all" : ""}`;
    return `
      <a class="topic-row" href="${esc(href)}" data-slug="${esc(t.slug)}">
        <span class="topic-id">${esc(t.code || t.id)}</span>
        <span class="topic-title">${esc(t.title)}</span>
        <span class="topic-meta">${esc(t.category)}</span>
        <span class="topic-status">${esc(t.readTime || "4 min read")} &rarr;</span>
      </a>
    `;
  }).join("");

  listEl.querySelectorAll("a.topic-row").forEach(link => {
    link.addEventListener("click", e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      navigateTo(link.getAttribute("data-slug"));
    });
  });
}

function renderDetail(t) {
  const idx = topics.findIndex(item => item.slug === t.slug);
  const prev = idx > 0 ? topics[idx - 1] : null;
  const next = idx >= 0 && idx < topics.length - 1 ? topics[idx + 1] : null;

  const takeawaysHtml = (t.keyTakeaways && t.keyTakeaways.length)
    ? `<div class="scope">
        <strong>The Core Reality</strong>
        <ul>${t.keyTakeaways.map(item => `<li>${esc(item)}</li>`).join("")}</ul>
      </div>`
    : "";

  const sectionsHtml = (t.sections || []).map(sec => {
    const paras = (sec.paragraphs || []).map(p => `<p>${esc(p)}</p>`).join("");
    return `
      <h2>${esc(sec.heading)}</h2>
      ${paras}
    `;
  }).join("");

  const tableHtml = (t.table && t.table.headers && t.table.rows)
    ? `<div class="table-wrap">
        <table class="formulas">
          <thead>
            <tr>${t.table.headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${t.table.rows.map(row => `<tr>${row.map((cell, i) => i === 0 ? `<td><code>${esc(cell)}</code></td>` : `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>`
    : "";

  const behindScenesHtml = t.behindTheScenes
    ? `<details class="example" open>
        <summary class="mono">${esc(t.behindTheScenes.title || "Behind the Scenes // Real-World Example")}</summary>
        <div style="margin-top: .75rem;">
          ${(t.behindTheScenes.steps || []).length
            ? `<ol>${t.behindTheScenes.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>`
            : ""}
          ${t.behindTheScenes.text ? `<p>${esc(t.behindTheScenes.text)}</p>` : ""}
        </div>
      </details>`
    : "";

  const misconceptionHtml = t.misconception
    ? `<div class="notice">
        <strong class="mono" style="color: var(--amber); display: block; margin-bottom: .25rem;">Common Misconception</strong>
        ${esc(t.misconception)}
      </div>`
    : "";

  const tagsHtml = (t.tags || []).map(tag => `<span class="tag">${esc(tag)}</span>`).join("");

  root.innerHTML = `
    <article class="learn-article">
      <a href="learn.html" class="back" id="back-to-learn">&larr; Back to all topics</a>
      <p class="kicker mono"><span>[${esc(t.code || t.id)}]</span> ${esc(t.category)} &middot; ${esc(t.readTime || "4 min read")}</p>
      <h1>${esc(t.title)}</h1>
      <p class="lead">${esc(t.summary)}</p>

      ${takeawaysHtml}
      ${misconceptionHtml}
      ${sectionsHtml}
      ${tableHtml}
      ${behindScenesHtml}

      <p style="margin-top: 2rem;">${tagsHtml}</p>

      <nav style="display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1rem; margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--line); max-width: 48rem;">
        <div>
          ${prev ? `<a href="?topic=${esc(prev.slug)}" class="secondary-link" data-nav="${esc(prev.slug)}">&larr; ${esc(prev.code)}: ${esc(prev.title)}</a>` : ""}
        </div>
        <div>
          ${next ? `<a href="?topic=${esc(next.slug)}" class="secondary-link" data-nav="${esc(next.slug)}">${esc(next.code)}: ${esc(next.title)} &rarr;</a>` : ""}
        </div>
      </nav>
    </article>
  `;

  document.getElementById("back-to-learn").addEventListener("click", e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigateTo(null);
  });

  root.querySelectorAll("[data-nav]").forEach(link => {
    link.addEventListener("click", e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      navigateTo(link.getAttribute("data-nav"));
    });
  });
}

init();   