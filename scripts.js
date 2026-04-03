/* ==============================================
   STATE
============================================== */
let words = JSON.parse(localStorage.getItem("mochi_words") || "[]");
let streak = parseInt(localStorage.getItem("mochi_streak") || "0");
let lastStudiedDate = localStorage.getItem("mochi_last_date") || null;

let reviewQueue = [];
let currentWord = null;
let sessionTotal = 0;
let sessionCorrect = 0;
let sessionSkipped = 0;
let isFlipped = false;
let selectedType = "Danh từ";
let filterType = "Tất cả";

let wrongWords = [];
let isWrongWordsMode = false;
let reviewMode = "en-vi"; // "en-vi" = nhìn EN nhập VI, "vi-en" = nhìn VI nhập EN

/* ==============================================
   MEMES
============================================== */
const correctMemes = [
  { gif: "https://media.tenor.com/5F2BovYyscYAAAAC/cat-meme.gif",        text: "GOAT detected!" },
  { gif: "https://media.tenor.com/x8v1oNUOmg4AAAAC/rickroll.gif",        text: "Bạn đang cháy lắm!" },
  { gif: "https://media.tenor.com/ZEJbhMcWai8AAAAC/spongebob-rainbow.gif", text: "Quá ez cho bạn!" },
  { gif: "https://media.tenor.com/3jAoXCZMsrAAAAAC/big-brain.gif",       text: "Big brain moment!" },
  { gif: "https://media.tenor.com/Ij3FHnfhGvEAAAAC/john-cena-you-cant-see-me.gif", text: "ZINGGG! Chính xác!" },
  { gif: "https://media.tenor.com/1136571inNEAAAAC/yay.gif",              text: "Bullseye!" },
  { gif: "https://media.tenor.com/Mr_loolSSh8AAAAC/leo-dicaprio.gif",    text: "King/Queen behavior!" },
  { gif: "https://media.tenor.com/i0X9cVtnLGUAAAAC/to-the-moon.gif",    text: "To the moon!" },
  { gif: "https://media.tenor.com/RPFqZAooxhcAAAAC/shrek-sunglasses.gif", text: "Smooth as butter!" },
  { gif: "https://media.tenor.com/0PuCmqnFb7YAAAAC/crying-cat.gif",      text: "Vocabulary beast mode!" },
];

const wrongMemes = [
  { gif: "https://media.tenor.com/wnBgdkFvgAkAAAAC/skill-issue.gif",     text: "Skill issue detected!" },
  { gif: "https://media.tenor.com/jilBmQD-UhcAAAAC/l-plus-ratio.gif",   text: "L + Ratio + Sai rồi!" },
  { gif: "https://media.tenor.com/hzCuxPTiVFIAAAAC/cry-crying.gif",     text: "Ối giời ơi... sai bét!" },
  { gif: "https://media.tenor.com/nFSxqSHHDkUAAAAC/bruh.gif",           text: "Bruh moment..." },
  { gif: "https://media.tenor.com/cH3OZG7JziUAAAAC/melting-face.gif",   text: "Tan chảy vì sai quá!" },
  { gif: "https://media.tenor.com/gGAHHbV1CgQAAAAC/stonks-not-stonks.gif", text: "Stats dropped!" },
  { gif: "https://media.tenor.com/6m6HcqXwlhsAAAAC/turtle.gif",         text: "Chậm mà không chắc!" },
  { gif: "https://media.tenor.com/WT7cGpMQMF0AAAAC/surprised-pikachu.gif", text: "Ủa... không phải vậy đâu!" },
  { gif: "https://media.tenor.com/vqRIOEDlRQgAAAAC/facepalm.gif",       text: "Facepalm worthy..." },
  { gif: "https://media.tenor.com/GkDJMBcnGOQAAAAC/duck-quack.gif",     text: "Quack! Sai toét!" },
];
/* ==============================================
   INIT
============================================== */
function init() {
  updateStreak();
  updateHeaderStats();
  setupTypePills();
  loadWrongWords();
}

function loadWrongWords() {
  wrongWords = JSON.parse(localStorage.getItem("mochi_wrong_words") || "[]");
  updateWrongWordsBtn();
}

