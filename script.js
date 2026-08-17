let vocabulary = [];

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

// =========================
// LOAD VOCABULARY
// =========================
async function loadData() {
  try {
    const response = await fetch("./data/vocab.json?v=4", {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error(`Could not load vocab.json: ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("vocab.json must contain an array.");
    }

    vocabulary = data
      .map((v, index) => ({
        id: Number(v.id ?? index + 1),
        unit: Number(v.unit),
        word: String(v.word ?? "").trim(),
        meaning: String(v.meaning ?? "").trim(),
        english: String(v.english ?? "").trim()
      }))
      .filter(
        (v) =>
          Number.isFinite(v.unit) &&
          v.unit >= 1 &&
          v.unit <= 50 &&
          v.word &&
          v.meaning &&
          v.english
      );

    if (!vocabulary.length) {
      throw new Error("No valid vocabulary entries found.");
    }

    console.log(`Loaded ${vocabulary.length} vocabulary words.`);
    updateRangeInfo();

    if ($("startBtn")) {
      $("startBtn").disabled = false;
      $("startBtn").style.opacity = "1";
      $("startBtn").style.cursor = "pointer";
    }
  } catch (error) {
    console.error("Vocabulary loading error:", error);

    if ($("rangeInfo")) {
      $("rangeInfo").textContent =
        "Vocabulary data could not be loaded. Please check data/vocab.json.";
    }

    if ($("startBtn")) {
      $("startBtn").disabled = true;
      $("startBtn").style.opacity = "0.5";
      $("startBtn").style.cursor = "not-allowed";
    }
  }
}

// =========================
// RANGE INFO
// =========================
function updateRangeInfo() {
  if (!vocabulary.length) return;

  const startInput = $("startUnit");
  const endInput = $("endUnit");
  const info = $("rangeInfo");

  if (!startInput || !endInput || !info) return;

  let start = Number(startInput.value);
  let end = Number(endInput.value);

  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    info.textContent = "Enter a Unit range from 1 to 50.";
    return;
  }

  if (start < 1 || start > 50 || end < 1 || end > 50) {
    info.textContent = "Unit must be between 1 and 50.";
    return;
  }

  if (start > end) {
    [start, end] = [end, start];
  }

  const count = vocabulary.filter(
    (v) => v.unit >= start && v.unit <= end
  ).length;

  info.textContent =
    `${count.toLocaleString()} words available in Units ${start}–${end}.`;
}

// =========================
// SHUFFLE
// =========================
function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

// =========================
// START SESSION
// =========================
function startSession() {
  if (!vocabulary.length) {
    alert("Vocabulary is still loading. Please try again.");
    return;
  }

  let start = Number($("startUnit").value);
  let end = Number($("endUnit").value);

  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    start > 50 ||
    end < 1 ||
    end > 50
  ) {
    alert("Please enter a valid Unit range from 1 to 50.");
    return;
  }

  if (start > end) {
    [start, end] = [end, start];
  }

  // Only questions from the chosen range.
  const pool = vocabulary.filter(
    (v) => v.unit >= start && v.unit <= end
  );

  if (!pool.length) {
    alert(`No vocabulary was found in Units ${start}–${end}.`);
    return;
  }

  const randomized =
    $("shuffleToggle") ? $("shuffleToggle").checked : true;

  const selected = randomized ? shuffle(pool) : [...pool];

  // Maximum 100 words.
  const questions = selected.slice(0, Math.min(100, selected.length));

  session = {
    questions,
    current: 0,
    score: 0,
    mistakes: [],
    startUnit: start,
    endUnit: end,
    answered: false
  };

  $("questionTotal").textContent = questions.length;
  $("liveScore").textContent = "0";

  showScreen("quiz");
  renderQuestion();
}

// =========================
// FOUR OPTIONS
// =========================
function makeOptions(correct) {
  const distractorPool = vocabulary.filter(
    (v) => Number(v.id) !== Number(correct.id)
  );

  const distractors = shuffle(distractorPool).slice(0, 3);

  return shuffle([correct, ...distractors]);
}

// =========================
// RENDER ONE FULL-SCREEN WORD
// =========================
function renderQuestion() {
  const q = session.questions[session.current];

  if (!q) return;

  session.answered = false;

  $("questionNumber").textContent = session.current + 1;
  $("questionTotal").textContent = session.questions.length;
  $("liveScore").textContent = session.score;

  const progress =
    ((session.current) / session.questions.length) * 100;

  $("progressFill").style.width = `${progress}%`;

  $("unitLabel").textContent = `Unit ${q.unit}`;
  $("wordDisplay").textContent = q.word;

  const optionsContainer = $("options");
  optionsContainer.innerHTML = "";

  makeOptions(q).forEach((option, index) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "option";
    button.dataset.id = String(option.id);

    button.innerHTML = `
      <div class="option-main">
        <span class="option-letter">
          ${String.fromCharCode(65 + index)}
        </span>
        <span class="option-meaning">
          ${escapeHtml(option.meaning)}
        </span>
      </div>
      <div class="option-english">
        ${escapeHtml(option.english)}
      </div>
    `;

    button.addEventListener("click", () => {
      answerQuestion(option.id, button);
    });

    optionsContainer.appendChild(button);
  });

  $("feedback").className = "feedback hidden";
  $("feedback").innerHTML = "";

  // The new design advances automatically.
  // We keep the old button in the HTML but never show it.
  $("nextBtn").classList.add("hidden");
}

// =========================
// ANSWER + AUTO ADVANCE
// =========================
function answerQuestion(selectedId, clickedButton) {
  if (session.answered) return;

  session.answered = true;

  const question = session.questions[session.current];

  const isCorrect =
    Number(selectedId) === Number(question.id);

  const buttons = [...document.querySelectorAll(".option")];

  // Disable every choice and reveal the correct answer.
  buttons.forEach((button) => {
    button.classList.add("disabled");

    if (Number(button.dataset.id) === Number(question.id)) {
      button.classList.add("correct");
    }
  });

  if (isCorrect) {
    session.score++;
    clickedButton.classList.add("correct");
    showFeedback(true, question);
  } else {
    clickedButton.classList.add("wrong");

    const selectedAnswer = vocabulary.find(
      (v) => Number(v.id) === Number(selectedId)
    );

    session.mistakes.push({
      word: question.word,
      unit: question.unit,
      correctMeaning: question.meaning,
      correctEnglish: question.english,
      userAnswer: selectedAnswer || null
    });

    showFeedback(false, question);
  }

  $("liveScore").textContent = session.score;

  $("progressFill").style.width =
    `${((session.current + 1) / session.questions.length) * 100}%`;

  // Automatically move to the next word after 1 second.
  setTimeout(() => {
    if (session.current >= session.questions.length - 1) {
      finishSession();
      return;
    }

    session.current++;
    renderQuestion();
  }, 1000);
}

// =========================
// FEEDBACK
// =========================
function showFeedback(correct, question) {
  const feedback = $("feedback");

  feedback.className =
    `feedback ${correct ? "correct" : "wrong"}`;

  feedback.innerHTML = `
    <div class="feedback-title">
      ${correct ? "✓ Correct!" : "✗ Not quite."}
    </div>

    <div class="feedback-word">
      ${escapeHtml(question.word)}
    </div>

    <div class="feedback-meaning">
      <strong>Correct meaning:</strong>
      ${escapeHtml(question.meaning)}
    </div>

    <div class="feedback-english">
      ${escapeHtml(question.english)}
    </div>
  `;
}

// =========================
// RESULTS
// =========================
function finishSession() {
  const total = session.questions.length;

  const accuracy =
    total === 0
      ? 0
      : Math.round((session.score / total) * 100);

  $("accuracy").textContent = `${accuracy}%`;

  if (accuracy >= 90) {
    $("resultTitle").textContent = "Excellent!";
  } else if (accuracy >= 75) {
    $("resultTitle").textContent = "Nice work!";
  } else if (accuracy >= 60) {
    $("resultTitle").textContent = "Keep going!";
  } else {
    $("resultTitle").textContent = "Let's review these together.";
  }

  $("resultSummary").textContent =
    `You got ${session.score} out of ${total} words correct and missed ${session.mistakes.length}.`;

  $("mistakeCount").textContent = session.mistakes.length;

  renderMistakes();
  showScreen("results");
}

// =========================
// MISTAKE REVIEW
// =========================
function renderMistakes() {
  const container = $("mistakes");

  if (!session.mistakes.length) {
    container.innerHTML = `
      <div class="empty">
        🎉 Perfect score — no words to review.
      </div>
    `;
    return;
  }

  container.innerHTML = session.mistakes.map((mistake, index) => `
    <article class="mistake">
      <div class="mistake-word">
        ${index + 1}. ${escapeHtml(mistake.word)}
      </div>

      <div class="mistake-line">
        <strong>Unit:</strong> ${mistake.unit}
      </div>

      <div class="mistake-line">
        <strong>Correct meaning:</strong>
        ${escapeHtml(mistake.correctMeaning)}
      </div>

      <div class="mistake-line">
        <strong>English:</strong>
        ${escapeHtml(mistake.correctEnglish)}
      </div>

      <div class="mistake-line">
        <strong>Your choice:</strong>
        ${
          mistake.userAnswer
            ? `${escapeHtml(mistake.userAnswer.meaning)}
               — ${escapeHtml(mistake.userAnswer.english)}`
            : "Unknown"
        }
      </div>
    </article>
  `).join("");
}

// =========================
// SCREEN SWITCH
// =========================
function showScreen(screenId) {
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.remove("active");
  });

  const target = $(screenId);

  if (target) {
    target.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// =========================
// ESCAPE TEXT
// =========================
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================
// EVENT LISTENERS
// =========================
if ($("startUnit")) {
  $("startUnit").addEventListener("input", updateRangeInfo);
}

if ($("endUnit")) {
  $("endUnit").addEventListener("input", updateRangeInfo);
}

if ($("startBtn")) {
  $("startBtn").addEventListener("click", startSession);
}

if ($("nextBtn")) {
  // Old button is intentionally disabled in the new design.
  $("nextBtn").classList.add("hidden");
}

if ($("quitBtn")) {
  $("quitBtn").addEventListener("click", () => {
    if (
      confirm(
        "Leave this practice session? Your current progress will be lost."
      )
    ) {
      showScreen("home");
    }
  });
}

if ($("homeBtn")) {
  $("homeBtn").addEventListener("click", () => {
    showScreen("home");
  });
}

if ($("retryBtn")) {
  $("retryBtn").addEventListener("click", startSession);
}

// =========================
// START
// =========================
loadData();
