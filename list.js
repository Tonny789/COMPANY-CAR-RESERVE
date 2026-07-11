if (window.__LIST_JS_LOADED__) {
  console.warn("list.js already loaded");
} else {
  window.__LIST_JS_LOADED__ = true;
}

// 🟢 最新の「社有車一覧取得用」URL
const LOGIC_APPS_RESERVATION_URL = "https://prod-19.eastasia.logic.azure.com:443/workflows/d5f1c6f77ab64df687dd04be7dbbddc4/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=7kzTEsa2rrimqWeFIYoRLGvzR-NSCElFzlubc3kAUgg";

// 日付管理用の変数をグローバルに定義
let startDateRef = { date: new Date() };

// =========================
// ホームページ起動チェック
// =========================
async function checkHomeAccess() {
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return "";
  }

  let raw = getCookie("authId") || "";
  let authId = decodeURIComponent(raw).trim();

  if (!/^[A-Za-z0-9]{5}$/.test(authId)) {
    authId = "firstaccess";
  }

  const url = "https://prod-44.japaneast.logic.azure.com:443/workflows/420771912e6e44a0ab887281e2dfdb7e/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=aNKcYEygrDv3lHO0pBbUg92tCxmELwvGPQuqeBy95U8";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authId: authId })
    });

    const result = await res.json();

    if (result.allowed === false || result.allowed === "false") {
      console.log("NG → ホームページ起動を停止します。");
      window.location.href = "https://www.google.com/";
      return false;
    }

    if (result.newAuthId && /^[A-Za-z0-9]{5}$/.test(result.newAuthId)) {
      document.cookie = `authId=${result.newAuthId}; path=/; Max-Age=2592000; SameSite=Lax;`;
      console.log("Cookieを保存しました:", result.newAuthId);
    }

    return true;
  } catch (e) {
    console.log("フロー呼び出し失敗 → 起動停止");
    return false;
  }
}

// =========================
// My予約ページ起動チェック
// =========================
async function checkMyReservationAccess() {
  const roomID = sessionStorage.getItem("roomID");
  if (!roomID) {
    window.location.href = "https://www.google.com/";
    return false;
  }

  const url = "https://prod-47.japaneast.logic.azure.com:443/workflows/9063c3619d9549399a65439ec79fb0e7/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=nr4wTdvrsGG_x7icmS7mOnOq2zOdVB9_UMJnZ-ves_Y";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomNumber: roomID })
    });
    const result = await response.json();

    if (!(result.allowed === true || result.status === "OK")) {
      window.location.href = "https://www.google.com/";
      return false;
    }
    return true;
  } catch (e) {
    window.location.href = "https://www.google.com/";
    return false;
  }
}

// =========================
// 共通ユーティリティ（🔴 4引数対応に完全修正）
// =========================
function showAlert(message, onOk, type, initVal) { 
  const modal = document.getElementById("customAlert");
  const msgElem = document.getElementById("alertMessage");
  const okBtn = document.getElementById("alertOkButton");
  const inputElem = document.getElementById("alertInput"); 
  const cancelBtn = document.getElementById("alertCancelButton");

  msgElem.textContent = message;
  modal.style.display = "block";

  inputElem.style.display = "none";
  cancelBtn.style.display = "none";
  okBtn.style.display = "inline-block";

  if (type === "loading") {
    okBtn.style.display = "none";
  } 
  else if (type === "input") {
    inputElem.style.display = "block";
    // 🔴 初期入力文字があればボックスにあらかじめセットする
    inputElem.value = (initVal !== undefined && initVal !== null) ? initVal : ""; 
    cancelBtn.style.display = "inline-block";
    
    cancelBtn.onclick = function() {
        modal.style.display = "none";
    };

    okBtn.onclick = function() {
        const val = inputElem.value.trim();
        if (!val) {
            alert("内容を入力してください。");
            return;
        }
        modal.style.display = "none";
        if (onOk) onOk(val); 
    };
  } 
  else {
    okBtn.onclick = function() {
        modal.style.display = "none";
        if (onOk) onOk(); 
    };
  }
}

