const params = new URLSearchParams(location.search);
const id = params.get("id");
const SHOW_ALL = params.get("preview") === "all";
const box = document.getElementById("detail");
const previewSuffix = SHOW_ALL ? "?preview=all" : "";

function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Only allow normal web links
function safeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

async function load() {
  try {
    const response = await fetch("data/components.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const all = await response.json();
    const c = all.find(item => item.id === id);
    if (!c || (!c.reviewed && !SHOW_ALL)) {
      box.innerHTML = `<a class="back" href="components.html${previewSuffix}">← All components</a>
        <h1>Component not found</h1><p>This page doesn't exist yet.</p>`;
      return;
    }
    show(c);
  } catch (err) {
    box.innerHTML = `<p>Could not load this component (${esc(err.message)}).</p>`;
  }
}

function imageHtml(c) {
  if (!c.image || !c.image.file) {
    return `<div class="placeholder-img">Photo coming soon</div>`;
  }
  const img = c.image;
  const source = safeUrl(img.sourceUrl);
  const credit = [img.credit, img.license].filter(Boolean).map(esc).join(" · ");
  return `<figure>
      <img src="${esc(img.file)}" alt="${esc(img.alt || c.name)}">
      <figcaption>${credit}${source ? ` · <a href="${esc(source)}" target="_blank" rel="noopener">Source</a>` : ""}</figcaption>
    </figure>`;
}

function referencesHtml(c) {
  const refs = (c.references || []).filter(r => safeUrl(r.url));
  if (refs.length === 0) return "";
  return `<h2>References</h2><ul class="refs">` +
    refs.map(r => `<li><a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.label || r.url)}</a></li>`).join("") +
    `</ul>`;
}

function show(c) {
  document.title = c.name + " | My Aviation Playground";
  const hasSimple = c.simple && c.simple.trim() !== "";
  const tags = (c.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join("");

  box.innerHTML = `
    <a class="back" href="components.html${previewSuffix}">← All components</a>
    ${c.reviewed ? "" : `<p class="notice">Preview: this entry hasn't been reviewed yet.</p>`}
    <span class="badge">ATA ${esc(String(c.ata))} – ${esc(c.ataTitle)}</span>
    <h1>${esc(c.name)}</h1>
    ${imageHtml(c)}
    ${hasSimple ? `<div class="tabs" role="tablist">
        <button class="tab active" data-mode="simple" role="tab">Simple</button>
        <button class="tab" data-mode="engineer" role="tab">Engineer</button>
      </div>` : ""}
    <div id="text" class="panel"></div>
    ${c.location ? `<p class="meta"><strong>Location:</strong> ${esc(c.location)}</p>` : ""}
    ${tags ? `<p>${tags}</p>` : ""}
    ${referencesHtml(c)}
  `;

  const text = document.getElementById("text");
  function setMode(mode) {
    text.textContent = (mode === "simple" && hasSimple) ? c.simple : c.function;
    document.querySelectorAll(".tab").forEach(b =>
      b.classList.toggle("active", b.dataset.mode === mode));
  }
  document.querySelectorAll(".tab").forEach(b =>
    b.addEventListener("click", () => setMode(b.dataset.mode)));
  setMode(hasSimple ? "simple" : "engineer");
}

load();