function saveWrongWords() {
  localStorage.setItem("mochi_wrong_words", JSON.stringify(wrongWords));
  updateWrongWordsBtn();
}

function updateWrongWordsBtn() {
  const btn = document.getElementById("wrong-words-btn");
  if (!btn) return;
  if (wrongWords.length > 0) {
    btn.style.display = "flex";
    document.getElementById("wrong-count-badge").textContent = wrongWords.length;
  } else {
    btn.style.display = "none";
  }
}

function updateStreak() {
  const today = new Date().toDateString();
  if (lastStudiedDate === today) {
  } else if (lastStudiedDate === new Date(Date.now() - 86400000).toDateString()) {
  } else if (lastStudiedDate && lastStudiedDate !== today) {
    streak = 0;
    localStorage.setItem("mochi_streak", "0");
  }
  document.getElementById("streak-display").textContent = streak;
}

function bumpStreak() {
  const today = new Date().toDateString();
  if (lastStudiedDate !== today) {
    if (lastStudiedDate === new Date(Date.now() - 86400000).toDateString()) {
      streak++;
    } else if (!lastStudiedDate) {
      streak = 1;
    } else {
      streak = 1;
    }
    lastStudiedDate = today;
    localStorage.setItem("mochi_streak", streak.toString());
    localStorage.setItem("mochi_last_date", today);
    document.getElementById("streak-display").textContent = streak;
  }
}

function updateHeaderStats() {
  document.getElementById("total-words-display").textContent = words.length;
}

function setupTypePills() {
  document.querySelectorAll("#type-selector .type-pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#type-selector .type-pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedType = btn.dataset.type;
    });
  });
}

/* ==============================================
   SCREEN CONTROL
============================================== */
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if (id === "review-screen") {
    isWrongWordsMode = false;
    startReview();
  }
  if (id === "list-screen") renderWordList();
}

function startWrongWordsReview() {
  if (wrongWords.length === 0) {
    showMsg("Bạn không có từ sai nào cần luyện!");
    return;
  }
  isWrongWordsMode = true;
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById("review-screen").classList.add("active");
  startReview();
}

/* ==============================================
   MESSAGE BOX
============================================== */
function showMsg(text, callbackYes = null, callbackNo = null) {
  const box = document.getElementById("msgbox");
  box.innerHTML = "";
  box.classList.remove("hidden");

  const textEl = document.createElement("span");
  textEl.textContent = text;
  box.appendChild(textEl);

  if (callbackYes && callbackNo) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const btnYes = document.createElement("button");
    btnYes.textContent = "Đúng";
    btnYes.className = "msg-btn yes";
    btnYes.onclick = () => { box.classList.add("hidden"); callbackYes(); };

    const btnNo = document.createElement("button");
    btnNo.textContent = "Không";
    btnNo.className = "msg-btn no";
    btnNo.onclick = () => { box.classList.add("hidden"); callbackNo(); };

    actions.append(btnYes, btnNo);
    box.appendChild(actions);
  } else {
    setTimeout(() => box.classList.add("hidden"), 1800);
  }
}

/* ==============================================
   TEXT-TO-SPEECH
============================================== */
function speakText(text) {
  if (!text || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "en-US";
  utt.rate = 0.9;
  window.speechSynthesis.speak(utt);
}

function speakCurrentWord() {
  if (currentWord) speakText(currentWord.word);
}

/* ==============================================
   SPELL CHECK
============================================== */
async function checkSpelling(word) {
  try {
    const resp = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text: word, language: "en-US" })
    });
    const data = await resp.json();
    if (!data.matches || data.matches.length === 0) return null;
    const first = data.matches[0];
    if (first.replacements && first.replacements.length > 0) return first.replacements[0];
    return null;
  } catch (err) {
    return null;
  }
}

