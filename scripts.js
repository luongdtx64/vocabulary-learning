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
  { gif: "https://media1.tenor.com/m/w87VFXy_KzEAAAAC/omg-shocked.gif",        text: "Đẳng cấp đấy!" },
  { gif: "https://media1.tenor.com/m/RusIdB6WS-IAAAAC/cat-high-five.gif",        text: "Vip pro đấy" } ,
  { gif: "https://media1.tenor.com/m/Kq_bAI7JRDkAAAAd/byuntear-cat.gif",        text: "Giỏi đấy" } 
];

const wrongMemes = [
  { gif: "https://media1.tenor.com/m/tuzl1hVGlIQAAAAC/sad-cat-sad-cat-meme.gif",        text: "Saii òiiii" } ,
  { gif: "https://media1.tenor.com/m/aJeIvS0AuHcAAAAC/cat1.gif",        text: "Vấn đề kĩ năng ?" } ,
  { gif: "https://media.tenor.com/c6nXyQmertAAAAAi/the-voices.gif",        text: "Hết Cíuuuuu" } 
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
  if (id === "lookup-screen") {
    document.getElementById("lookup-input").value = "";
    document.getElementById("lookup-result-area").innerHTML = "";
  }
  if (id === "game-screen") {
    initGameScreen();
  }
  if (id !== "game-screen") {
    pauseGameIfRunning();
  }
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
   LOOKUP / DICTIONARY (Free Dictionary API + MyMemory translate)
============================================== */
let lookupAudioUrl = null;
let lookupCurrentWord = null;
let lookupSelectedType = "Danh từ";

function onLookupInput() {
  const val = document.getElementById("lookup-input").value.trim();
  if (!val) document.getElementById("lookup-result-area").innerHTML = "";
}

async function lookupWord() {
  const input = document.getElementById("lookup-input");
  const word = input.value.trim();
  if (!word) { showMsg("Bạn chưa nhập từ cần tra!"); return; }

  const area = document.getElementById("lookup-result-area");
  area.innerHTML = '<div class="lookup-loading">⏳ Đang tra từ điển...</div>';
  lookupAudioUrl = null;
  lookupCurrentWord = null;

  try {
    // Call both APIs in parallel
    const [dictRes, transRes] = await Promise.all([
      fetch("https://api.dictionaryapi.dev/api/v2/entries/en/" + encodeURIComponent(word)),
      fetch("https://api.mymemory.translated.net/get?q=" + encodeURIComponent(word) + "&langpair=en|vi")
    ]);

    if (!dictRes.ok) {
      area.innerHTML = '<div class="lookup-not-found"><div class="empty-icon">🤷</div><p>Không tìm thấy từ <strong>"' + escHtml(word) + '"</strong>.<br>Thử kiểm tra lại chính tả!</p></div>';
      return;
    }

    const dictData = await dictRes.json();
    let viMeaning = "";
    try {
      const transData = await transRes.json();
      if (transData.responseStatus === 200) {
        viMeaning = transData.responseData.translatedText || "";
      }
    } catch(e) {}

    renderLookupResult(dictData[0], viMeaning);
  } catch (e) {
    area.innerHTML = '<div class="lookup-not-found"><div class="empty-icon">📡</div><p>Lỗi kết nối mạng.<br>Vui lòng thử lại!</p></div>';
  }
}

const posMapVI = {
  "noun": "Danh từ", "verb": "Động từ", "adjective": "Tính từ",
  "adverb": "Trạng từ", "pronoun": "Đại từ", "preposition": "Giới từ",
  "conjunction": "Liên từ", "interjection": "Thán từ", "exclamation": "Thán từ",
  "article": "Mạo từ", "determiner": "Hạn định từ", "numeral": "Số từ"
};

function renderLookupResult(entry, viMeaning) {
  lookupCurrentWord = entry.word;
  lookupSelectedType = "Danh từ";

  // Find audio
  lookupAudioUrl = null;
  for (const ph of (entry.phonetics || [])) {
    if (ph.audio) { lookupAudioUrl = ph.audio; break; }
  }

  // Find phonetic text
  let phoneticText = "";
  for (const ph of (entry.phonetics || [])) {
    if (ph.text) { phoneticText = ph.text; break; }
  }

  // Detect first part of speech for default type
  const firstMeaning = (entry.meanings || [])[0];
  if (firstMeaning) {
    lookupSelectedType = posMapVI[firstMeaning.partOfSpeech] || "Danh từ";
  }

  // Check if already in word list
  const alreadyAdded = words.some(w => w.word.toLowerCase() === entry.word.toLowerCase());

  // Build meanings HTML (English definitions)
  let meaningsHtml = "";
  const shownMeanings = (entry.meanings || []).slice(0, 3);
  for (const meaning of shownMeanings) {
    const posLabel = meaning.partOfSpeech;
    const posVi = posMapVI[posLabel] || posLabel;
    const defs = (meaning.definitions || []).slice(0, 2);
    let defsHtml = defs.map(d =>
      '<div class="lookup-def-item">' +
        '<div class="lookup-def-text">' + escHtml(d.definition) + '</div>' +
        (d.example ? '<div class="lookup-def-example">📝 <em>' + escHtml(d.example) + '</em></div>' : '') +
      '</div>'
    ).join("");
    meaningsHtml += '<div class="lookup-pos-group"><div class="lookup-pos-label">' + escHtml(posLabel) + ' · ' + escHtml(posVi) + '</div>' + defsHtml + '</div>';
  }

  // Type selector pills for "add" action
  const allTypes = ["Danh từ","Động từ","Tính từ","Trạng từ","Đại từ","Giới từ","Liên từ","Thán từ"];
  const typePills = allTypes.map(t =>
    '<button class="type-pill' + (t === lookupSelectedType ? ' active' : '') + '" onclick="setLookupType(this,\'' + t + '\')">' + t + '</button>'
  ).join("");

  const speakBtn = lookupAudioUrl
    ? '<button class="lookup-speak-btn" onclick="playLookupAudio()" title="Phát âm">🔊</button>'
    : '<button class="lookup-speak-btn" onclick="speakText(\'' + entry.word.replace(/'/g,"\\'") + '\')" title="Phát âm">🔊</button>';

  const area = document.getElementById("lookup-result-area");
  area.innerHTML =
    '<div class="lookup-word-card">' +
      // Header: word + phonetic + speak
      '<div class="lookup-word-header">' +
        '<div>' +
          '<div class="lookup-word-title">' + escHtml(entry.word) + '</div>' +
          (phoneticText ? '<div class="lookup-phonetic">' + escHtml(phoneticText) + '</div>' : '') +
        '</div>' +
        speakBtn +
      '</div>' +

      // Vietnamese meaning (big highlight)
      (viMeaning ?
        '<div class="lookup-vi-meaning">' +
          '<span class="lookup-vi-label">🇻🇳 Nghĩa tiếng Việt</span>' +
          '<div class="lookup-vi-text">' + escHtml(viMeaning) + '</div>' +
        '</div>' : '') +

      // English definitions
      '<div class="lookup-meanings-section">' +
        '<div class="lookup-en-label">📖 Định nghĩa (EN)</div>' +
        meaningsHtml +
      '</div>' +

      // Type selector + add button
      '<div class="lookup-type-selector-wrap">' +
        '<label>Chọn loại từ khi thêm:</label>' +
        '<div class="type-pills" id="lookup-type-pills">' + typePills + '</div>' +
      '</div>' +
      '<button class="lookup-add-btn" id="lookup-add-btn" onclick="addFromLookup()" ' + (alreadyAdded ? 'disabled' : '') + '>' +
        (alreadyAdded ? '✅ Đã có trong kho từ' : '➕ Thêm vào kho ôn tập') +
      '</button>' +
    '</div>';
}

function setLookupType(btn, type) {
  document.querySelectorAll("#lookup-type-pills .type-pill").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  lookupSelectedType = type;
}

function playLookupAudio() {
  if (!lookupAudioUrl) return;
  const audio = new Audio(lookupAudioUrl);
  audio.play().catch(() => speakText(lookupCurrentWord));
}

function addFromLookup() {
  if (!lookupCurrentWord) return;
  const exists = words.some(w => w.word.toLowerCase() === lookupCurrentWord.toLowerCase());
  if (exists) { showMsg("Từ này đã có trong kho rồi!"); return; }

  // Get Vietnamese meaning from UI
  const viEl = document.querySelector(".lookup-vi-text");
  const meaning = viEl ? viEl.textContent.trim() : "(xem từ điển)";

  saveWord(lookupCurrentWord, meaning, lookupSelectedType);

  const btn = document.getElementById("lookup-add-btn");
  if (btn) { btn.disabled = true; btn.textContent = "✅ Đã thêm vào kho!"; }
  showMsg('✅ Đã thêm "' + lookupCurrentWord + '" → ' + meaning);
}

function escHtml(str) {
  if (!str) return "";
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ==============================================
   KEYBOARD SHORTCUTS
============================================== */
document.getElementById("lookup-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter") lookupWord();
});

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

/* ==============================================
   MINI GAME — MÈO VƯỢT CHƯỚNG NGẠI
============================================== */
(function(){

const CV = document.getElementById('game-canvas');
const cx = CV ? CV.getContext('2d') : null;

const GW = 800, GH = 420, GROUND = 340;

let gState = 'idle'; // idle | playing | dead | vocab
let gScore = 0, gHighscore = 0, gFrame = 0;
let gSpeed = 5, gSpeedMult = 1;
let gRaf = null;
let gGroundX = 0;

// Power-up state
let shieldActive = false;
let shieldTimer = 0;
let slowActive = false;
let slowTimer = 0;
let powerCooldown = 0;
const POWER_CD = 300; // frames

const cat = { x:80, y:GROUND, vy:0, onGround:true, jumpCount:0, animT:0 };
let obstacles = [], clouds = [], particles = [];
let vocabQuestion = null, vocabTimerFill = 100, vocabTimeout = null;

function initGameScreen() {
  if (!CV) return;

  // Expand layout to fullscreen
  document.querySelector('.app-wrapper').classList.add('game-mode');
  // Hide scrollbar while in game
  document.body.style.overflow = 'hidden';

  clouds = [
    {x:600, y:50, w:80}, {x:380, y:30, w:100}, {x:180, y:65, w:65}, {x:750, y:75, w:55}
  ];
  document.getElementById('game-hs-display').textContent = gHighscore;

  // Reset button states
  const startBtn = document.getElementById('game-start-btn');
  const restartBtn = document.getElementById('game-restart-btn');
  const menuBtn = document.getElementById('game-menu-btn');
  if (startBtn) { startBtn.style.display = 'inline-flex'; startBtn.onclick = startGame; startBtn.innerHTML = '<span class="btn-icon">▶</span> Bắt đầu!'; }
  if (restartBtn) restartBtn.style.display = 'none';
  if (menuBtn) menuBtn.style.display = 'none';

  // If was mid-game, treat as fresh start
  if (gState === 'playing') {
    cancelAnimationFrame(gRaf);
    gState = 'idle';
  }

  // Show start overlay
  const ov = document.getElementById('game-overlay');
  ov.style.display = 'flex';
  const emojiEl = document.getElementById('gov-emoji');
  if (emojiEl) emojiEl.textContent = '🐱';
  document.getElementById('gov-title').textContent = 'Mèo Vượt Chướng Ngại';
  document.getElementById('gov-sub').textContent = 'Nhấn Bắt đầu hoặc Space để chơi!';
  document.getElementById('gov-score').style.display = 'none';
  document.getElementById('gov-hs').style.display = 'none';

  // Draw idle frame
  if (cx) {
    cat.y = GROUND; cat.animT = 0;
    cx.clearRect(0,0,GW,GH);
    drawGround();
    clouds.forEach(drawCloud);
    drawCat(cat.x, cat.y, 0);
  }
}

function pauseGameIfRunning() {
  if (gState === 'playing') {
    cancelAnimationFrame(gRaf);
    gState = 'idle';
    showGameOverlay(true, 'Đã tạm dừng', 'Vào lại để tiếp tục');
  }
}

function exitGame() {
  cancelAnimationFrame(gRaf);
  gState = 'idle';
  document.querySelector('.app-wrapper').classList.remove('game-mode');
  document.body.style.overflow = '';
  showScreen('menu-screen');
}

function showGameOverlay(show, title, sub) {
  const ov = document.getElementById('game-overlay');
  if (!show) { ov.style.display = 'none'; return; }
  ov.style.display = 'flex';
  if (title) document.getElementById('gov-title').textContent = title;
  if (sub)   document.getElementById('gov-sub').textContent   = sub;
}

window.gameJump = function() {
  if (gState !== 'playing') return;
  if (cat.jumpCount < 2) {
    cat.vy = -12;
    cat.onGround = false;
    cat.jumpCount++;
    spawnParticles(cat.x+18, cat.y+32, '#F4C0D1', 6);
  }
};

window.activatePowerUp = function() {
  if (gState !== 'playing') return;
  if (powerCooldown > 0) return;
  if (words.length === 0) { showMsg('Chưa có từ vựng nào! Hãy thêm từ trước.'); return; }
  gState = 'vocab';
  showVocabQuiz();
};

window.exitGame = exitGame;
window.initGameScreen = initGameScreen;

// ---- Vocab Quiz ----
function showVocabQuiz() {
  if (words.length === 0) { gState = 'playing'; return; }

  const pool = words.slice();
  const correct = pool[Math.floor(Math.random() * pool.length)];
  const wrongs = pool.filter(w => w.word !== correct.word);
  const shuffled = [...wrongs].sort(() => Math.random()-0.5).slice(0, 3);
  const choices = [...shuffled, correct].sort(() => Math.random()-0.5);

  vocabQuestion = correct;
  document.getElementById('gv-word').textContent = correct.word;
  document.getElementById('gv-hint').textContent = correct.type + ' · Nhấn chọn nghĩa đúng!';

  const choicesEl = document.getElementById('gv-choices');
  choicesEl.innerHTML = '';
  choices.forEach(ch => {
    const btn = document.createElement('button');
    btn.className = 'gv-choice';
    btn.textContent = ch.meaning;
    btn.onclick = () => answerVocab(btn, ch.word === correct.word);
    choicesEl.appendChild(btn);
  });

  vocabTimerFill = 100;
  document.getElementById('gv-timer-fill').style.width = '100%';
  document.getElementById('game-vocab-overlay').style.display = 'flex';

  // countdown timer
  let elapsed = 0;
  const TOTAL = 5000;
  const tick = setInterval(() => {
    if (gState !== 'vocab') { clearInterval(tick); return; }
    elapsed += 100;
    vocabTimerFill = Math.max(0, 100 - (elapsed / TOTAL * 100));
    document.getElementById('gv-timer-fill').style.width = vocabTimerFill + '%';
    if (elapsed >= TOTAL) {
      clearInterval(tick);
      closeVocabQuiz(false); // timeout = wrong
    }
  }, 100);
  vocabTimeout = tick;
}

function answerVocab(btn, isCorrect) {
  clearInterval(vocabTimeout);
  document.querySelectorAll('.gv-choice').forEach(b => b.onclick = null);
  btn.classList.add(isCorrect ? 'correct' : 'wrong');

  if (isCorrect) {
    // random power-up: shield or slow
    const roll = Math.random();
    if (roll < 0.5) {
      shieldActive = true;
      shieldTimer = 300;
      document.getElementById('game-shield-display').textContent = '🛡️';
    } else {
      slowActive = true;
      slowTimer = 240;
      document.getElementById('game-shield-display').textContent = '🐢';
    }
    powerCooldown = POWER_CD;
    spawnParticles(cat.x+18, cat.y, '#FAC775', 12);
  } else {
    // mark wrong in wrong words list
    if (vocabQuestion) {
      const already = wrongWords.some(w => w.word === vocabQuestion.word);
      if (!already) { wrongWords.push(vocabQuestion); saveWrongWords(); }
    }
  }

  setTimeout(() => { closeVocabQuiz(isCorrect); }, 700);
}

function closeVocabQuiz(success) {
  document.getElementById('game-vocab-overlay').style.display = 'none';
  gState = 'playing';
  if (!success && !shieldActive) {
    // no penalty for wrong on power-up, just no reward
  }
}

// ---- Particles ----
function spawnParticles(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*5,
      vy: -Math.random()*5-1,
      life: 1, color,
      r: Math.random()*4+2
    });
  }
}

