let words = JSON.parse(localStorage.getItem("mochi_words") || "[]");
let reviewQueue = [];
let currentWord = null;

/* -------------------- SCREEN CONTROL -------------------- */
function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");

    if(id === "review-screen") startReview();
}
function showCredit(){
    
    
}
/* -------------------- MESSAGE BOX -------------------- */
function showMsg(text, callbackYes=null, callbackNo=null) {
    const box = document.getElementById("msgbox");
    box.innerHTML = '';
    box.classList.remove("hidden");

    if(callbackYes && callbackNo){
        const span = document.createElement('span');
        span.innerText = text;
        box.appendChild(span);

        const btnYes = document.createElement('button');
        btnYes.innerText = "Đúng";
        btnYes.className = 'msg-btn yes';
        btnYes.onclick = () => { box.classList.add("hidden"); callbackYes(); };

        const btnNo = document.createElement('button');
        btnNo.innerText = "Không";
        btnNo.className = 'msg-btn no';
        btnNo.onclick = () => { box.classList.add("hidden"); callbackNo(); };

        box.appendChild(btnYes);
        box.appendChild(btnNo);
    } else {
        box.innerText = text;
        setTimeout(() => box.classList.add("hidden"), 1500);
    }
}

/* Message box + GIF */
function showMsgWithGif(text, gifUrl, callback=null){
    const box = document.getElementById("msgbox");
    box.innerHTML = '';
    box.classList.remove("hidden");

    const span = document.createElement('span');
    span.innerText = text;
    box.appendChild(span);

    if(gifUrl){
        const img = document.createElement('img');
        img.src = gifUrl;
        box.appendChild(img);
    }

    if(callback){
        setTimeout(() => { box.classList.add("hidden"); callback(); }, 2000);
    } else {
        setTimeout(() => box.classList.add("hidden"), 2000);
    }
}

/* -------------------- SPELL CHECK -------------------- */
async function checkSpelling(word) {
    try {
        const resp = await fetch('https://api.languagetool.org/v2/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                text: word,
                language: 'en-US'
            })
        });
        const data = await resp.json();
        if (!data.matches || data.matches.length === 0) return null;
        const first = data.matches[0];
        if(first.replacements && first.replacements.length > 0) return first.replacements[0];
        return null;
    } catch (err) {
        console.error(err);
        return null;
    }
}

/* -------------------- ADD WORD -------------------- */
async function addWord() {
    const w = document.getElementById("word-input").value.trim();
    const m = document.getElementById("meaning-input").value.trim();
    const t = document.getElementById("type-input").value;

    if (!w || !m) {
        showMsg("Bạn chưa nhập đủ dữ liệu!");
        return;
    }

    const suggestion = await checkSpelling(w);

    if(suggestion && typeof suggestion === "string" && suggestion.toLowerCase() !== w.toLowerCase()){
        showMsg(`Ý bạn là "${suggestion}"?`, 
            () => saveWord(suggestion, m, t), 
            () => saveWord(w, m, t)
        );
    } else {
        saveWord(w, m, t);
    }
}

function saveWord(word, meaning, type){
    words.push({ word, meaning, type });
    localStorage.setItem("mochi_words", JSON.stringify(words));
    showMsg("Đã lưu từ!");
    document.getElementById("word-input").value = "";
    document.getElementById("meaning-input").value = "";
}

/* -------------------- REVIEW -------------------- */
function startReview() {
    if(words.length === 0){
        document.getElementById("review-word").innerText = "Chưa có từ!";
        document.getElementById("review-meaning").style.display = "none";
        document.getElementById("review-type").style.display = "none";
        document.getElementById("next-btn").style.display = "none";
        return;
    }

    reviewQueue = [...words];
    showNextWord();
}

