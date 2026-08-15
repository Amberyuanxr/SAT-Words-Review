let vocabulary = [];
let units = [];

let session = {
  questions: [],
  current: 0,
  score: 0,
  mistakes: [],
  startUnit: 1,
  endUnit: 50,
  answered: false
};

const $ = (id) => document.getElementById(id);

async function loadData() {
  const [vocabResponse, unitsResponse] = await Promise.all([
    fetch("data/vocab.json"),
    fetch("data/units.json")
  ]);

  vocabulary = await vocabResponse.json();
  units = await unitsResponse.json();

  populateUnitSelectors();
  updateRangeInfo();
}

function populateUnitSelectors() {
  for (let i = 1; i <= 50; i++) {
    const option1 = document.createElement("option");
    option1.value = i;
    option1.textContent = `Unit ${i}`;
    $("startUnit").appendChild(option1);

    const option2 = option1.cloneNode(true);
    $("endUnit").appendChild(option2);
  }

  $("startUnit").value = "1";
  $("endUnit").value = "50";
}

function updateRangeInfo() {
  let start = Number($("startUnit").value);
  let end = Number($("endUnit").value);

  if (start > end) {
    [start, end] = [end, start];
  }

  const available = vocabulary.filter(v => v.unit >= start && v.unit <= end).length;
  $("rangeInfo").textContent =
    `${available.toLocaleString()} words available in Units ${start}–${end}.`;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  $(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startSession() {
  let start = Number($("startUnit").value);
  let end = Number($("endUnit").value);

  if (start > end) [start, end] = [end, start];

  const pool = vocabulary.filter(v => v.unit >= start && v.unit <= end);

  if (!pool.length) {
    alert("No words were found in this range.");
    return;
  }

  const selected = $("shuffleToggle").checked ? shuffle(pool) : [...pool];
  session = {
    questions: selected.slice(0, Math.min(100, selected.length)),
    current: 0,
    score: 0,
    mistakes: [],
    startUnit: start,
    endUnit: end,
    answered: false
  };

  $("questionTotal").textContent = session.questions.length;
  showScreen("quiz");
  renderQuestion();
}

function makeOptions(correct) {
  // Four choices are meanings/definitions, each belonging to a real word.
  // The correct choice is always the current word's meaning.
  const others = shuffle(
    vocabulary.filter(v => v.id !== correct.id)
  ).slice(0, 3);

  return shuffle([correct, ...others]);
}

function renderQuestion() {
  const q = session.questions[session.current];
  session.answered = false;

  $("questionNumber").textContent = session.current + 1;
  $("liveScore").textContent = session.score;
  $("progressFill").style.width =
    `${((session.current) / session.questions.length) * 100}%`;

  $("unitLabel").textContent = `Unit ${q.unit}`;
  $("wordDisplay").textContent = q.word;

  const options = makeOptions(q);
  const container = $("options");
  container.innerHTML = "";

  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "option";
    button.dataset.id = option.id;
    button.innerHTML = `
      <div>
        <span class="option-letter">${String.fromCharCode(65 + index)}</span>
        <span class="option-meaning">${escapeHtml(option.meaning)}</span>
      </div>
      <div class="option-english">${escapeHtml(option.english)}</div>
    `;
    button.addEventListener("click", () => answerQuestion(option.id, button));
    container.appendChild(button);
  });

  $("feedback").className = "feedback hidden";
  $("nextBtn").classList.add("hidden");
}

function answerQuestion(selectedId, clickedButton) {
  if (session.answered) return;
  session.answered = true;

  const q = session.questions[session.current];
  const correct = selectedId === q.id;
  const buttons = [...document.querySelectorAll(".option")];

  buttons.forEach(button => {
    button.classList.add("disabled");
    if (Number(button.dataset.id) === q.id) {
      button.classList.add("correct");
    }
  });

  if (correct) {
    session.score++;
    clickedButton.classList.add("correct");
    showFeedback(true, q);
  } else {
    clickedButton.classList.add("wrong");
    session.mistakes.push({
      word: q.word,
      unit: q.unit,
      correctMeaning: q.meaning,
      correctEnglish: q.english,
      userAnswer: vocabulary.find(v => v.id === selectedId) || null
    });
    showFeedback(false, q);
  }

  $("liveScore").textContent = session.score;
  $("nextBtn").classList.remove("hidden");
  $("progressFill").style.width =
    `${((session.current + 1) / session.questions.length) * 100}%`;
}

function showFeedback(correct, q) {
  const feedback = $("feedback");
  feedback.className = `feedback ${correct ? "correct" : "wrong"}`;
  feedback.innerHTML = `
    <div class="feedback-title">${correct ? "✓ Correct!" : "✗ Not quite."}</div>
    <div class="feedback-word">${escapeHtml(q.word)}</div>
    <div class="feedback-meaning">${escapeHtml(q.meaning)}</div>
    <div class="feedback-meaning">${escapeHtml(q.english)}</div>
  `;
}

function nextQuestion() {
  if (!session.answered) return;

  if (session.current >= session.questions.length - 1) {
    finishSession();
    return;
  }

  session.current++;
  renderQuestion();
}

function finishSession() {
  const total = session.questions.length;
  const accuracy = Math.round((session.score / total) * 100);

  $("accuracy").textContent = `${accuracy}%`;
  $("resultTitle").textContent =
    accuracy >= 90 ? "Excellent!" :
    accuracy >= 75 ? "Nice work!" :
    accuracy >= 60 ? "Keep going!" :
    "Let's review these together.";

  $("resultSummary").textContent =
    `You got ${session.score} out of ${total} words correct and missed ${session.mistakes.length}.`;

  $("mistakeCount").textContent = session.mistakes.length;
  renderMistakes();

  showScreen("results");
}

function renderMistakes() {
  const container = $("mistakes");

  if (!session.mistakes.length) {
    container.innerHTML = `<div class="empty">🎉 Perfect score — no words to review.</div>`;
    return;
  }

  container.innerHTML = session.mistakes.map((m, i) => `
    <article class="mistake">
      <div class="mistake-word">${i + 1}. ${escapeHtml(m.word)}</div>
      <div class="mistake-line"><strong>Unit:</strong> ${m.unit}</div>
      <div class="mistake-line"><strong>Correct meaning:</strong> ${escapeHtml(m.correctMeaning)}</div>
      <div class="mistake-line"><strong>English:</strong> ${escapeHtml(m.correctEnglish)}</div>
      <div class="mistake-line"><strong>Your choice:</strong> ${
        m.userAnswer
          ? `${escapeHtml(m.userAnswer.meaning)} — ${escapeHtml(m.userAnswer.english)}`
          : "Unknown"
      }</div>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("startUnit").addEventListener("change", updateRangeInfo);
$("endUnit").addEventListener("change", updateRangeInfo);
$("startBtn").addEventListener("click", startSession);
$("nextBtn").addEventListener("click", nextQuestion);

$("quitBtn").addEventListener("click", () => {
  if (confirm("Leave this practice session? Your current progress will be lost.")) {
    showScreen("home");
  }
});

$("homeBtn").addEventListener("click", () => showScreen("home"));
$("retryBtn").addEventListener("click", startSession);

loadData().catch(error => {
  console.error(error);
  alert("The vocabulary data could not be loaded. If you opened index.html directly, use GitHub Pages or a local web server instead.");
});