// ---- Obstacle types ----
const OBS_TYPES = [
  {type:'cactus', w:24, h:44, color:'#1D9E75', color2:'#0F6E56'},
  {type:'cactus2',w:18, h:36, color:'#5DCAA5', color2:'#1D9E75'},
  {type:'rock',   w:32, h:24, color:'#B4B2A9', color2:'#888780'},
  {type:'bird',   w:36, h:20, color:'#7F77DD', color2:'#534AB7', flies:true, flyY: GROUND-60},
];

function spawnObs() {
  const type = OBS_TYPES[Math.floor(Math.random()*OBS_TYPES.length)];
  const ob = Object.assign({}, type);
  ob.x = GW + 20;
  ob.y = ob.flies ? ob.flyY + ob.h/2 : GROUND + 32;
  obstacles.push(ob);
}

function collides(cat, ob) {
  // cat hitbox: tighter than sprite for fairness
  const cx1=cat.x+10, cy1=cat.y-22, cx2=cat.x+34, cy2=cat.y+30;
  const ox1=ob.x+5, oy1=ob.y-ob.h+6, ox2=ob.x+ob.w-5, oy2=ob.y;
  return cx1<ox2 && cx2>ox1 && cy1<oy2 && cy2>oy1;
}

// ---- Draw ----
function drawCat(x, y, t) {
  const run = Math.floor(t/7)%2;
  const isShield = shieldActive;
  const isSlow = slowActive;

  // Squish/stretch: stretch when jumping, squish when landing
  const scaleY = cat.onGround ? 1 : (cat.vy < 0 ? 1.15 : 0.9);
  const scaleX = cat.onGround ? 1 : (cat.vy < 0 ? 0.88 : 1.08);

  cx.save();
  cx.translate(x + 20, y + 16);
  cx.scale(scaleX, scaleY);
  cx.translate(-(x + 20), -(y + 16));

  // Shield aura
  if (isShield) {
    cx.save();
    cx.globalAlpha = 0.25 + Math.sin(t*0.15)*0.1;
    const shieldGrad = cx.createRadialGradient(x+20,y,0,x+20,y,42);
    shieldGrad.addColorStop(0,'rgba(93,202,165,0.5)');
    shieldGrad.addColorStop(1,'rgba(93,202,165,0)');
    cx.fillStyle = shieldGrad;
    cx.beginPath(); cx.arc(x+20,y,42,0,Math.PI*2); cx.fill();
    cx.globalAlpha = 0.9;
    cx.strokeStyle='#5DCAA5'; cx.lineWidth=2.5;
    cx.beginPath(); cx.arc(x+20,y,36,0,Math.PI*2); cx.stroke();
    cx.restore();
  }
  if (isSlow) {
    cx.save();
    cx.globalAlpha = 0.2 + Math.sin(t*0.2)*0.08;
    const slowGrad = cx.createRadialGradient(x+20,y,0,x+20,y,40);
    slowGrad.addColorStop(0,'rgba(127,119,221,0.5)');
    slowGrad.addColorStop(1,'rgba(127,119,221,0)');
    cx.fillStyle = slowGrad;
    cx.beginPath(); cx.arc(x+20,y,40,0,Math.PI*2); cx.fill();
    cx.globalAlpha = 0.9;
    cx.strokeStyle='#a78bfa'; cx.lineWidth=2.5;
    cx.beginPath(); cx.arc(x+20,y,34,0,Math.PI*2); cx.stroke();
    cx.restore();
  }

  // Shadow on ground
  if (cat.onGround) {
    cx.save();
    cx.globalAlpha = 0.18;
    cx.fillStyle = '#D4537E';
    cx.beginPath(); cx.ellipse(x+20, GROUND+34, 22, 5, 0, 0, Math.PI*2); cx.fill();
    cx.restore();
  }

  // tail (behind body)
  cx.strokeStyle='#FFB7C5'; cx.lineWidth=5; cx.lineCap='round';
  const tailWag = Math.sin(t*0.18)*12;
  cx.beginPath(); cx.moveTo(x+36,y+22); cx.quadraticCurveTo(x+56,y+tailWag+12,x+48,y+tailWag); cx.stroke();
  // tail tip
  cx.fillStyle='#FF8FAB';
  cx.beginPath(); cx.arc(x+48,y+tailWag,5,0,Math.PI*2); cx.fill();

  // body
  const bodyGrad = cx.createLinearGradient(x+4,y+2,x+4,y+26);
  bodyGrad.addColorStop(0,'#FFC8D5');
  bodyGrad.addColorStop(1,'#FFB7C5');
  cx.fillStyle=bodyGrad;
  cx.beginPath(); cx.roundRect(x+4,y+2,32,24,10); cx.fill();

  // belly
  cx.fillStyle='#FFE9F0';
  cx.beginPath(); cx.ellipse(x+20,y+17,10,8,0,0,Math.PI*2); cx.fill();

  // head
  const headGrad = cx.createLinearGradient(x+6,y-18,x+6,y+6);
  headGrad.addColorStop(0,'#FFC8D5');
  headGrad.addColorStop(1,'#FFB7C5');
  cx.fillStyle=headGrad;
  cx.beginPath(); cx.roundRect(x+5,y-18,30,26,10); cx.fill();

  // ears
  cx.fillStyle='#FF8FAB';
  cx.beginPath(); cx.moveTo(x+8,y-18); cx.lineTo(x+3,y-32); cx.lineTo(x+16,y-20); cx.fill();
  cx.beginPath(); cx.moveTo(x+26,y-18); cx.lineTo(x+36,y-32); cx.lineTo(x+30,y-20); cx.fill();
  cx.fillStyle='#FFD6E0';
  cx.beginPath(); cx.moveTo(x+9,y-19); cx.lineTo(x+6,y-28); cx.lineTo(x+15,y-21); cx.fill();
  cx.beginPath(); cx.moveTo(x+27,y-19); cx.lineTo(x+33,y-28); cx.lineTo(x+28,y-21); cx.fill();

  // eyes — blink occasionally
  const blink = (t % 120 < 4);
  cx.fillStyle='#3C3489';
  if (blink) {
    cx.fillRect(x+12, y-10, 7, 2);
    cx.fillRect(x+22, y-10, 7, 2);
  } else {
    cx.beginPath(); cx.ellipse(x+15,y-10,3.5,4,0,0,Math.PI*2); cx.fill();
    cx.beginPath(); cx.ellipse(x+26,y-10,3.5,4,0,0,Math.PI*2); cx.fill();
    cx.fillStyle='#fff';
    cx.beginPath(); cx.ellipse(x+16,y-12,1.5,1.5,0,0,Math.PI*2); cx.fill();
    cx.beginPath(); cx.ellipse(x+27,y-12,1.5,1.5,0,0,Math.PI*2); cx.fill();
    // cheek blush
    cx.save(); cx.globalAlpha=0.25;
    cx.fillStyle='#FF8FAB';
    cx.beginPath(); cx.ellipse(x+10,y-6,5,3,0,0,Math.PI*2); cx.fill();
    cx.beginPath(); cx.ellipse(x+31,y-6,5,3,0,0,Math.PI*2); cx.fill();
    cx.restore();
  }

  // nose + mouth
  cx.fillStyle='#FF8FAB';
  cx.beginPath(); cx.ellipse(x+20,y-5,2.5,2,0,0,Math.PI*2); cx.fill();
  cx.strokeStyle='#FF8FAB'; cx.lineWidth=1.2;
  cx.beginPath(); cx.moveTo(x+20,y-3); cx.lineTo(x+17,y); cx.moveTo(x+20,y-3); cx.lineTo(x+23,y); cx.stroke();

  // whiskers
  cx.strokeStyle='#D4537E'; cx.lineWidth=0.9;
  cx.beginPath(); cx.moveTo(x+8,y-7); cx.lineTo(x-4,y-8); cx.stroke();
  cx.beginPath(); cx.moveTo(x+8,y-4); cx.lineTo(x-4,y-4); cx.stroke();
  cx.beginPath(); cx.moveTo(x+32,y-7); cx.lineTo(x+44,y-8); cx.stroke();
  cx.beginPath(); cx.moveTo(x+32,y-4); cx.lineTo(x+44,y-4); cx.stroke();

  // legs — animated
  const l1=run?10:0, l2=run?0:10;
  cx.fillStyle='#FFB7C5';
  cx.beginPath(); cx.roundRect(x+8,y+24,9,l1?16:14,4); cx.fill();
  cx.beginPath(); cx.roundRect(x+23,y+24,9,l2?16:14,4); cx.fill();
  // paws
  cx.fillStyle='#FF8FAB';
  cx.beginPath(); cx.ellipse(x+12,y+24+(l1?16:14),5,4,0,0,Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(x+27,y+24+(l2?16:14),5,4,0,0,Math.PI*2); cx.fill();

  cx.restore();
}

function drawObstacle(ob) {
  cx.save();
  // shadow
  cx.globalAlpha=0.15;
  cx.fillStyle='#993556';
  cx.beginPath(); cx.ellipse(ob.x+ob.w/2, GROUND+36, ob.w/2+2, 4, 0, 0, Math.PI*2); cx.fill();
  cx.globalAlpha=1;

  if (ob.type==='cactus'||ob.type==='cactus2') {
    // main stem gradient
    const cg = cx.createLinearGradient(ob.x+ob.w/2-5,0,ob.x+ob.w/2+5,0);
    cg.addColorStop(0, ob.color); cg.addColorStop(1, ob.color2);
    cx.fillStyle=cg;
    cx.beginPath(); cx.roundRect(ob.x+ob.w/2-6,ob.y-ob.h+8,12,ob.h-8,4); cx.fill();
    // arms
    cx.fillStyle=ob.color;
    cx.beginPath(); cx.roundRect(ob.x+ob.w/2-14,ob.y-ob.h+18,10,16,3); cx.fill();
    cx.beginPath(); cx.roundRect(ob.x+ob.w/2+4,ob.y-ob.h+22,10,14,3); cx.fill();
    // arm tips
    cx.fillStyle=ob.color2;
    cx.beginPath(); cx.roundRect(ob.x+ob.w/2-14,ob.y-ob.h+18,10,5,2); cx.fill();
    cx.beginPath(); cx.roundRect(ob.x+ob.w/2+4,ob.y-ob.h+22,10,5,2); cx.fill();
    // top spikes
    cx.fillStyle=ob.color2;
    cx.beginPath(); cx.roundRect(ob.x+ob.w/2-4,ob.y-ob.h+4,8,6,2); cx.fill();
    // shine
    cx.fillStyle='rgba(255,255,255,0.25)';
    cx.beginPath(); cx.roundRect(ob.x+ob.w/2-3,ob.y-ob.h+10,3,ob.h-18,2); cx.fill();
  } else if (ob.type==='rock') {
    const rg = cx.createRadialGradient(ob.x+ob.w/2-4,ob.y-ob.h/2-4,2,ob.x+ob.w/2,ob.y-ob.h/2,ob.w/2);
    rg.addColorStop(0,'#D0CEC5'); rg.addColorStop(1,ob.color2);
    cx.fillStyle=rg;
    cx.beginPath(); cx.ellipse(ob.x+ob.w/2,ob.y-ob.h/2,ob.w/2,ob.h/2,0,0,Math.PI*2); cx.fill();
    cx.fillStyle='rgba(255,255,255,0.3)';
    cx.beginPath(); cx.ellipse(ob.x+ob.w/2-5,ob.y-ob.h/2-5,ob.w/5,ob.h/5,-0.4,0,Math.PI*2); cx.fill();
    cx.fillStyle=ob.color2;
    cx.beginPath(); cx.ellipse(ob.x+ob.w/2+4,ob.y-ob.h/2+4,ob.w/5,ob.h/6,0,0,Math.PI*2); cx.fill();
  } else if (ob.type==='bird') {
    const by=ob.y-ob.h/2;
    const wingFlap=Math.sin(gFrame*0.35)*10;
    // body gradient
    const bg2 = cx.createRadialGradient(ob.x+18,by,2,ob.x+18,by,16);
    bg2.addColorStop(0,'#9B94F0'); bg2.addColorStop(1,ob.color2);
    cx.fillStyle=bg2;
    cx.beginPath(); cx.ellipse(ob.x+18,by,17,9,0,0,Math.PI*2); cx.fill();
    // wings
    cx.fillStyle=ob.color;
    cx.beginPath(); cx.moveTo(ob.x+4,by); cx.quadraticCurveTo(ob.x+14,by-wingFlap-14,ob.x+26,by); cx.fill();
    cx.beginPath(); cx.moveTo(ob.x+12,by); cx.quadraticCurveTo(ob.x+24,by+wingFlap+12,ob.x+34,by); cx.fill();
    // wing shine
    cx.fillStyle='rgba(255,255,255,0.2)';
    cx.beginPath(); cx.moveTo(ob.x+7,by-2); cx.quadraticCurveTo(ob.x+14,by-wingFlap-8,ob.x+22,by-2); cx.fill();
    // eye
    cx.fillStyle='#fff';
    cx.beginPath(); cx.arc(ob.x+29,by-2,5,0,Math.PI*2); cx.fill();
    cx.fillStyle=ob.color2;
    cx.beginPath(); cx.arc(ob.x+30,by-2,2.5,0,Math.PI*2); cx.fill();
    cx.fillStyle='#fff';
    cx.beginPath(); cx.arc(ob.x+31,by-3,1,0,Math.PI*2); cx.fill();
    // beak
    cx.fillStyle='#FAC775';
    cx.beginPath(); cx.moveTo(ob.x+34,by+1); cx.lineTo(ob.x+40,by-1); cx.lineTo(ob.x+34,by+4); cx.closePath(); cx.fill();
  }
  cx.restore();
}

function drawCloud(c) {
  cx.save();
  cx.globalAlpha = 0.55;
  const grad = cx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.w/2);
  grad.addColorStop(0, '#ffe0ee');
  grad.addColorStop(1, 'rgba(244,192,209,0)');
  cx.fillStyle = grad;
  cx.beginPath(); cx.ellipse(c.x, c.y, c.w/2+10, 20, 0, 0, Math.PI*2); cx.fill();
  cx.globalAlpha = 0.45;
  cx.fillStyle = '#F4C0D1';
  cx.beginPath(); cx.ellipse(c.x, c.y, c.w/2, 14, 0, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(c.x-c.w/3, c.y+7, c.w/3, 10, 0, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(c.x+c.w/3, c.y+7, c.w/3.5, 10, 0, 0, Math.PI*2); cx.fill();
  cx.beginPath(); cx.ellipse(c.x-c.w/5, c.y-8, c.w/4, 9, 0, 0, Math.PI*2); cx.fill();
  cx.restore();
}

function drawGround() {
  // Sky gradient
  const skyGrad = cx.createLinearGradient(0,0,0,GROUND+32);
  skyGrad.addColorStop(0, '#fff0f8');
  skyGrad.addColorStop(1, '#fde8f2');
  cx.fillStyle = skyGrad;
  cx.fillRect(0, 0, GW, GROUND+32);

  // Ground shadow strip
  cx.fillStyle='#F4C0D1';
  cx.fillRect(0, GROUND+32, GW, 6);

  // Ground fill
  const groundGrad = cx.createLinearGradient(0, GROUND+38, 0, GH);
  groundGrad.addColorStop(0, '#FBEAF0');
  groundGrad.addColorStop(1, '#f9dce8');
  cx.fillStyle = groundGrad;
  cx.fillRect(0, GROUND+38, GW, GH);

  // Animated dash lines
  cx.fillStyle='#ED93B1';
  for (let i=0;i<12;i++) {
    const gx=((gGroundX*-1+i*80)%GW+GW)%GW;
    cx.beginPath();
    cx.roundRect(gx, GROUND+35, 44, 2, 1);
    cx.fill();
  }

  // Small grass tufts
  cx.fillStyle='#F4A0C0';
  for (let i=0;i<10;i++) {
    const gx=((gGroundX*-1*0.8+i*90+15)%GW+GW)%GW;
    cx.beginPath(); cx.moveTo(gx, GROUND+32); cx.lineTo(gx-4, GROUND+22); cx.lineTo(gx+4, GROUND+22); cx.closePath(); cx.fill();
    cx.beginPath(); cx.moveTo(gx+7, GROUND+32); cx.lineTo(gx+4, GROUND+24); cx.lineTo(gx+10, GROUND+24); cx.closePath(); cx.fill();
  }
}

// ---- Game loop ----
function resetGame() {
  gScore=0; gFrame=0; gSpeed=5; gSpeedMult=1;
  cat.y=GROUND; cat.vy=0; cat.onGround=true; cat.jumpCount=0; cat.animT=0;
  obstacles=[]; particles=[]; gGroundX=0;
  shieldActive=false; shieldTimer=0;
  slowActive=false; slowTimer=0;
  powerCooldown=0;
  document.getElementById('game-shield-display').textContent='—';
  document.getElementById('game-power-btn').disabled=false;
  document.getElementById('game-power-btn').textContent='⚡ Dùng từ vựng';
}

function gameLoop() {
  if (gState === 'vocab') { gRaf = requestAnimationFrame(gameLoop); return; }
  if (gState !== 'playing') return;

  gFrame++;
  gScore++;

  gSpeedMult = 1 + Math.floor(gScore/300)*0.15;
  const spd = (gSpeed * gSpeedMult) * (slowActive ? 0.4 : 1);

  document.getElementById('game-score-display').textContent = gScore;
  document.getElementById('game-speed-display').textContent = 'x' + gSpeedMult.toFixed(1);
  // Update shield HUD visual
  const shieldHudItem = document.getElementById('hud-shield-item');
  if (shieldHudItem) {
    if (shieldActive || slowActive) shieldHudItem.classList.add('shield-active');
    else shieldHudItem.classList.remove('shield-active');
  }

  // Power-up timers
  if (shieldActive) {
    shieldTimer--;
    if (shieldTimer <= 0) { shieldActive=false; document.getElementById('game-shield-display').textContent='—'; }
  }
  if (slowActive) {
    slowTimer--;
    if (slowTimer <= 0) { slowActive=false; if (!shieldActive) document.getElementById('game-shield-display').textContent='—'; }
  }
  if (powerCooldown > 0) {
    powerCooldown--;
    const btn = document.getElementById('game-power-btn');
    if (powerCooldown === 0) {
      btn.disabled=false;
      btn.textContent='⚡ Dùng từ vựng';
    } else {
      btn.disabled=true;
      btn.textContent='⏳ ' + Math.ceil(powerCooldown/60) + 's';
    }
  }

  gGroundX = (gGroundX + spd) % 80;
  clouds.forEach(c => { c.x -= spd*0.3; if(c.x<-100) c.x=GW+100; });

  // cat physics
  cat.vy += 0.7;
  cat.y += cat.vy;
  if (cat.y >= GROUND) { cat.y=GROUND; cat.vy=0; cat.onGround=true; cat.jumpCount=0; }
  cat.animT++;

  // obstacles
  const minGap = Math.max(600-gScore/10, 300);
  const lastOb = obstacles[obstacles.length-1];
  if (!lastOb || lastOb.x < GW - minGap - Math.random()*120) spawnObs();
  obstacles.forEach(ob => ob.x -= spd);
  obstacles = obstacles.filter(ob => ob.x > -60);

  // particles
  particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.life-=0.05; });
  particles = particles.filter(p => p.life>0);

  // collision
  for (const ob of obstacles) {
    if (collides(cat, ob)) {
      if (shieldActive) {
        shieldActive=false; shieldTimer=0;
        obstacles = obstacles.filter(o => o !== ob);
        spawnParticles(ob.x+ob.w/2, ob.y-ob.h/2, '#5DCAA5', 14);
        document.getElementById('game-shield-display').textContent='—';
        break;
      } else {
        endGame(); return;
      }
    }
  }

  // draw
  cx.clearRect(0,0,GW,GH);
  drawGround();
  clouds.forEach(drawCloud);
  // sparkle stars in sky
  cx.save();
  for (let i=0;i<6;i++) {
    const sx=((gGroundX*-0.1+i*137)%GW+GW)%GW;
    const sy=10+i*8%40;
    cx.fillStyle=`rgba(212,83,126,${0.15+Math.sin(gFrame*0.05+i)*0.1})`;
    cx.beginPath(); cx.arc(sx,sy,1.5,0,Math.PI*2); cx.fill();
  }
  cx.restore();
  obstacles.forEach(drawObstacle);
  drawCat(cat.x, cat.y, cat.animT);
  particles.forEach(p => {
    cx.save(); cx.globalAlpha=p.life;
    // star shape for some particles
    cx.fillStyle=p.color;
    cx.beginPath(); cx.arc(p.x,p.y,p.r,0,Math.PI*2); cx.fill();
    cx.restore();
  });

  gRaf = requestAnimationFrame(gameLoop);
}