function showNextWord() {
    const card = document.getElementById("flashcard");
    const meaningP = document.getElementById("review-meaning");
    const typeP = document.getElementById("review-type");
    const nextBtn = document.getElementById("next-btn");

    if(reviewQueue.length === 0){
        document.getElementById("review-word").innerText = "Đã học hết lượt này!";
        meaningP.style.display = "none";
        typeP.style.display = "none";
        nextBtn.style.display = "none";
        return;
    }

    const idx = Math.floor(Math.random() * reviewQueue.length);
    currentWord = reviewQueue[idx];

    card.classList.add("slide-out");

    setTimeout(()=>{
        document.getElementById("review-word").innerText = currentWord.word;
        meaningP.style.display = "block";
        meaningP.innerHTML = `<input type="text" id="user-meaning" placeholder="Nhập nghĩa của từ này" style="width:80%;padding:8px;border-radius:8px;border:1px solid #ccc">`;
        typeP.style.display = "block";
        typeP.innerText = currentWord.type;

        card.classList.remove("slide-out");
        card.classList.add("slide-in");
        setTimeout(()=> card.classList.remove("slide-in"), 200);

        reviewQueue.splice(idx,1);

        nextBtn.style.display = "inline-block";
        nextBtn.innerText = "Kiểm tra & Tiếp theo";
        nextBtn.onclick = checkUserMeaning;

    }, 300);
}

function checkUserMeaning() {
    const userInput = document.getElementById("user-meaning").value.trim().toLowerCase();
    const correctMeaning = currentWord.meaning.trim().toLowerCase();
    let gifUrl = "";

    if(!userInput){
        showMsg("Bạn chưa nhập nghĩa!");
        return;
    }

    if(userInput === correctMeaning){
        gifUrl = "https://mygyuuuncollection.web.app/images/Peppy%20Usagyuuun!/5.gif";
        showMsgWithGif("Chính xác! 🎉", gifUrl, showNextWord);
    } else {
        gifUrl = "https://mygyuuuncollection.web.app/images/Peppy%20Usagyuuun!/9.gif";
        showMsgWithGif(`Sai! Nghĩa đúng là: "${currentWord.meaning}"`, gifUrl, showNextWord);
    }
}
/* -------------------- HIỂN THỊ TẤT CẢ TỪ -------------------- */
function showAllWords(){
    const listDiv = document.getElementById("word-list");
    listDiv.innerHTML = '';
    if(words.length === 0){
        listDiv.innerText = "Chưa có từ nào!";
        listDiv.style.display = "block";
        return;
    }

    words.forEach((w, idx) => {
        const div = document.createElement('div');
        div.style.marginBottom = "10px";
        div.style.display = "flex";
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";

        div.innerHTML = `<span>${w.word} - ${w.meaning} (${w.type})</span>`;
        const delBtn = document.createElement('button');
        delBtn.innerText = "Xoá";
        delBtn.style.background = "#ff4b81";
        delBtn.style.color = "#fff";
        delBtn.style.border = "none";
        delBtn.style.padding = "5px 10px";
        delBtn.style.borderRadius = "8px";
        delBtn.style.cursor = "pointer";
        delBtn.onclick = () => {
            showMsg(`Bạn có chắc xoá từ "${w.word}"?`, 
                () => { words.splice(idx,1); localStorage.setItem("mochi_words", JSON.stringify(words)); showAllWords(); }, 
                () => {}
            );
        };

        div.appendChild(delBtn);
        listDiv.appendChild(div);
    });

    listDiv.style.display = "block";
}

/* -------------------- XOÁ TẤT CẢ -------------------- */
function deleteAllWords(){
    if(words.length === 0){
        showMsg("Chưa có từ nào để xoá!");
        return;
    }
    showMsg("Bạn có chắc muốn xoá tất cả từ?", 
        () => { words = []; localStorage.removeItem("mochi_words"); document.getElementById("word-list").style.display="none"; showMsg("Đã xoá tất cả từ!"); }, 
        () => {}
    );
}

/* -------------------- TÌM & XOÁ TỪ -------------------- */
function showDeleteWordPrompt(){
    const wordToDelete = prompt("Nhập từ bạn muốn xoá:");
    if(!wordToDelete) return;

    const idx = words.findIndex(w => w.word.toLowerCase() === wordToDelete.toLowerCase());
    if(idx === -1){
        showMsg(`Không tìm thấy từ "${wordToDelete}"`);
        return;
    }

    showMsg(`Bạn có chắc xoá từ "${words[idx].word}"?`, 
        () => { words.splice(idx,1); localStorage.setItem("mochi_words", JSON.stringify(words)); showAllWords(); }, 
        () => {}
    );
}
// Hiển thị popup credit
document.getElementById("credit-btn").addEventListener("click", ()=>{
    document.getElementById("credit-popup").classList.remove("hidden");
});

// Đóng popup khi nhấn nút "Đóng"
document.querySelector(".btn-credit").addEventListener("click", ()=>{
    document.getElementById("credit-popup").classList.add("hidden");
});