/* ==============================================
   ADD WORD
============================================== */
async function addWord() {
  const w = document.getElementById("word-input").value.trim();
  const m = document.getElementById("meaning-input").value.trim();
  const t = selectedType;

  if (!w || !m) { showMsg("Bạn chưa nhập đủ dữ liệu!"); return; }

  if (words.some(item => item.word.toLowerCase() === w.toLowerCase())) {
    showMsg('"' + w + '" đã tồn tại trong danh sách!'); return;
  }

  const suggestion = await checkSpelling(w);
  if (suggestion && typeof suggestion === "string" && suggestion.toLowerCase() !== w.toLowerCase()) {
    showMsg('Ý bạn là "' + suggestion + '"?',
      () => saveWord(suggestion, m, t),
      () => saveWord(w, m, t)
    );
  } else {
    saveWord(w, m, t);
  }
}

function saveWord(word, meaning, type) {
  words.push({ word, meaning, type });
  localStorage.setItem("mochi_words", JSON.stringify(words));
  updateHeaderStats();
  showMsg("Đã lưu từ!");
  document.getElementById("word-input").value = "";
  document.getElementById("meaning-input").value = "";
  document.getElementById("word-input").focus();
}

/* ==============================================
   REVIEW
============================================== */
function setReviewMode(mode) {
  reviewMode = mode;
  document.querySelectorAll(".review-mode-btn").forEach(function(btn) {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
}

function startReview() {
  sessionTotal = 0;
  sessionCorrect = 0;
  sessionSkipped = 0;

  const sourceWords = isWrongWordsMode ? wrongWords : words;

  const reviewTitle = document.querySelector("#review-screen .screen-header h2");
  if (reviewTitle) {
    reviewTitle.textContent = isWrongWordsMode ? "Luyện từ sai" : "Ôn tập";
  }

  document.getElementById("session-complete").style.display = "none";
  document.getElementById("no-words-msg").style.display = "none";
  document.getElementById("review-content").style.display = "flex";
  document.getElementById("review-content").style.flexDirection = "column";

  if (sourceWords.length === 0) {
    document.getElementById("no-words-msg").style.display = "flex";
    document.getElementById("review-content").style.display = "none";
    return;
  }

  reviewQueue = shuffle([...sourceWords]);
  sessionTotal = reviewQueue.length;
  updateProgress();
  showNextWord();
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function updateProgress() {
  const done = sessionTotal - reviewQueue.length;
  const pct = sessionTotal > 0 ? (done / sessionTotal) * 100 : 0;
  document.getElementById("progress-bar").style.width = pct + "%";
  document.getElementById("progress-current").textContent = done;
  document.getElementById("progress-total").textContent = sessionTotal;
}

function flipCard() {
  const card = document.getElementById("flip-card");
  isFlipped = !isFlipped;
  card.classList.toggle("flipped", isFlipped);
}

function showNextWord() {
  /* FIX: Disable transition temporarily so card resets instantly
     without showing a brief "flip to back then back to front" flash */
  const card = document.getElementById("flip-card");
  card.style.transition = "none";
  card.classList.remove("flipped");
  isFlipped = false;
  void card.offsetWidth; // force reflow
  card.style.transition = "";

  document.getElementById("result-box").classList.add("hidden");
  document.getElementById("answer-box").style.display = "flex";
  document.getElementById("answer-box").style.flexDirection = "column";

  if (reviewQueue.length === 0) {
    endSession();
    return;
  }

  const idx = Math.floor(Math.random() * reviewQueue.length);
  currentWord = reviewQueue[idx];
  reviewQueue.splice(idx, 1);
  updateProgress();

  if (reviewMode === "vi-en") {
    // Show Vietnamese on front, user must type English
    document.getElementById("review-word").textContent = currentWord.meaning;
    document.getElementById("review-type-front").textContent = currentWord.type;
    document.getElementById("review-meaning-back").textContent = currentWord.word;
    document.getElementById("review-type-back").textContent = currentWord.type;
    document.getElementById("user-meaning").placeholder = "Nhập từ tiếng Anh...";
    document.getElementById("card-hint-front").textContent = "Nhấn để xem từ tiếng Anh 👆";
    document.getElementById("card-hint-back").textContent = "Từ tiếng Anh";
    // Hide TTS button since we're showing Vietnamese
    document.querySelector(".tts-card-btn").style.display = "none";
  } else {
    // Show English on front, user must type Vietnamese  
    document.getElementById("review-word").textContent = currentWord.word;
    document.getElementById("review-type-front").textContent = currentWord.type;
    document.getElementById("review-meaning-back").textContent = currentWord.meaning;
    document.getElementById("review-type-back").textContent = currentWord.type;
    document.getElementById("user-meaning").placeholder = "Nhập nghĩa tiếng Việt...";
    document.getElementById("card-hint-front").textContent = "Nhấn để xem nghĩa 👆";
    document.getElementById("card-hint-back").textContent = "Nghĩa của từ";
    document.querySelector(".tts-card-btn").style.display = "";
  }

  const input = document.getElementById("user-meaning");
  input.value = "";
  setTimeout(() => input.focus(), 100);
}

function checkUserMeaning() {
  const userInput = document.getElementById("user-meaning").value.trim().toLowerCase();
  const correct = reviewMode === "vi-en" 
    ? currentWord.word.trim().toLowerCase() 
    : currentWord.meaning.trim().toLowerCase();

  if (!userInput) { showMsg("Bạn chưa nhập nghĩa!"); return; }

  document.getElementById("answer-box").style.display = "none";

  if (!isFlipped) {
    const card = document.getElementById("flip-card");
    card.style.transition = "none";
    card.classList.add("flipped");
    isFlipped = true;
    void card.offsetWidth;
    card.style.transition = "";
  }

  const resultBox = document.getElementById("result-box");
  resultBox.classList.remove("hidden");

  const isCorrect = userInput === correct || correct.includes(userInput) || userInput.includes(correct);

  if (isCorrect) {
    sessionCorrect++;
    const meme = correctMemes[Math.floor(Math.random() * correctMemes.length)];
    document.getElementById("result-icon").innerHTML = '<img src="' + meme.gif + '" alt="meme" class="result-meme-gif">';
    document.getElementById("result-text").innerHTML =
      '<span class="result-correct-label">Chính xác!</span>' +
      '<span class="result-meme-text">' + meme.text + '</span>';
    resultBox.className = "result-box result-correct";
    bumpStreak();

    if (isWrongWordsMode) {
      wrongWords = wrongWords.filter(function(w) { return w.word.toLowerCase() !== currentWord.word.toLowerCase(); });
      saveWrongWords();
    }
  } else {
    const meme = wrongMemes[Math.floor(Math.random() * wrongMemes.length)];
    const correctAnswer = reviewMode === "vi-en" ? currentWord.word : currentWord.meaning;
    document.getElementById("result-icon").innerHTML = '<img src="' + meme.gif + '" alt="meme" class="result-meme-gif">';
    document.getElementById("result-text").innerHTML =
      '<span class="result-wrong-label">Sai rồi! Đáp án:</span>' +
      '<strong class="result-answer">' + correctAnswer + '</strong>' +
      '<span class="result-meme-text">' + meme.text + '</span>';
    resultBox.className = "result-box result-wrong";

    const alreadyWrong = wrongWords.some(function(w) { return w.word.toLowerCase() === currentWord.word.toLowerCase(); });
    if (!alreadyWrong) {
      wrongWords.push(Object.assign({}, currentWord));
      saveWrongWords();
    }
  }
}

function skipWord() {
  sessionSkipped++;
  document.getElementById("answer-box").style.display = "none";
  const resultBox = document.getElementById("result-box");
  resultBox.classList.remove("hidden");
  document.getElementById("result-icon").innerHTML = "⏭️";
  document.getElementById("result-text").innerHTML =
    '<span class="result-skip-label">Đã bỏ qua</span>' +
    '<strong class="result-answer">' + (reviewMode === "vi-en" ? currentWord.word : currentWord.meaning) + '</strong>';
  resultBox.className = "result-box result-skip";

  if (!isFlipped) {
    const card = document.getElementById("flip-card");
    card.style.transition = "none";
    card.classList.add("flipped");
    isFlipped = true;
    void card.offsetWidth;
    card.style.transition = "";
  }
}

function endSession() {
  document.getElementById("review-content").style.display = "none";
  const sessionComplete = document.getElementById("session-complete");
  sessionComplete.style.display = "flex";
  sessionComplete.style.flexDirection = "column";

  const answered = sessionTotal - sessionSkipped;
  const acc = answered > 0 ? Math.round((sessionCorrect / answered) * 100) : 0;

  const practiceWrongBtn = document.getElementById("practice-wrong-btn");
  if (practiceWrongBtn) {
    if (wrongWords.length > 0 && !isWrongWordsMode) {
      practiceWrongBtn.style.display = "flex";
      practiceWrongBtn.querySelector(".wrong-count").textContent = wrongWords.length;
    } else {
      practiceWrongBtn.style.display = "none";
    }
  }

  document.getElementById("session-score").textContent = "✅ " + sessionCorrect + "/" + answered + " · " + acc + "% chính xác";

  let summaryText = acc >= 80 ? "Tuyệt vời! GOAT! 🐐" : acc >= 50 ? "Khá đấy! Cố lên! 👏" : "Cần luyện thêm! 💪";
  if (isWrongWordsMode && wrongWords.length === 0) {
    summaryText = "Đã xóa sạch từ sai! Xuất sắc! 🎉";
  }
  document.getElementById("session-summary").textContent = "Ôn xong " + sessionTotal + " từ! " + summaryText;
}

function restartReview() {
  startReview();
}

/* ==============================================
   WORD LIST
============================================== */
function renderWordList() {
  const search = (document.getElementById("search-input") ? document.getElementById("search-input").value : "").toLowerCase();
  const container = document.getElementById("word-list-container");

  const filtered = words.filter(function(w) {
    const matchSearch = w.word.toLowerCase().includes(search) || w.meaning.toLowerCase().includes(search);
    const matchType = filterType === "Tất cả" || w.type === filterType;
    return matchSearch && matchType;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-list">' + (words.length === 0 ? "📭 Chưa có từ nào!" : "🔍 Không tìm thấy từ phù hợp") + '</div>';
    return;
  }

  container.innerHTML = "";
  filtered.forEach(function(w) {
    const realIdx = words.indexOf(w);
    const isWrong = wrongWords.some(function(ww) { return ww.word.toLowerCase() === w.word.toLowerCase(); });
    const div = document.createElement("div");
    div.className = "word-item" + (isWrong ? " word-item-wrong" : "");
    div.innerHTML =
      '<div class="word-item-text">' +
        '<div class="word-item-en">' + w.word + (isWrong ? ' <span class="wrong-tag">❌</span>' : '') + '</div>' +
        '<div class="word-item-vi">' + w.meaning + '</div>' +
      '</div>' +
      '<span class="word-item-type">' + w.type + '</span>' +
      '<div class="word-item-actions">' +
        '<button class="word-action-btn" onclick="speakText(\'' + w.word.replace(/'/g, "\\'") + '\')" title="Phát âm">🔊</button>' +
        '<button class="word-action-btn del" onclick="deleteWord(' + realIdx + ')" title="Xoá">🗑️</button>' +
      '</div>';
    container.appendChild(div);
  });
}

function setFilter(btn) {
  document.querySelectorAll(".filter-pill").forEach(function(b) { b.classList.remove("active"); });
  btn.classList.add("active");
  filterType = btn.dataset.filter;
  renderWordList();
}

function deleteWord(idx) {
  showMsg('Xoá từ "' + words[idx].word + '"?',
    function() {
      words.splice(idx, 1);
      localStorage.setItem("mochi_words", JSON.stringify(words));
      updateHeaderStats();
      renderWordList();
      showMsg("Đã xoá!");
    },
    function() {}
  );
}

function deleteAllWords() {
  if (words.length === 0) { showMsg("Chưa có từ nào!"); return; }
  showMsg("Xoá tất cả " + words.length + " từ?",
    function() {
      words = [];
      localStorage.removeItem("mochi_words");
      updateHeaderStats();
      renderWordList();
      showMsg("Đã xoá tất cả!");
    },
    function() {}
  );
}

/* ==============================================
   IMPORT / EXPORT
============================================== */
function exportWords() {
  if (words.length === 0) { showMsg("Chưa có từ nào để xuất!"); return; }
  const blob = new Blob([JSON.stringify(words, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mochi_words_backup.json";
  a.click();
  URL.revokeObjectURL(url);
  showMsg("Đã xuất " + words.length + " từ!");
}

function importWords() {
  document.getElementById("import-file-input").click();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = "";
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      validateAndImport(parsed);
    } catch (err) {
      showMsg("Lỗi đọc file JSON: " + err.message);
    }
  };
  reader.readAsText(file);
}

function validateAndImport(parsed) {
  if (!Array.isArray(parsed)) { showMsg("File phải là mảng JSON!"); return; }
  const valid = parsed.every(function(item) {
    return typeof item === "object" && item !== null && "word" in item && "meaning" in item && "type" in item;
  });
  if (!valid) { showMsg("Dữ liệu thiếu trường word/meaning/type!"); return; }

  showMsg("Tìm thấy " + parsed.length + " từ. Gộp vào danh sách (" + words.length + " từ)?",
    function() { mergeImport(parsed); },
    function() { overwriteImport(parsed); }
  );
}

function mergeImport(newWords) {
  const existingSet = new Set(words.map(function(w) { return w.word.toLowerCase(); }));
  const unique = newWords.filter(function(w) { return !existingSet.has(w.word.toLowerCase()); });
  words = words.concat(unique);
  localStorage.setItem("mochi_words", JSON.stringify(words));
  updateHeaderStats();
  showMsg("Thêm " + unique.length + " từ! (bỏ qua " + (newWords.length - unique.length) + " trùng)");
}

function overwriteImport(newWords) {
  words = newWords;
  localStorage.setItem("mochi_words", JSON.stringify(words));
  updateHeaderStats();
  showMsg("Nhập " + words.length + " từ (ghi đè)!");
}

function showJsonPasteBox() {
  document.getElementById("json-paste-popup").classList.remove("hidden");
  document.getElementById("json-textarea").value = "";
}

function closeJsonPasteBox() {
  document.getElementById("json-paste-popup").classList.add("hidden");
}

function submitJsonPaste() {
  const raw = document.getElementById("json-textarea").value.trim();
  if (!raw) { showMsg("Bạn chưa nhập gì!"); return; }
  try {
    const parsed = JSON.parse(raw);
    closeJsonPasteBox();
    validateAndImport(parsed);
  } catch (err) {
    showMsg("JSON không hợp lệ: " + err.message);
  }
}

/* ==============================================
   KEYBOARD SHORTCUTS
============================================== */
document.getElementById("word-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") document.getElementById("meaning-input").focus();
});
document.getElementById("meaning-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") addWord();
});

/* FIX: Enter to check + Enter on result to go next */
document.getElementById("user-meaning").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    const answerBox = document.getElementById("answer-box");
    const resultBox = document.getElementById("result-box");
    if (answerBox.style.display !== "none") {
      checkUserMeaning();
    } else if (!resultBox.classList.contains("hidden")) {
      showNextWord();
    }
  }
});

document.addEventListener("keydown", function(e) {
  const reviewActive = document.getElementById("review-screen").classList.contains("active");
  if (!reviewActive) return;

  if (e.key === "Enter") {
    const resultBox = document.getElementById("result-box");
    const answerBox = document.getElementById("answer-box");
    const focused = document.activeElement;
    if (!resultBox.classList.contains("hidden") && answerBox.style.display === "none" && focused && focused.id !== "user-meaning") {
      e.preventDefault();
      showNextWord();
    }
    return;
  }

  if (e.key === " " || e.key === "ArrowUp" || e.key === "ArrowDown") {
    const focused = document.activeElement;
    if (focused && focused.id === "user-meaning") return;
    e.preventDefault();
    flipCard();
  }
});

/* ==============================================
   CREDIT
============================================== */
document.getElementById("credit-btn").addEventListener("click", function() {
  document.getElementById("credit-popup").classList.remove("hidden");
});
document.getElementById("close-credit-btn").addEventListener("click", function() {
  document.getElementById("credit-popup").classList.add("hidden");
});

document.querySelectorAll(".overlay").forEach(function(overlay) {
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) overlay.classList.add("hidden");
  });
});

/* ==============================================
   START
============================================== */
init();
