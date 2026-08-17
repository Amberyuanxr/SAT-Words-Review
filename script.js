let vocabulary = [];
let session = { questions: [], current: 0, score: 0, mistakes: [], startUnit: 1, endUnit: 50, answered: false };
const $ = id => document.getElementById(id);

async function loadData() {
  const response = await fetch("./data/vocab.json");
  if (!response.ok) throw new Error("vocab.json could not be loaded");
  vocabulary = (await response.json()).map(v => ({ ...v, unit: Number(v.unit), id: Number(v.id) }));
  if (!vocabulary.length) throw new Error("Vocabulary is empty");
  updateRangeInfo();
}

function updateRangeInfo() {
  const start = Number($("startUnit").value);
  const end = Number($("endUnit").value);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || start > 50 || end < 1 || end > 50) {
    $("rangeInfo").textContent = "Enter a Unit range from 1 to 50.";
    return;
  }
  const low = Math.min(start, end), high = Math.max(start, end);
  const count = vocabulary.filter(v => v.unit >= low && v.unit <= high).length;
  $("rangeInfo").textContent = `${count.toLocaleString()} words available in Units ${low}–${high}.`;
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function startSession() {
  let start = Number($("startUnit").value), end = Number($("endUnit").value);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || start > 50 || end < 1 || end > 50) {
    alert("Please enter a valid Unit range from 1 to 50."); return;
  }
  if (start > end) [start, end] = [end, start];
  const pool = vocabulary.filter(v => v.unit >= start && v.unit <= end);
  if (!pool.length) { alert(`No vocabulary was found in Units ${start}–${end}.`); return; }
  const selected = $("shuffleToggle").checked ? shuffle(pool) : [...pool];
  session = { questions: selected.slice(0, Math.min(100, selected.length)), current: 0, score: 0, mistakes: [], startUnit: start, endUnit: end, answered: false };
  $("questionTotal").textContent = session.questions.length;
  showScreen("quiz"); renderQuestion();
}

function makeOptions(correct) {
  const others = shuffle(vocabulary.filter(v => v.id !== correct.id)).slice(0, 3);
  return shuffle([correct, ...others]);
}

function renderQuestion() {
  const q = session.questions[session.current]; session.answered = false;
  $("questionNumber").textContent = session.current + 1;
  $("liveScore").textContent = session.score;
  $("progressFill").style.width = `${session.current / session.questions.length * 100}%`;
  $("unitLabel").textContent = `Unit ${q.unit}`; $("wordDisplay").textContent = q.word;
  const container = $("options"); container.innerHTML = "";
  makeOptions(q).forEach((option, index) => {
    const button = document.createElement("button"); button.className = "option"; button.dataset.id = option.id;
    button.innerHTML = `<div><span class="option-letter">${String.fromCharCode(65 + index)}</span><span class="option-meaning">${escapeHtml(option.meaning)}</span></div><div class="option-english">${escapeHtml(option.english)}</div>`;
    button.addEventListener("click", () => answerQuestion(option.id, button)); container.appendChild(button);
  });
  $("feedback").className = "feedback hidden"; $("nextBtn").classList.add("hidden");
}

function answerQuestion(selectedId, clickedButton) {
  if (session.answered) return; session.answered = true;
  const q = session.questions[session.current], correct = Number(selectedId) === Number(q.id);
  document.querySelectorAll(".option").forEach(button => { button.classList.add("disabled"); if (Number(button.dataset.id) === Number(q.id)) button.classList.add("correct"); });
  if (correct) { session.score++; clickedButton.classList.add("correct"); showFeedback(true, q); }
  else { clickedButton.classList.add("wrong"); session.mistakes.push({ word:q.word, unit:q.unit, correctMeaning:q.meaning, correctEnglish:q.english, userAnswer:vocabulary.find(v => v.id === Number(selectedId)) || null }); showFeedback(false, q); }
  $("liveScore").textContent = session.score; $("nextBtn").classList.remove("hidden");
  $("progressFill").style.width = `${(session.current + 1) / session.questions.length * 100}%`;
}

function showFeedback(correct, q) {
  const feedback = $("feedback"); feedback.className = `feedback ${correct ? "correct" : "wrong"}`;
  feedback.innerHTML = `<div class="feedback-title">${correct ? "✓ Correct!" : "✗ Not quite."}</div><div class="feedback-word">${escapeHtml(q.word)}</div><div class="feedback-meaning"><strong>Correct meaning:</strong> ${escapeHtml(q.meaning)}</div><div class="feedback-meaning">${escapeHtml(q.english)}</div>`;
}
function nextQuestion() { if (!session.answered) return; if (session.current >= session.questions.length - 1) { finishSession(); return; } session.current++; renderQuestion(); }
function finishSession() { const total = session.questions.length, accuracy = Math.round(session.score / total * 100); $("accuracy").textContent = `${accuracy}%`; $("resultTitle").textContent = accuracy >= 90 ? "Excellent!" : accuracy >= 75 ? "Nice work!" : accuracy >= 60 ? "Keep going!" : "Let's review these together."; $("resultSummary").textContent = `You got ${session.score} out of ${total} words correct and missed ${session.mistakes.length}.`; $("mistakeCount").textContent = session.mistakes.length; renderMistakes(); showScreen("results"); }
function renderMistakes() { const container = $("mistakes"); if (!session.mistakes.length) { container.innerHTML = `<div class="empty">🎉 Perfect score — no words to review.</div>`; return; } container.innerHTML = session.mistakes.map((m,i) => `<article class="mistake"><div class="mistake-word">${i+1}. ${escapeHtml(m.word)}</div><div class="mistake-line"><strong>Unit:</strong> ${m.unit}</div><div class="mistake-line"><strong>Correct meaning:</strong> ${escapeHtml(m.correctMeaning)}</div><div class="mistake-line"><strong>English:</strong> ${escapeHtml(m.correctEnglish)}</div><div class="mistake-line"><strong>Your choice:</strong> ${m.userAnswer ? escapeHtml(m.userAnswer.meaning) + " — " + escapeHtml(m.userAnswer.english) : "Unknown"}</div></article>`).join(""); }
function showScreen(id) { document.querySelectorAll(".screen").forEach(s => s.classList.remove("active")); $(id).classList.add("active"); window.scrollTo({top:0,behavior:"smooth"}); }
function escapeHtml(value) { return String(value).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;"); }

$("startUnit").addEventListener("input", updateRangeInfo); $("endUnit").addEventListener("input", updateRangeInfo); $("startBtn").addEventListener("click", startSession); $("nextBtn").addEventListener("click", nextQuestion); $("homeBtn").addEventListener("click", () => showScreen("home")); $("retryBtn").addEventListener("click", startSession);
$("quitBtn").addEventListener("click", () => { if (confirm("Leave this practice session? Your current progress will be lost.")) showScreen("home"); });
loadData().catch(error => { console.error(error); $("rangeInfo").textContent = "Vocabulary data failed to load. Make sure the data folder was uploaded."; });
