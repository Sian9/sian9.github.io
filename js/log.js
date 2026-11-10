// Add ?preview=all to the address while writing to see unpublished posts.
const params = new URLSearchParams(location.search);
const SHOW_ALL = params.get("preview") === "all";

const postsBox = document.getElementById("posts");
const chipsBox = document.getElementById("chips");
const countEl = document.getElementById("count");

let posts = [];
let activeTag = "";

function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Only allow normal web links
function safeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

async function init() {
  try {
    const response = await fetch("data/log.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    posts = (SHOW_ALL ? data : data.filter(p => p.published === true))
      .sort((a, b) => b.date.localeCompare(a.date));
    renderChips();
    renderPosts();
  } catch (err) {
    postsBox.innerHTML = `<p>Could not load posts (${esc(err.message)}).</p>`;
  }
}

function renderChips() {
  chipsBox.innerHTML = "";
  const tags = [...new Set(posts.flatMap(p => p.tags || []))].sort();
  if (tags.length === 0) return;

  const makeChip = (label, value) => {
    const btn = document.createElement("button");
    btn.className = "chip" + (activeTag === value ? " active" : "");
    btn.textContent = label;
    btn.addEventListener("click", () => {
      activeTag = value;
      renderChips();
      renderPosts();
    });
    return btn;
  };

  chipsBox.appendChild(makeChip("All", ""));
  tags.forEach(t => chipsBox.appendChild(makeChip(t, t)));
}

function renderPosts() {
  if (posts.length === 0) {
    countEl.textContent = "";
    postsBox.innerHTML = "<p>No posts yet. Check back soon.</p>";
    return;
  }

  const shown = activeTag ? posts.filter(p => (p.tags || []).includes(activeTag)) : posts;
  countEl.textContent = `${shown.length} post${shown.length === 1 ? "" : "s"}`;

  postsBox.innerHTML = shown.map(p => {
    const safeId = String(p.id || "").replace(/[^a-zA-Z0-9-]/g, "-");
    const tags = (p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("");
    const paragraphs = (p.body || []).map(t => `<p>${esc(t)}</p>`).join("");
    const links = (p.links || []).filter(l => safeUrl(l.url));
    const linkHtml = links.length
      ? `<ul class="post-links">${links.map(l =>
          `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a></li>`).join("")}</ul>`
      : "";
    const draft = p.published ? "" : `<span class="draft">Draft</span>`;
    return `
      <article class="post" id="${safeId}">
        <h2>${esc(p.title)}${draft}</h2>
        <p class="meta">${esc(formatDate(p.date))}</p>
        ${paragraphs}
        ${linkHtml}
        <p>${tags}</p>
      </article>`;
  }).join("");
}

init();