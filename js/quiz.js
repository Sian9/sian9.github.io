// Add ?preview=all to the address while building to include unreviewed questions.
const params = new URLSearchParams(location.search);
const SHOW_ALL = params.get("preview") === "all";
const app = document.getElementById("quiz-app");
const STORE_KEY = "playground-quiz";
// The first file is required. Any extra files are optional and are skipped if missing.
const QUESTION_FILES = ["data/questions.json", "data/questions-module3.json"];

let allQuestions = [];
let topics = [];
let session = null;

function esc(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Only allow normal web links
function safeUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url) ? url : null;
}

function today() { return new Date().toLocaleDateString("en-CA"); }
function yesterday() { return new Date(Date.now() - 86400000).toLocaleDateString("en-CA"); }

function loadStats() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage unavailable */ }
  return { best: 0, streak: 0, lastPlayed: "" };
}

function saveStats(stats) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
}

function currentStreak(stats) {
  return (stats.lastPlayed === today() || stats.lastPlayed === yesterday()) ? stats.streak : 0;
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A question belongs to an ATA chapter (ata: 29) or a named category (category: "ICAO Annexes")
function topicKey(q) { return q.ata ? "ata:" + q.ata : "cat:" + (q.category || "General"); }
function topicLabel(q) {
  return q.ata
    ? `ATA ${q.ata}${q.ataTitle ? " – " + q.ataTitle : ""}`
    : (q.category || "General");
}
function shortTopic(q) { return q.ata ? `ATA ${q.ata}` : (q.category || "General"); }

async function init() {
  try {
    const response = await fetch(QUESTION_FILES[0]);
    if (!response.ok) throw new Error("HTTP " + response.status);
    let data = await response.json();
    for (const file of QUESTION_FILES.slice(1)) {
      try {
        const extra = await fetch(file);
        if (extra.ok) data = data.concat(await extra.json());
      } catch (e) { /* optional file missing or invalid: skip it */ }
    }
    allQuestions = SHOW_ALL ? data : data.filter(q => q.reviewed === true);
    showStart();
  } catch (err) {
    app.innerHTML = `<p>Could not load questions (${esc(err.message)}).</p>`;
  }
}

// Keep the question in view: after "Next question" the page can still be scrolled down,
// which on a phone leaves the new question partly hidden under the header.
function bringIntoView() {
  const r = app.getBoundingClientRect();
  if (r.top < 80 || r.top > window.innerHeight * 0.6) app.scrollIntoView({ block: "start" });
}

function showStart() {
  if (allQuestions.length === 0) {
    app.innerHTML = "<p>Questions are being written. Check back soon.</p>";
    return;
  }
  const stats = loadStats();
  const streak = currentStreak(stats);

  // Build the topic list: ATA chapters first (by number), then other categories (A–Z)
  const seen = new Set();
  topics = [];
  allQuestions.forEach(q => {
    const key = topicKey(q);
    if (!seen.has(key)) {
      seen.add(key);
      topics.push({ key, label: topicLabel(q), ata: q.ata || null });
    }
  });
  topics.sort((a, b) => {
    if (a.ata && b.ata) return a.ata - b.ata;
    if (a.ata) return -1;
    if (b.ata) return 1;
    return a.label.localeCompare(b.label);
  });
  const topicOptions = topics
    .map((t, i) => `<option value="${i}">${esc(t.label)}</option>`)
    .join("");

  const bits = [`${allQuestions.length} questions available`];
  if (streak > 0) bits.push(`Streak: ${streak} day${streak === 1 ? "" : "s"}`);
  if (stats.best > 0) bits.push(`Best: ${stats.best}%`);

  app.innerHTML = `
    <p class="muted">${bits.join(" · ")}</p>
    <div class="filters">
      <select id="q-topic" aria-label="Topic">
        <option value="">All topics</option>${topicOptions}
      </select>
      <select id="q-count" aria-label="Number of questions">
        <option value="5">5 questions</option>
        <option value="10" selected>10 questions</option>
        <option value="9999">All</option>
      </select>
    </div>
    <p>
      <button id="start" class="primary">Start quiz</button>
      <button id="daily" class="secondary">Daily 5</button>
    </p>`;

  document.getElementById("start").addEventListener("click", () => {
    const choice = document.getElementById("q-topic").value;
    const count = Number(document.getElementById("q-count").value);
    const pool = choice === ""
      ? allQuestions
      : allQuestions.filter(q => topicKey(q) === topics[Number(choice)].key);
    startSession(pool, count);
  });
  document.getElementById("daily").addEventListener("click", () => startSession(allQuestions, 5));
}

function startSession(pool, count) {
  const picked = shuffle(pool).slice(0, count).map(q => ({
    ...q,
    opts: shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer })))
  }));
  session = { questions: picked, index: 0, score: 0 };
  showQuestion();
}

function showQuestion() {
  const q = session.questions[session.index];
  const total = session.questions.length;
  app.innerHTML = `
    <p class="muted">Question ${session.index + 1} of ${total} · ${esc(shortTopic(q))}</p>
    <h2 class="q-text">${esc(q.question)}</h2>
    <div class="options">
      ${q.opts.map((o, i) => `<button class="option" data-i="${i}">${esc(o.text)}</button>`).join("")}
    </div>
    <div id="feedback"></div>`;
  app.querySelectorAll(".option").forEach(btn =>
    btn.addEventListener("click", () => answer(btn, q)));
  if (session.index > 0) bringIntoView();
}

function answer(btn, q) {
  const buttons = [...app.querySelectorAll(".option")];
  const chosen = q.opts[Number(btn.dataset.i)];
  buttons.forEach((b, i) => {
    b.disabled = true;
    if (q.opts[i].correct) b.classList.add("correct");
  });
  if (chosen.correct) session.score++;
  else btn.classList.add("wrong");

  const last = session.index === session.questions.length - 1;
  const hasSource = q.source && q.source !== "TODO";
  const link = safeUrl(q.sourceUrl);
  const sourceHtml = hasSource
    ? `<p class="muted">Source: ${link
        ? `<a href="${esc(link)}" target="_blank" rel="noopener">${esc(q.source)}</a>`
        : esc(q.source)}</p>`
    : "";

  document.getElementById("feedback").innerHTML = `
    <p class="result ${chosen.correct ? "ok" : "bad"}">${chosen.correct ? "✓ Correct" : "✗ Not quite"}</p>
    <p>${esc(q.explanation || "")}</p>
    ${sourceHtml}
    <button id="next" class="primary">${last ? "See results" : "Next question"}</button>`;
  document.getElementById("next").addEventListener("click", () => {
    if (last) finish();
    else { session.index++; showQuestion(); }
  });
}

function finish() {
  const total = session.questions.length;
  const percent = Math.round((session.score / total) * 100);
  const stats = loadStats();

  if (total >= 5 && percent > stats.best) stats.best = percent;
  if (stats.lastPlayed !== today()) {
    stats.streak = stats.lastPlayed === yesterday() ? stats.streak + 1 : 1;
    stats.lastPlayed = today();
  }
  saveStats(stats);

  app.innerHTML = `
    <h2>Results</h2>
    <p class="score">${session.score} / ${total} (${percent}%)</p>
    <p class="muted">Streak: ${stats.streak} day${stats.streak === 1 ? "" : "s"} · Best: ${stats.best}%</p>
    <p><button id="again" class="primary">Play again</button></p>`;
  document.getElementById("again").addEventListener("click", showStart);
  bringIntoView();
}

init();