function startGame() {
  resetGame();
  gState='playing';
  const emojiEl = document.getElementById('gov-emoji');
  if (emojiEl) emojiEl.textContent = '🐱';
  document.getElementById('game-overlay').style.display='none';
  document.getElementById('game-vocab-overlay').style.display='none';
  // Reset button visibility for next game-over
  const startBtn = document.getElementById('game-start-btn');
  const restartBtn = document.getElementById('game-restart-btn');
  const menuBtn = document.getElementById('game-menu-btn');
  if (startBtn) startBtn.style.display = 'none';
  if (restartBtn) restartBtn.style.display = 'none';
  if (menuBtn) menuBtn.style.display = 'none';
  gRaf = requestAnimationFrame(gameLoop);
}

function endGame() {
  gState='dead';
  cancelAnimationFrame(gRaf);
  if (gScore > gHighscore) { gHighscore=gScore; }
  document.getElementById('game-hs-display').textContent = gHighscore;

  const ov = document.getElementById('game-overlay');
  ov.style.display='flex';

  const emojiEl = document.getElementById('gov-emoji');
  if (emojiEl) emojiEl.textContent = '😿';
  document.getElementById('gov-title').textContent = 'Game Over!';
  document.getElementById('gov-sub').textContent = 'Mèo ngã rồi... thử lại nào!';

  const scoreEl = document.getElementById('gov-score');
  scoreEl.style.display='block';
  scoreEl.textContent = gScore + ' điểm';

  const hsEl = document.getElementById('gov-hs');
  hsEl.style.display='block';
  hsEl.textContent = '🏆 Kỷ lục: ' + gHighscore + ' điểm';

  // Show restart + menu, hide start
  const startBtn = document.getElementById('game-start-btn');
  const restartBtn = document.getElementById('game-restart-btn');
  const menuBtn = document.getElementById('game-menu-btn');
  if (startBtn) startBtn.style.display = 'none';
  if (restartBtn) { restartBtn.style.display = 'inline-flex'; restartBtn.onclick = startGame; }
  if (menuBtn) menuBtn.style.display = 'inline-flex';

  spawnParticles(cat.x+20, cat.y, '#FF8FAB', 22);
  // Keep drawing particles for a moment
  let deathFrames = 0;
  function deathDraw() {
    if (deathFrames++ > 40) return;
    cx.clearRect(0,0,GW,GH);
    drawGround();
    clouds.forEach(drawCloud);
    obstacles.forEach(drawObstacle);
    drawCat(cat.x, cat.y, cat.animT);
    particles.forEach(p => { p.x+=p.vx; p.y+=p.vy; p.vy+=0.2; p.life-=0.04; });
    particles = particles.filter(p=>p.life>0);
    particles.forEach(p => {
      cx.save(); cx.globalAlpha=p.life;
      cx.fillStyle=p.color;
      cx.beginPath(); cx.arc(p.x,p.y,p.r,0,Math.PI*2); cx.fill();
      cx.restore();
    });
    requestAnimationFrame(deathDraw);
  }
  deathDraw();
}

// ---- Event bindings ----
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  const gameActive = document.getElementById('game-screen').classList.contains('active');
  if ((e.code === 'Space' || e.code === 'ArrowUp') && gameActive) {
    e.preventDefault();
    if (gState === 'dead') { startGame(); return; }
    window.gameJump();
  }
});

})();
