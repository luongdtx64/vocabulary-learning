/* ==============================================
   APP EXTRAS — PWA, nhắc nhở, tự sao lưu, chuyển văn bản → JSON
   (nạp sau scripts.js, dùng chung biến toàn cục: words, showMsg, ...)
============================================== */
(function () {
  const $ = function (id) { return document.getElementById(id); };
  const LS = {
    get: function (k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } },
    set: function (k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  };
  const todayStr = function () { return new Date().toDateString(); };
  const fmt = function (t) {
    return new Date(t).toLocaleString("vi-VN", { hour12: false, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };
  const isStandalone = function () { return matchMedia("(display-mode: standalone)").matches || navigator.standalone; };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  /* ---------- hook vào hàm có sẵn ---------- */
  const _showScreen = showScreen;
  showScreen = function (id) {
    _showScreen(id);
    if (id === "backup-screen") renderBackups();
    if (id === "reminder-screen") refreshReminderUI();
  };
  const _bumpStreak = bumpStreak;
  bumpStreak = function () { _bumpStreak(); syncReminderState(); };

  /* ==============================================
     PWA
  ============================================== */
  let swReg = null, deferredInstall = null;
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").then(function (r) {
      swReg = r;
      syncReminderState();
      registerPeriodicSync();
    }).catch(function () {});
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); deferredInstall = e; });
  window.addEventListener("appinstalled", function () {
    deferredInstall = null; refreshReminderUI(); showMsg("Đã cài app! 🎉");
  });
  window.installApp = async function () {
    if (deferredInstall) {
      deferredInstall.prompt();
      await deferredInstall.userChoice;
      deferredInstall = null;
      refreshReminderUI();
    } else if (isIOS) {
      showMsg("Trên iPhone: bấm nút Chia sẻ (ô vuông có mũi tên) → \"Thêm vào MH chính\".");
    } else {
      showMsg("Mở menu ⋮ của trình duyệt → \"Cài đặt ứng dụng\" hoặc \"Thêm vào màn hình chính\".");
    }
  };

  /* ==============================================
     NHẮC NHỞ ÔN TẬP
  ============================================== */
  const remSettings = function () { return LS.get("mochi_reminder", { enabled: false, time: "20:00" }); };

  async function readCacheState() {
    try {
      const c = await caches.open("eto-meta");
      const r = await c.match("reminder-state");
      return r ? await r.json() : null;
    } catch (e) { return null; }
  }
  // Ghi trạng thái cho service worker (nó không đọc được localStorage)
  window.syncReminderState = async function () {
    try {
      const s = remSettings();
      const old = await readCacheState();
      const mine = localStorage.getItem("mochi_reminder_last") || "";
      const swLast = old && old.lastNotified || "";
      const c = await caches.open("eto-meta");
      await c.put("reminder-state", new Response(JSON.stringify({
        enabled: s.enabled, time: s.time,
        lastNotified: mine === todayStr() || swLast !== todayStr() ? mine : swLast,
        lastStudied: localStorage.getItem("mochi_last_date") || ""
      })));
    } catch (e) {}
  };

  async function notifyNow() {
    if (!("Notification" in window) || Notification.permission !== "granted") return false;
    const opts = {
      body: "Đến giờ ôn từ vựng rồi! Chỉ 5 phút thôi 💪",
      icon: "icons/icon-192.png", badge: "icons/icon-192.png", tag: "eto-review", data: { url: "./" }
    };
    try {
      const reg = swReg || (navigator.serviceWorker && await navigator.serviceWorker.getRegistration());
      if (reg) await reg.showNotification("ETO Club 📚", opts);
      else new Notification("ETO Club 📚", opts);
      return true;
    } catch (e) { return false; }
  }

  async function checkReminder() {
    const s = remSettings();
    if (!s.enabled) return;
    const now = new Date(), parts = s.time.split(":").map(Number);
    const due = new Date(); due.setHours(parts[0], parts[1], 0, 0);
    if (now < due) return;
    const st = await readCacheState();
    if (localStorage.getItem("mochi_reminder_last") === todayStr() || (st && st.lastNotified === todayStr())) return;
    if (localStorage.getItem("mochi_last_date") === todayStr()) { // hôm nay đã ôn rồi
      localStorage.setItem("mochi_reminder_last", todayStr());
      return;
    }
    if (await notifyNow()) {
      localStorage.setItem("mochi_reminder_last", todayStr());
      syncReminderState();
    }
  }
  setInterval(checkReminder, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { checkReminder(); autoBackupCheck(); } });

  // Chrome/Android (app đã cài): cho phép service worker tự thức dậy kiểm tra
  async function registerPeriodicSync() {
    try {
      if (!swReg || !("periodicSync" in swReg) || !remSettings().enabled) return false;
      const st = await navigator.permissions.query({ name: "periodic-background-sync" });
      if (st.state !== "granted") return false;
      await swReg.periodicSync.register("review-reminder", { minInterval: 60 * 60 * 1000 });
      return true;
    } catch (e) { return false; }
  }

  window.toggleReminder = async function () {
    const s = remSettings();
    if (!s.enabled) {
      if (!("Notification" in window)) { showMsg("Trình duyệt này không hỗ trợ thông báo."); return; }
      if (Notification.permission === "default") await Notification.requestPermission();
      if (Notification.permission !== "granted") {
        showMsg("Bạn cần cho phép thông báo trong cài đặt trình duyệt/điện thoại.");
        refreshReminderUI();
        return;
      }
      s.enabled = true;
    } else {
      s.enabled = false;
    }
    LS.set("mochi_reminder", s);
    await syncReminderState();
    await registerPeriodicSync();
    refreshReminderUI();
  };
  window.setReminderTime = function (v) {
    if (!v) return;
    const s = remSettings(); s.time = v;
    LS.set("mochi_reminder", s);
    localStorage.removeItem("mochi_reminder_last");
    syncReminderState(); refreshReminderUI();
  };
  window.testReminder = async function () {
    if (!("Notification" in window)) { showMsg("Trình duyệt này không hỗ trợ thông báo."); return; }
    if (Notification.permission === "default") await Notification.requestPermission();
    if (Notification.permission !== "granted") { showMsg("Thông báo đang bị chặn. Hãy bật lại trong cài đặt."); return; }
    showMsg((await notifyNow()) ? "Đã gửi thông báo thử!" : "Không gửi được thông báo.");
  };
  function refreshReminderUI() {
    const s = remSettings();
    const perm = ("Notification" in window) ? Notification.permission : "unsupported";
    const on = s.enabled && perm === "granted";
    const t = $("reminder-toggle"); if (!t) return;
    t.textContent = on ? "Bật" : "Tắt";
    t.classList.toggle("on", on);
    $("reminder-time").value = s.time;
    $("reminder-status").textContent = perm === "denied" ? "Thông báo đang bị chặn trong cài đặt"
      : perm === "unsupported" ? "Trình duyệt không hỗ trợ thông báo"
      : on ? "Sẽ nhắc lúc " + s.time + " mỗi ngày nếu bạn chưa ôn" : "Đang tắt";
    $("install-btn").style.display = isStandalone() ? "none" : "";
    $("install-done").style.display = isStandalone() ? "" : "none";
  }

  /* ==============================================
     SAO LƯU TỰ ĐỘNG (mỗi 72 giờ)
  ============================================== */
  const BK_KEY = "mochi_backups", BK_LAST = "mochi_backup_last", BK_EVERY = 72 * 3600 * 1000, BK_KEEP = 5;

  function downloadBlob(text, name, type) {
    const url = URL.createObjectURL(new Blob([text], { type: type || "application/json" }));
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  const stamp = function (t) { return new Date(t).toISOString().slice(0, 10); };

  function snapshot(reason) {
    const data = {
      t: Date.now(), reason: reason, words: words,
      wrongWords: LS.get("mochi_wrong_words", []), wrongCounts: LS.get("mochi_wrong_counts", {}),
      streak: localStorage.getItem("mochi_streak"), lastDate: localStorage.getItem("mochi_last_date")
    };
    let list = LS.get(BK_KEY, []);
    list.unshift(data);
    list = list.slice(0, BK_KEEP);
    try { LS.set(BK_KEY, list); }
    catch (e) { try { LS.set(BK_KEY, list.slice(0, 2)); } catch (e2) { return null; } }
    localStorage.setItem(BK_LAST, String(data.t));
    return data;
  }

  function autoBackupCheck() {
    if (!LS.get("mochi_autobackup", true) || !words.length) return;
    if (Date.now() - (+localStorage.getItem(BK_LAST) || 0) < BK_EVERY) return;
    const d = snapshot("auto");
    if (!d) return;
    if (LS.get("mochi_autodl", false)) downloadBlob(JSON.stringify(words, null, 2), "eto_backup_" + stamp(d.t) + ".json");
    renderBackups();
    showMsg("Đã tự sao lưu " + words.length + " từ ✅");
  }
  setInterval(autoBackupCheck, 3600000);

  window.backupNow = function () {
    if (!words.length) { showMsg("Chưa có từ nào để sao lưu!"); return; }
    snapshot("manual"); renderBackups(); showMsg("Đã sao lưu " + words.length + " từ!");
  };
  window.toggleAutoBackup = function () { LS.set("mochi_autobackup", !LS.get("mochi_autobackup", true)); renderBackups(); };
  window.toggleAutoDownload = function () { LS.set("mochi_autodl", !LS.get("mochi_autodl", false)); renderBackups(); };

  function restoreSnapshot(b) {
    snapshot("before-restore");
    LS.set("mochi_words", b.words || []);
    LS.set("mochi_wrong_words", b.wrongWords || []);
    LS.set("mochi_wrong_counts", b.wrongCounts || {});
    if (b.streak !== null && b.streak !== undefined) localStorage.setItem("mochi_streak", b.streak);
    if (b.lastDate) localStorage.setItem("mochi_last_date", b.lastDate);
    location.reload();
  }

  function renderBackups() {
    const box = $("backup-list"); if (!box) return;
    const list = LS.get(BK_KEY, []), auto = LS.get("mochi_autobackup", true);
    const last = +localStorage.getItem(BK_LAST) || 0;
    $("backup-status").textContent = last
      ? "Gần nhất: " + fmt(last) + (auto ? " · Lần tới: " + fmt(last + BK_EVERY) : "")
      : "Chưa có bản sao lưu tự động nào.";
    const a = $("autobackup-toggle"); a.textContent = auto ? "Bật" : "Tắt"; a.classList.toggle("on", auto);
    const d = $("autodl-toggle"); const dl = LS.get("mochi_autodl", false);
    d.textContent = dl ? "Bật" : "Tắt"; d.classList.toggle("on", dl);
    box.innerHTML = list.length ? "" : '<div class="empty-list">Chưa có bản sao lưu nào</div>';
    list.forEach(function (b) {
      const row = document.createElement("div");
      row.className = "snap-row";
      row.innerHTML = '<div class="snap-info"><strong></strong><span></span></div><div class="snap-actions"></div>';
      row.querySelector("strong").textContent = fmt(b.t);
      row.querySelector("span").textContent = (b.words || []).length + " từ · " +
        ({ auto: "tự động", manual: "thủ công", "before-restore": "trước khi khôi phục" }[b.reason] || b.reason);
      const acts = row.querySelector(".snap-actions");
      const restore = document.createElement("button"); restore.className = "snap-btn"; restore.textContent = "Khôi phục";
      restore.onclick = function () {
        showMsg("Khôi phục bản " + fmt(b.t) + "? Dữ liệu hiện tại sẽ được lưu lại trước.", function () { restoreSnapshot(b); }, function () {});
      };
      const down = document.createElement("button"); down.className = "snap-btn"; down.textContent = "Tải";
      down.onclick = function () { downloadBlob(JSON.stringify(b.words || [], null, 2), "eto_backup_" + stamp(b.t) + ".json"); };
      acts.append(restore, down);
      box.appendChild(row);
    });
  }

  // đổi tên file xuất thủ công theo ngày
  window.exportWords = function () {
    if (!words.length) { showMsg("Chưa có từ nào để xuất!"); return; }
    downloadBlob(JSON.stringify(words, null, 2), "eto_backup_" + stamp(Date.now()) + ".json");
    showMsg("Đã xuất " + words.length + " từ!");
  };

  /* ==============================================
     CHUYỂN VĂN BẢN → JSON
     Mỗi dòng:  từ - nghĩa   |   từ (loại từ) - nghĩa   |   từ - nghĩa VI | English meaning
  ============================================== */
  const TYPE_MAP = {
    n: "Danh từ", noun: "Danh từ", "danh từ": "Danh từ", dt: "Danh từ",
    v: "Động từ", verb: "Động từ", "động từ": "Động từ", dgt: "Động từ",
    adj: "Tính từ", a: "Tính từ", adjective: "Tính từ", "tính từ": "Tính từ", tt: "Tính từ",
    adv: "Trạng từ", adverb: "Trạng từ", "trạng từ": "Trạng từ",
    pron: "Đại từ", pronoun: "Đại từ", "đại từ": "Đại từ",
    prep: "Giới từ", preposition: "Giới từ", "giới từ": "Giới từ",
    conj: "Liên từ", conjunction: "Liên từ", "liên từ": "Liên từ",
    interj: "Thán từ", excl: "Thán từ", interjection: "Thán từ", "thán từ": "Thán từ"
  };
  const SEP = /\t|\s[-–—]+\s|\s*(?:->|=>|→)\s*|\s*[:=]\s*/;
  const TAG = /\s*[\(\[]\s*([^\)\]]{1,12}?)\s*[\)\]]/;
  const clean = function (s) { return s.replace(/\s+/g, " ").trim(); };

  function takeType(str) {
    const m = TAG.exec(str);
    if (!m) return { text: str, type: null };
    const t = TYPE_MAP[m[1].toLowerCase().replace(/\./g, "").trim()];
    return t ? { text: str.replace(m[0], ""), type: t } : { text: str, type: null };
  }

  function convertText(raw) {
    const out = [], seen = new Set(), skipped = [];
    raw.split(/\r?\n/).forEach(function (line, i) {
      line = line.trim().replace(/^(?:\d+[.)]|[-*•])\s+/, "");
      if (!line) return;
      const m = SEP.exec(line);
      if (!m) { skipped.push(i + 1); return; }
      let left = line.slice(0, m.index), right = line.slice(m.index + m[0].length);
      let tl = takeType(left), type = tl.type;
      left = tl.text;
      if (!type && /^\s*[\(\[]/.test(right)) { const tr = takeType(right); if (tr.type) { type = tr.type; right = tr.text; } }
      const bar = right.indexOf("|");
      const vi = clean(bar >= 0 ? right.slice(0, bar) : right), en = bar >= 0 ? clean(right.slice(bar + 1)) : "";
      const word = clean(left);
      if (!word || !vi) { skipped.push(i + 1); return; }
      const key = word.toLowerCase();
      if (seen.has(key)) { skipped.push(i + 1); return; }
      seen.add(key);
      const item = { word: word, meaning: vi, type: type || "Danh từ" };
      if (en) item.meaningEn = en;
      out.push(item);
    });
    return { items: out, skipped: skipped };
  }

  window.showConvertBox = function () {
    $("convert-popup").classList.remove("hidden");
    $("convert-input").focus();
  };
  window.closeConvertBox = function () { $("convert-popup").classList.add("hidden"); };
  window.runConvert = function () {
    const raw = $("convert-input").value;
    if (!raw.trim()) { showMsg("Bạn chưa nhập gì!"); return; }
    const r = convertText(raw);
    $("convert-output").value = r.items.length ? JSON.stringify(r.items, null, 2) : "";
    $("convert-status").textContent = r.items.length
      ? "✅ Chuyển được " + r.items.length + " từ" + (r.skipped.length ? " · bỏ qua dòng " + r.skipped.join(", ") + " (thiếu nghĩa, sai định dạng hoặc trùng)" : "")
      : "Không đọc được dòng nào. Mỗi dòng cần dạng: từ - nghĩa";
  };
  window.copyConvert = async function () {
    const v = $("convert-output").value;
    if (!v) { showMsg("Chưa có JSON để sao chép!"); return; }
    try { await navigator.clipboard.writeText(v); }
    catch (e) { $("convert-output").select(); document.execCommand("copy"); }
    showMsg("Đã sao chép JSON!");
  };
  window.downloadConvert = function () {
    const v = $("convert-output").value;
    if (!v) { showMsg("Chưa có JSON để tải!"); return; }
    downloadBlob(v, "eto_words_" + stamp(Date.now()) + ".json");
  };
  window.importConvert = function () {
    const v = $("convert-output").value;
    if (!v) { showMsg("Chưa có JSON để nhập!"); return; }
    closeConvertBox();
    validateAndImport(JSON.parse(v));
  };

  /* ---------- khởi động ---------- */
  refreshReminderUI();
  renderBackups();
  autoBackupCheck();
  checkReminder();
})();