function closeAlert() {
  document.getElementById("customAlert").style.display = "none";
}

function formatDateKey(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function formatDateDisplay(date) {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${mm}月${dd}日`;
}

function parseDateKey(key) {
  const y = parseInt(key.substring(0, 4), 10);
  const m = parseInt(key.substring(4, 6), 10) - 1;
  const d = parseInt(key.substring(6, 8), 10);
  return new Date(y, m, d);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// =========================
// ログオン状態管理
// =========================
function getLoginInfo() {
  const room = localStorage.getItem("roomID");
  const expiry = localStorage.getItem("roomID_expiry");
  if (!room || !expiry) return null;

  const now = Date.now();
  if (now > parseInt(expiry, 10)) {
    localStorage.removeItem("roomID");
    localStorage.removeItem("roomID_expiry");
    return null;
  }
  return room.trim().toUpperCase();
}

function setLoginInfo(roomId) {
  const expiresAt = Date.now() + (1000 * 60 * 60 * 24 * 30);
  localStorage.setItem("roomID", roomId);
  localStorage.setItem("roomID_expiry", String(expiresAt));
}

function clearLoginInfo() {
  localStorage.removeItem("roomID");
  localStorage.removeItem("roomID_expiry");
}

// =========================
// 画面制御（ボタン状態）
// =========================
function updateLoginUI() {
  const loginId = getLoginInfo();

  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const passwordChangeBtn = document.getElementById("passwordChangeBtn");
  const roomDisplay = document.getElementById("roomDisplay");
  const myReservationBtn = document.getElementById("myReservationBtn");

  if (roomDisplay) {
    roomDisplay.textContent = loginId ? `${loginId}（ログオン済）` : "未ログオン状態です";
  }

  if (loginBtn) loginBtn.style.display = loginId ? "none" : "inline-block";
  if (logoutBtn) logoutBtn.style.display = loginId ? "inline-block" : "none";
  if (passwordChangeBtn) passwordChangeBtn.style.display = loginId ? "inline-block" : "none";

  if (myReservationBtn) {
    if (loginId) {
      myReservationBtn.disabled = false;
      myReservationBtn.classList.remove("almost-hidden");
    } else {
      myReservationBtn.disabled = true;
      myReservationBtn.classList.add("almost-hidden");
    }
  }
}

function updateWeekButtons(currentStartDate) {
  const prevWeekBtn = document.getElementById("prevWeekBtn");
  const nextWeekBtn = document.getElementById("nextWeekBtn");

  if (!prevWeekBtn || !nextWeekBtn) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(currentStartDate);
  start.setHours(0, 0, 0, 0);

  const prevStart = addDays(start, -7);
  const nextStart = addDays(start, 7);

  if (prevStart < today) {
    prevWeekBtn.disabled = true;
    prevWeekBtn.classList.add("almost-hidden");
  } else {
    prevWeekBtn.disabled = false;
    prevWeekBtn.classList.remove("almost-hidden");
  }

  const futureLimit = new Date(today);
  futureLimit.setMonth(futureLimit.getMonth() + 3);

  if (nextStart > futureLimit) {
    nextWeekBtn.disabled = true;
    nextWeekBtn.classList.add("almost-hidden");
  } else {
    nextWeekBtn.disabled = false;
    nextWeekBtn.classList.remove("almost-hidden");
  }
}

function updateWeekButtonsVisibility(show) {
  const prev = document.getElementById("prevWeekBtn");
  const next = document.getElementById("nextWeekBtn");
  if (prev) prev.style.visibility = show ? "visible" : "hidden";
  if (next) next.style.visibility = show ? "visible" : "hidden";
}

// =========================
// 予約一覧取得（Logic Apps経由）
// =========================
async function fetchReservations(startKey, endKey, roomFilter) {
  let filter = `cr15f_yoyaku_taishobi ge '${startKey}' and cr15f_yoyaku_taishobi le '${endKey}'`;
  if (roomFilter) {
    filter += ` and cr15f_name eq '${roomFilter}'`;
  }

  const url = LOGIC_APPS_RESERVATION_URL;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        filter: filter,
        orderby: "cr15f_yoyaku_taishobi asc, cr15f_model asc, cr15f_sort asc, cr15f_time asc"
      })
    });

    if (!res.ok) return [];
    const data = await res.json();
    console.log("取得データ:", data);
    return data.value ? data.value : data;
  } catch (e) {
    console.error("通信エラー:", e);
    return [];
  }
}

// =========================
// Automate 呼び出し URL定義
// =========================
const FLOW_URL_RESERVE = "https://prod-38.japaneast.logic.azure.com:443/workflows/662a5f4c38ae4fb388c36accf9678b26/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=jD3MDPKD1CPj7LBjT0zbEnSIzdh4LHelQvpx8TdQ-ZE";
const FLOW_URL_CANCEL = "https://prod-29.japaneast.logic.azure.com:443/workflows/9aea3d5e54d6429c9afde6871bb77b68/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=48HJw9e2YUzDQRYqNDKs7Qbdrkq5voI14lHiBSRFrgM";
const FLOW_URL_UPDATE_CONTENT = "https://prod-44.japaneast.logic.azure.com:443/workflows/b6837bfb574640be88bd0586d75fce5d/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=aB2NXJKPcsWD2_lC4qLwedWGnLtt1iS35DoHXkAcXT8";

async function callReserveFlow(recordId, roomNumber) {
  const res = await fetch(FLOW_URL_RESERVE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId: recordId, roomNumber: roomNumber })
  });
  if (!res.ok) throw new Error("予約処理フロー呼び出し失敗: " + res.status);
  return await res.json();
}

async function callCancelFlow(recordId, roomNumber) {
  const res = await fetch(FLOW_URL_CANCEL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recordId: recordId, roomNumber: roomNumber })
  });
  if (!res.ok) throw new Error("取消処理フロー呼び出し失敗: " + res.status);
  return await res.json();
}

async function callLoginFlow(roomNumber, password) {
  const url = "https://prod-22.japaneast.logic.azure.com:443/workflows/d316ee23d3ca46c88e1400d5f580ee95/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DF-ssUFf9jKTr2r_lswETZsYoD4Sc8NjLN_m7j_2Olk";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomNumber: roomNumber, password: password })
  });
  return await res.json();
}

// =========================
// 一覧描画（🟢 安定運用中の10pxフォント縮小版）
// =========================
function renderReservationList(records, mode, loginId) {
  const tbody = document.getElementById("reservationTableBody");
  const tableContainer = document.querySelector(".table-responsive");
  
  if (tableContainer) {
    tableContainer.style.minHeight = tableContainer.offsetHeight + "px";
  }

  tbody.querySelectorAll("tr:not(.template)").forEach(row => row.remove());

  let template = tbody.querySelector(".template") || document.querySelector("#reservationTable .template");
  if (!template) {
    if (tableContainer) tableContainer.style.minHeight = "auto";
    return;
  }

  if (!records || records.length === 0) {
    if (tableContainer) tableContainer.style.minHeight = "auto";
    return;
  }

  let lastDate = "";
  let lastArea = "";

  records.forEach((item) => {
    const tr = template.cloneNode(true);
    tr.classList.remove("template", "d-none");
    tr.style.display = "";

    const dateKey = item.cr15f_yoyaku_taishobi || "";
    const currentArea = item.cr15f_model || "-";

    const dateCell = tr.querySelector(".reservation-date-cell");
    if (dateKey === lastDate) {
      dateCell.textContent = "";
    } else {
      dateCell.textContent = `${dateKey.substring(4, 6)}月${dateKey.substring(6, 8)}日`;
      lastDate = dateKey;
      lastArea = "";
    }

    const areaCell = tr.querySelector(".reservation-model");
    if (currentArea === lastArea) {
      areaCell.textContent = "";
    } else {
      areaCell.textContent = currentArea;
      lastArea = currentArea;
    }

    tr.querySelector(".reservation-time").textContent = item.cr15f_time || "-";
    tr.querySelector(".reservation-name").textContent = item.cr15f_yoyakustatus !== "空き" ? item.cr15f_name || "-" : "-";

    // 🟢 安定版のフォント縮小設定（スペース無し・左寄せ連携用）
    const statusCell = tr.querySelector(".reservation-status");
    const statusText = item.cr15f_yoyakustatus || "-";
    statusCell.textContent = statusText;

    if (statusText === "空き") {
        statusCell.style.setProperty("font-size", "13px", "important");
        statusCell.style.letterSpacing = "normal"; // 通常の文字間隔
        statusCell.style.textDecoration = "none";
        statusCell.style.color = "inherit";
        statusCell.classList.remove("clickable-update");
        statusCell.removeAttribute("data-reserved-by");
    } else {
        // 🔴 確実に文字数をチェックして、16%幅の中に10文字を詰め込む
        if (statusText.length >= 7) {
            // 8文字以上（10文字入力対応）：8.5px＋文字間を少し詰める
            statusCell.style.setProperty("font-size", "8.5px", "important");
            statusCell.style.letterSpacing = "-0.3px"; 
        } else if (statusText.length >= 5) {
            // 6〜7文字：11px
            statusCell.style.setProperty("font-size", "11px", "important");
            statusCell.style.letterSpacing = "normal";
        } else {
            // 5文字以下：13px（標準）
            statusCell.style.setProperty("font-size", "13px", "important");
            statusCell.style.letterSpacing = "normal";
        }
        
        statusCell.style.cursor = "pointer";
        statusCell.style.textDecoration = "underline";
        statusCell.style.color = "#0056b3";
        statusCell.classList.add("clickable-update");
        statusCell.setAttribute("data-reserved-by", item.cr15f_name || "");
    }

    const reserveBtn = tr.querySelector(".reserve-btn");
    const cancelBtn = tr.querySelector(".cancel-btn");
    tr.setAttribute("data-recordid", item.cr15f_company_careid);

    if (statusText !== "空き") {
      cancelBtn.style.display = "inline-block";
      reserveBtn.style.display = "none";
    } else {
      reserveBtn.style.display = "inline-block";
      cancelBtn.style.display = "none";
    }

    tbody.appendChild(tr);
  });

  setTimeout(() => {
    if (tableContainer) tableContainer.style.minHeight = "auto";
  }, 100);
}

// =========================
// 共通：日付とエリアを遡って取得する関数
// =========================
function getRowDetail(row) {
  let dateText = "";
  let areaText = "";
  const timeText = row.querySelector(".reservation-time").textContent;

  let dateRow = row;
  while (dateRow) {
    dateText = dateRow.querySelector(".reservation-date-cell").textContent.trim();
    if (dateText) break;
    dateRow = dateRow.previousElementSibling;
  }

  let areaRow = row;
  while (areaRow) {
    areaText = areaRow.querySelector(".reservation-model").textContent.trim();
    if (areaText) break;
    areaRow = areaRow.previousElementSibling;
  }

  return { date: dateText || "不明な日付", area: areaText || "共通", time: timeText };
}

async function handleReserveClick(recordId, btn) {
  const loginId = getLoginInfo();
  if (!loginId) { 
      showAlert("予約や取消を行うには、まずお名前を選択してログオンしてください。"); 
      return; 
  }
  showAlert("処理中です...", null, "loading");
  try {
    const flowResult = await callReserveFlow(recordId, loginId);
    if (flowResult && (flowResult.status === "success" || flowResult.status === "OK")) {
      closeAlert(); 
      loadWeekView(startDateRef.date, "WEEK"); 
    } else {
      closeAlert();
      showAlert(flowResult.message || "予約に失敗しました。");
    }
  } catch (err) {
    closeAlert();
    showAlert("通信エラーが発生しました。");
  }
}

async function handleCancelClick(recordId, btn) {
  const loginId = getLoginInfo();
  if (!loginId) { 
      showAlert("取消にはログオンが必要です。"); 
      return; 
  }
  showAlert("処理中です...", null, "loading");
  try {
    const flowResult = await callCancelFlow(recordId, loginId);
    if (flowResult && (flowResult.status === "success" || flowResult.status === "OK")) {
      closeAlert();
      if (document.getElementById("prevWeekBtn").style.visibility === "hidden") {
          loadMyReservationView(); 
      } else {
          loadWeekView(startDateRef.date, "WEEK"); 
      }
    } else {
      closeAlert();
      showAlert(flowResult.message || "取消に失敗しました。");
    }
  } catch (err) {
    closeAlert();
    showAlert("通信エラーが発生しました。");
  }
}

// =========================
// 週表示ロード
// =========================
async function loadWeekView(startDate, mode) {
  showAlert("一覧画面処理中...", null, "loading");
  updateWeekButtonsVisibility(true);
  const prevWeekBtn = document.getElementById("prevWeekBtn");
  if (!prevWeekBtn) return;

  const startKey = formatDateKey(startDate);
  const endDate = addDays(startDate, 6);
  const endKey = formatDateKey(endDate);

  const s = document.getElementById("startDateDisplay");
  if (s) s.textContent = formatDateDisplay(startDate);
  const e = document.getElementById("endDateDisplay");
  if (e) e.textContent = formatDateDisplay(endDate);

  updateWeekButtons(startDate);

  const records = await fetchReservations(startKey, endKey, null);
  const loginId = getLoginInfo();
  renderReservationList(records, mode, loginId);
  closeAlert();
}

async function loadMyReservationView() {
    showAlert("一覧画面処理中...", null, "loading");
    const loginId = getLoginInfo();
    if (!loginId) return;

    updateWeekButtonsVisibility(false);
    const today = new Date();
    
    const sDisplay = document.getElementById("startDateDisplay");
    const eDisplay = document.getElementById("endDateDisplay");
    if (sDisplay) sDisplay.textContent = formatDateDisplay(today);
    if (eDisplay) eDisplay.textContent = "以降すべて";

    const startKey = formatDateKey(today);
    const endKey = "20991231"; 
    
    // 1. 自分の将来予約をフローから取得
    const records = await fetchReservations(startKey, endKey, loginId);
    
    // 🔴 修正：データが0件の場合、ポップアップではなくデータ行のスペースに文字を出す
    if (!records || records.length === 0) {
        closeAlert(); // 「取得中...」の暗転ポップアップを安全に閉じます
        
        const tbody = document.getElementById("reservationTableBody");
        if (tbody) {
            // 一旦、古い行をすべてお掃除して綺麗にします
            tbody.querySelectorAll("tr:not(.template)").forEach(row => row.remove());
            
            // 🟢 新しいデータ行（tr）を作成し、そこにメッセージを埋め込んでテーブルに表示します
            const msgRow = document.createElement("tr");
            msgRow.innerHTML = `<td colspan="6" style="text-align: center; color: #666; padding: 20px 0; font-weight: bold; background-color: #fff;">予約対象データはありません。</td>`;
            tbody.appendChild(msgRow);
        }
        return; // 処理を終了
    }
    
    // 2. データがある場合は通常通り一覧を描画
    renderReservationList(records, "MY", loginId);
    closeAlert();
}

// =========================
// ログオン関係のイベント設定
// =========================
function setupLoginHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const passwordChangeBtn = document.getElementById("passwordChangeBtn");
  const loginForm = document.getElementById("loginForm");
  const passwordChangeForm = document.getElementById("passwordChangeForm");
  const submitLoginBtn = document.getElementById("submitLogin");
  const loginIdInput = document.getElementById("loginId");
  const loginPwInput = document.getElementById("loginPw");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      loginForm.style.display = "block";
      loginForm.style.visibility = "visible";
      passwordChangeForm.style.display = "none";
      passwordChangeForm.style.visibility = "hidden";
      loginPwInput.value = "";
      loginIdInput.value = "";
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      clearLoginInfo();
      updateLoginUI();
      showAlert("ログオフしました。");
    });
  }

  if (submitLoginBtn) {
    submitLoginBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const room = loginIdInput.value.trim().toUpperCase();
      const pw = loginPwInput.value.trim();

      if (!room || !pw) {
        showAlert("社員番号とパスワードを入力してください。");
        return;
      }

      showAlert("ログオン処理中です…", null, "loading");
      try {
        const result = await callLoginFlow(room, pw);
        closeAlert();

        if (result.status === "manage") {
          sessionStorage.setItem("roomID", room);
          localStorage.setItem("managelag", "true");
          window.location.href = "admin.html"; 
          return;
        }

        if (result.status === "OK") {
          setLoginInfo(room);
          sessionStorage.setItem("roomID", room);
          updateLoginUI();
          loginForm.style.display = "none";
          loginForm.style.visibility = "hidden";
          showAlert("ログオンしました。ログオンの有効時間は１０分です。");
          return;
        }
        showAlert(result.message || "ログオンに失敗しました。");
      } catch (err) {
        closeAlert();
        showAlert("ログオン処理中にエラーが発生しました。");
      }
    });
  }
}

// =========================
// カレンダー設定
// =========================
function setupCalendar(startDateRef) {
  const datePicker = $("#datePicker");
  const calendarBtn = document.getElementById("calendarBtn");

  const today = new Date();
  const maxDate = addDays(today, 90);

  datePicker.datepicker("destroy");
  datePicker.datepicker({
    dateFormat: "yy-mm-dd",
    minDate: today,
    maxDate: maxDate,
    onSelect: function (dateText) {
      showAlert("一覧画面処理中...", null, "loading");
      const parts = dateText.split("-");
      const selected = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      startDateRef.date = selected;
      loadWeekView(startDateRef.date, "WEEK");
    },
  });

  if (calendarBtn) {
    calendarBtn.addEventListener("click", () => {
      datePicker.datepicker("show");
    });
  }
}

// =========================
// ナビゲーションボタン
// =========================
function setupNavigation(startDateRef) {
  const todayBtn = document.getElementById("todayBtn");
  const prevWeekBtn = document.getElementById("prevWeekBtn");
  const nextWeekBtn = document.getElementById("nextWeekBtn");
  const myReservationBtn = document.getElementById("myReservationBtn");

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      showAlert("一覧画面処理中...", null, "loading");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDateRef.date = today;
      loadWeekView(startDateRef.date, "WEEK");
    });
  }

  if (prevWeekBtn) {
    prevWeekBtn.addEventListener("click", () => {
      showAlert("一覧画面処理中...", null, "loading");
      if (prevWeekBtn.disabled) return;
      startDateRef.date = addDays(startDateRef.date, -7);
      loadWeekView(startDateRef.date, "WEEK");
    });
  }

  if (nextWeekBtn) {
    nextWeekBtn.addEventListener("click", () => {
      showAlert("一覧画面処理中...", null, "loading");
      if (nextWeekBtn.disabled) return;
      startDateRef.date = addDays(startDateRef.date, 7);
      loadWeekView(startDateRef.date, "WEEK");
    });
  }

  if (myReservationBtn) {
    myReservationBtn.addEventListener("click", async (event) => {
      event.preventDefault();
      const loginId = getLoginInfo();
      if (!loginId) {
        showAlert("My予約を表示するにはログオンが必要です。");
        return;
      }
      showAlert("一覧画面処理中...", null, "loading");
      try {
        await loadMyReservationView();
        closeAlert();
      } catch (err) {
        closeAlert();
        showAlert("My予約の取得中にエラーが発生しました。");
      }
    });
  }
}

// =========================
// 初期化（門番仕様）初期化
// =========================
document.addEventListener("DOMContentLoaded", async function () {
  // 🟢 ページを開いた瞬間に最速で「処理中」を表示します
  showAlert("一覧画面処理中...", null, "loading");

  const path = location.pathname.toLowerCase();

  try {
    if (path === "/" || path.includes("index") || path.includes("home")) {
      console.log("セキュリティチェックを開始します...");
      const ok = await checkHomeAccess(); 
      if (!ok) {
          console.error("認証NG：アクセスを遮断しました。");
          closeAlert(); // アクセス拒否時はアラートを閉じる
          return; 
      }
      console.log("認証成功：システムを起動します。");
    }

    updateLoginUI();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDateRef.date = today;

    setupLoginHandlers();
    setupNavigation(startDateRef);
    setupCalendar(startDateRef);

    setInterval(() => { updateLoginUI(); }, 30000);

    // 完全に非同期でデータの取得と描画が終わるのを待つ
    await loadWeekView(startDateRef.date, "WEEK");

  } catch (error) {
    console.error("初期処理中にエラーが発生しました:", error);
  } finally {
    // 🟢 すべての処理（セキュリティ＋データ描画）が終わったらポップアップを閉じる
    closeAlert();
  }
});

// ==========================================
// クリックイベント
// ==========================================
document.addEventListener("click", async function(event) {
  const reserveBtn = event.target.closest(".reserve-btn");
  const cancelBtn = event.target.closest(".cancel-btn");
  const updateTarget = event.target.closest(".clickable-update");

  if (reserveBtn || cancelBtn) {
    event.preventDefault(); 
    const scrollPos = window.pageYOffset || document.documentElement.scrollTop;

    const row = event.target.closest("tr");
    if (!row) return;
    const recordId = row.getAttribute("data-recordid");

    if (reserveBtn) await handleReserveClick(recordId, reserveBtn);
    if (cancelBtn) await handleCancelClick(recordId, cancelBtn);

    setTimeout(() => { window.scrollTo(0, scrollPos); }, 50);
    return;
  }

  if (updateTarget) {
    event.preventDefault();
    const loginId = getLoginInfo();
    const reservedBy = updateTarget.getAttribute("data-reserved-by");

    if (!loginId || loginId !== reservedBy.trim().toUpperCase()) {
        showAlert(`予約者（${reservedBy}様）だけが内容を修正できます。`);
        return;
    }

    const row = event.target.closest("tr");
    if (!row) return;
    const recordId = row.getAttribute("data-recordid");

    const details = getRowDetail(row); 
    const currentContent = updateTarget.textContent.trim();
    const alertMessage = `${details.date} ${details.area}【${details.time}】のコメント内容を修正します。１０文字まで。`;

    showAlert(alertMessage, async (newContent) => {
        if (newContent === currentContent) return; 

        showAlert("更新中...", null, "loading");
        try {
            const res = await fetch(FLOW_URL_UPDATE_CONTENT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ recordId: recordId, comment: newContent })
            });
            const result = await res.json();
            closeAlert();
            if (result.status === "success") {
                showAlert("コメント内容を修正しました。", () => {
                    loadWeekView(startDateRef.date, "WEEK");
                });
            } else {
                showAlert("修正に失敗しました。");
            }
        } catch (e) {
            closeAlert();
            showAlert("通信エラーが発生しました。");
        }
    }, "input", currentContent);
    return;
  }
}); 