// Add ?preview=all to the address while building to see unreviewed entries.
const params = new URLSearchParams(location.search);
const SHOW_ALL = params.get("preview") === "all";

const grid = document.getElementById("grid");
const searchBox = document.getElementById("search");
const ataSelect = document.getElementById("ata-filter");
const countEl = document.getElementById("count");

let components = [];

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

async function loadComponents() {
  try {
    const response = await fetch("data/components.json");
    if (!response.ok) throw new Error("HTTP " + response.status);
    const all = await response.json();
    components = SHOW_ALL ? all : all.filter(c => c.reviewed === true);
    components.sort((a, b) => a.ata - b.ata || a.name.localeCompare(b.name));
    fillAtaOptions();
         const wanted = params.get("ata");          // e.g. components.html?ata=27
         if (wanted) ataSelect.value = wanted;
         render();
  } catch (err) {
    grid.innerHTML = `<p>Could not load components (${escapeHtml(err.message)}).</p>`;
  }
}

function fillAtaOptions() {
  const chapters = new Map();
  components.forEach(c => chapters.set(c.ata, c.ataTitle));
  [...chapters.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([ata, title]) => {
      const option = document.createElement("option");
      option.value = ata;
      option.textContent = `ATA ${ata} – ${title}`;
      ataSelect.appendChild(option);
    });
}

function render() {
  if (components.length === 0) {
    countEl.textContent = "";
    grid.innerHTML = "<p>Components are being added. Check back soon.</p>";
    return;
  }
  const query = searchBox.value.trim().toLowerCase();
  const ata = ataSelect.value;

  const shown = components.filter(c => {
    if (ata && String(c.ata) !== ata) return false;
    if (!query) return true;
    const text = [c.name, c.function, c.location, c.ataTitle, ...(c.tags || [])]
      .join(" ").toLowerCase();
    return text.includes(query);
  });

  countEl.textContent = `${shown.length} of ${components.length} components`;

  if (shown.length === 0) {
    grid.innerHTML = "<p>No components match. Try a different search.</p>";
    return;
  }

  grid.innerHTML = shown.map(c => {
    const summary = c.function.length > 140 ? c.function.slice(0, 140) + "…" : c.function;
    return `
      <a class="card" href="component.html?id=${encodeURIComponent(c.id)}${SHOW_ALL ? "&preview=all" : ""}">
        <span class="badge">ATA ${c.ata}</span>
        <h3>${escapeHtml(c.name)}</h3>
        <p>${escapeHtml(summary)}</p>
      </a>`;
  }).join("");
}

searchBox.addEventListener("input", render);
ataSelect.addEventListener("change", render);
loadComponents();