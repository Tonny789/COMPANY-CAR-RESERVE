if (window.__LIST_JS_LOADED__) {
  console.warn("list.js already loaded");
} else {
  window.__LIST_JS_LOADED__ = true;
}

const LOGIC_APPS_RESERVATION_URL = "https://prod-40.japaneast.logic.azure.com:443/workflows/ab8f204d2d5241058f47f378bd828369/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=ujbLd062IzIlxfgzzf4V9ny6bLnFmGhPPcT_WcpK3rA";
// =========================
// ホームページ起動チェック（allowed:false → 起動停止）
// =========================
async function checkHomeAccess() {

  // Cookie取得ユーティリティ
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return "";
  }

  // CookieからauthIdを取得（URLデコード＋trim）
  let raw = getCookie("authId") || "";
  let authId = decodeURIComponent(raw).trim();

  // ★ 5桁英数字でなければ firstaccess として扱う
  if (!/^[A-Za-z0-9]{5}$/.test(authId)) {
    authId = "firstaccess";
  }

  const url =
//    "https://de0947316b24e2709081db95d79805.bc.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/5c7eba58eee74d1e98e73a511d988be1/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=D11i9mqE2Av3zBf2upjlQrNpAQsoWDCLxn00jSgk1Pk";

    "https://prod-44.japaneast.logic.azure.com:443/workflows/420771912e6e44a0ab887281e2dfdb7e/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=aNKcYEygrDv3lHO0pBbUg92tCxmELwvGPQuqeBy95U8";

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authId: authId })
    });

    const result = await res.json();

    // =========================
    // ★ allowed:false → ホームページ起動停止
    // =========================
    if (result.allowed === false || result.allowed === "false") {
      console.log("NG → ホームページ起動を停止します。");
      window.location.href = "https://www.google.com/";
      return false;
    }

 // =========================
    // ★ allowed:true → Cookie更新して継続（30日間保持する設定を追加）
    // =========================
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
// My予約ページ起動チェック（関数として定義）
// =========================
async function checkMyReservationAccess() {
  const roomID = sessionStorage.getItem("roomID");
  if (!roomID) {
    window.location.href = "https://www.google.com/";
    return false;
  }

//  const url = "https://de0947316b24e2709081db95d79805.bc.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/1b1679541aad4b51ac914298df63ff8c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Z_IS_Hs5ylk0SFJc815PdyV0caPwL4LkA1ZqOiF1n5U";
  const url = "https://prod-47.japaneast.logic.azure.com:443/workflows/9063c3619d9549399a65439ec79fb0e7/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=nr4wTdvrsGG_x7icmS7mOnOq2zOdVB9_UMJnZ-ves_Y";

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomNumber: roomID })
    });
    const result = await response.json();

    // 不正なら即座に飛ばす
    if (!(result.allowed === true || result.status === "OK")) {
      window.location.href = "https://www.google.com/";
      return false;
    }
    return true; // OKなら何もしない（HTML側の表示がそのまま活きる）
  } catch (e) {
    window.location.href = "https://www.google.com/";
    return false;
  }
}

// =========================
// 共通ユーティリティ
// =========================

function showAlert(message, onOk, type) {
  const modal = document.getElementById("customAlert");
  const msgElem = document.getElementById("alertMessage");
  const okBtn = document.getElementById("alertOkButton");

  msgElem.textContent = message;
  modal.style.display = "block";

  if (type === "loading") {
    okBtn.style.display = "none";
  } else {
    okBtn.style.display = "inline-block";


    // ✅ showAlert 関数内の okBtn.onclick の中身を以下に差し替え
  okBtn.onclick = function() {
        console.log("LOG: OKボタンが物理的にクリックされました。");
        modal.style.display = "none"; // アラートを閉じる

        // 渡された命令（onOk）がある場合、それを実行する
        if (onOk && typeof onOk === 'function') {
            console.log("LOG: 登録された命令を実行します。");
            onOk(); 
        } else {
            console.warn("LOG: 命令(onOk)が設定されていないか、関数ではありません。");
        }
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
  // const yyyy = date.getFullYear(); // 👈 ここを使わない
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  // return `${yyyy}年${mm}月${dd}日`; // 👈 これを以下に書き換え
  return `${mm}月${dd}日`;
}

function parseDateKey(key) {
  // "YYYYMMDD"
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
  const expiresAt = Date.now() + 1000 * 60 * 10; // 10分
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
    roomDisplay.textContent = loginId
      ? `${loginId}（ログオン済）`
      : "未ログオン状態です";
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

  // ★ My予約ページには週移動ボタンが無いので、存在しなければ何もしない
  if (!prevWeekBtn || !nextWeekBtn) {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(currentStartDate);
  start.setHours(0, 0, 0, 0);

  const prevStart = addDays(start, -7);
  const nextStart = addDays(start, 7);

  // 前週：開始日を1週間戻したときに「今日より前」になるなら無効＋ほぼ見えない
  if (prevStart < today) {
    prevWeekBtn.disabled = true;
    prevWeekBtn.classList.add("almost-hidden");
  } else {
    prevWeekBtn.disabled = false;
    prevWeekBtn.classList.remove("almost-hidden");
  }

  // 次週：開始日を1週間進めたときに「今日から3ヶ月以上先」なら無効＋ほぼ見えない
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

function generateRequestId() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const fff = String(now.getMilliseconds()).padStart(3, "0");
  return `${hh}${mm}${ss}${fff}`;
}


// =========================
// Web API 呼び出し
// =========================

// =========================
// 予約一覧取得（Logic Apps経由・統一版）
// =========================
// =========================
// Web API 呼び出し（Logic Apps経由・完全統一版）
// =========================

// 1. 予約一覧取得
// =========================
// 予約一覧取得（Dataverseの数字8桁形式に対応版）
// =========================
async function fetchReservations(startKey, endKey, roomFilter) {
  // Dataverseに合わせてハイフンなしの 20260412 形式で条件を作成
  let filter = `cr15f_yoyaku_taishobi ge '${startKey}' and cr15f_yoyaku_taishobi le '${endKey}'`;
  if (roomFilter) {
    // 旧 cr15f_room -> 新 cr15f_name
    filter += ` and cr15f_name eq '${roomFilter}'`;
  }

  const url = LOGIC_APPS_RESERVATION_URL;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json" // これを忘れると中身が無視されます
      },
      body: JSON.stringify({ 
        filter: filter,
        // 旧 cr15f_erea -> 新 cr15f_model
        orderby: "cr15f_yoyaku_taishobi asc, cr15f_model asc, cr15f_time asc"
      })
    });

    if (!res.ok) return [];
    
    const data = await res.json();
    // Logic Appsからの返却値を確認
    console.log("取得データ:", data);
    //return data.value || [];
    //return Array.isArray(data) ? data : (data.value || []);
    return data.value ? data.value : data;

  } catch (e) {
    console.error("通信エラー:", e);
    return [];
  }
}

// 2. ID指定で1件取得
async function fetchReservationById(id) {
  const url = LOGIC_APPS_RESERVATION_URL;
  // 旧 cr15f_gaveid -> 新 cr15f_company_careid
  const filter = `cr15f_company_careid eq '${id}'`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filter: filter })
  });
  if (!res.ok) throw new Error("取得失敗");
  const data = await res.json();
  return data.value && data.value.length > 0 ? data.value[0] : null;
}

// =========================
// ログオン・パスワード変更用の共通データ取得（修正完了版）
// =========================
async function fetchLoginRecord(roomNo) {
    console.log("調査LOG: [2] 検索開始:", roomNo);
    const filterText = `cr187_column1 eq '${roomNo}'`;
    
    try {
        const res = await fetch(LOGIC_APPS_RESERVATION_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filter: filterText })
        });

        if (!res.ok) throw new Error("検索通信に失敗しました");

        const data = await res.json();
        const record = data.value && data.value.length > 0 ? data.value[0] : null;
        
        console.log("調査LOG: [3] 本物のIDを取得しました:", record ? record.cr187_tablesid : "なし");
        return record;
    } catch (err) {
        console.error("調査LOG: ❌取得エラー:", err.message);
        throw err;
    }
}

// =========================
// Automate 呼び出し（HTTP トリガー想定）
// =========================
//const FLOW_URL_PASSWORD_CHANGE =
//  "https://de0947316b24e2709081db95d79805.bc.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/2953b17842d944adacefcab3cc35dc99/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=79j9YqTw53Z-X_L0h_e49F-EdlxLs_GWB78eFA800Zo";

//const FLOW_URL_PASSWORD_CHANGE =
//  "https://prod-43.japaneast.logic.azure.com:443/workflows/8cc2937e8e9040048e7fd8c6b92577d3/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=lmgkxxeyHZ3a0SA-vvsTa3RMcCzWJAN3FLilRH25ykM";

const FLOW_URL_PASSWORD_CHANGE =
  "https://prod-47.japaneast.logic.azure.com:443/workflows/83eb21c03115431589a4bdc116d77a5d/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=SFUuwsFCcWsMv50ljnmmpk3dFivz7-Gow-iVPF7hjoo";


const FLOW_URL_RESERVE =
   "https://prod-19.japaneast.logic.azure.com:443/workflows/7c0d6cab22434f3e98dbe3521ec5bd72/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=a9iffnDFEaDJ13buJbC-D_sLjVu1rk01DWzyU60jtfE";

//const FLOW_URL_RESERVE =
//   "https://prod-39.japaneast.logic.azure.com:443/workflows/fd9860598b9b4a34954915cf90c75b90/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=-z076RLAbFSSjvz-MKPcp-a4ndxLETKPG_ulfAW56jg";
  

//const FLOW_URL_CANCEL =
//  "https://de0947316b24e2709081db95d79805.bc.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6c2dd7923e3345edbff43dae8d18bf1c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=0uSHivWwopheC91bkA84QYumBfy5CfRsTYZvTrSpi30";


const FLOW_URL_CANCEL =
  "https://prod-01.japaneast.logic.azure.com:443/workflows/1f424639f04d470faab1f3e0e5ea02c6/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=sVhPuqBn_du52pdwFHzSMWzNic3LkIvjJM9Oog6QCGI";



//const FLOW_URL_MYRESERVE =
//  "https://de0947316b24e2709081db95d79805.bc.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/74c0c279f21d4cad8f404d6c626a847a/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Nz4_Y3YgCYVfsMU5ggvEgAYOvCHfW-VbQh_4-StL63c";

const FLOW_URL_MYRESERVE =
  "https://prod-06.japaneast.logic.azure.com:443/workflows/2b248f20318f402399668c8bae958e92/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=ncPrT2d8KU2OAicVOz2c-bbL21un02fPtNm89XmJ68E";


// =========================
// パスワード変更フロー呼び出し（調査ログ付き・唯一の正解）
// =========================
async function callPasswordChangeFlow(recordId, roomNumber, newPassword) {
    console.log("調査LOG: パスワード変更フロー送信直前");
    console.log("送信データ:", { recordId, roomNumber, newPassword });

    try {
        const res = await fetch(FLOW_URL_PASSWORD_CHANGE, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recordId: recordId,
                roomNumber: roomNumber,
                newPassword: newPassword
            }),
        });

        console.log("調査LOG: サーバーからの応答ステータス:", res.status);

        if (!res.ok) {
            throw new Error("パスワード変更フロー呼び出し失敗: " + res.status);
        }
        
        const result = await res.json();
        console.log("調査LOG: 変更成功結果:", result);
        return result;

    } catch (err) {
        console.error("調査LOG: 通信エラー発生:", err);
        throw err;
    }
}


async function callReserveFlow(recordId, roomNumber) {
  const res = await fetch(FLOW_URL_RESERVE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recordId: recordId,
      roomNumber: roomNumber,
    }),
  });
  if (!res.ok) {
    throw new Error("予約処理フロー呼び出し失敗: " + res.status);
  }
  return await res.json();
}

async function callCancelFlow(recordId, roomNumber) {
  const res = await fetch(FLOW_URL_CANCEL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recordId: recordId,
      roomNumber: roomNumber,
    }),
  });
  if (!res.ok) {
    throw new Error("取消処理フロー呼び出し失敗: " + res.status);
  }
  return await res.json();
}

async function callMyReservationFlow(requestId, roomNumber) {
  const res = await fetch(FLOW_URL_MYRESERVE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requestId: requestId,
      roomNumber: roomNumber
    }),
  });

  if (!res.ok) {
    throw new Error("My予約フロー呼び出し失敗: " + res.status);
  }

  return await res.json();
}

// =========================
// ログオン用 Automate フロー呼び出し
// =========================
async function callLoginFlow(roomNumber, password) {

//  const url = "https://de0947316b24e2709081db95d79805.bc.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/5dc8dbc708b44bcd8b7b81a9621950b9/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=oHMeGiLbk5pEaIep5DiRfy7hIV9Ejx2W47m2vzwQwgs";
  const url = "https://prod-22.japaneast.logic.azure.com:443/workflows/d316ee23d3ca46c88e1400d5f580ee95/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=DF-ssUFf9jKTr2r_lswETZsYoD4Sc8NjLN_m7j_2Olk";

  const body = {
    roomNumber: roomNumber,
    password: password
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return await res.json();
}


// =========================
// 一覧描画
// =========================
function renderReservationList(records, mode, loginId) {
  const tbody = document.getElementById("reservationTableBody");
  const noDataMessage = document.getElementById("noDataMessage");

  // 1. お掃除：テンプレート以外の「目に見えている古いデータ行」だけを確実に削除
  const oldRows = tbody.querySelectorAll("tr:not(.template)");
  oldRows.forEach(row => row.remove());

  // 2. テンプレートの確保（ここが最重要！）
  // まず tbody の中を探し、なければ表全体から探し直して「template」変数に格納します
  let template = tbody.querySelector(".template");
  if (!template) {
    template = document.querySelector("#reservationTable .template");
  }

  // 3. 最終チェック（真っ白画面防止のガードレール）
  if (!template) {
    console.error("FATAL ERROR: テンプレート行がHTML内に存在しません。");
    return;
  }

  // 4. データがない場合の処理
  if (!records || records.length === 0) {
    if (noDataMessage) noDataMessage.style.display = "block";
    return;
  } else {
    if (noDataMessage) noDataMessage.style.display = "none";
  }

  let lastDate = "";
  let lastArea = "";

  // 5. 届いたデータを1件ずつループで回す
  records.forEach((item) => {
    // テンプレートをコピーして新しい行を作る
    const tr = template.cloneNode(true);
    tr.classList.remove("template", "d-none"); 
    tr.style.display = ""; 

    const dateKey = item.cr15f_yoyaku_taishobi || "";
    // 旧 cr15f_erea -> 新 cr15f_model
    const currentArea = item.cr15f_model || "-";

    // --- 日付の表示判定 ---
    const dateCell = tr.querySelector(".reservation-date-cell");
    if (dateKey === lastDate) {
        dateCell.textContent = ""; 
    } else {
        // const y = dateKey.substring(0, 4); // 👈 ここを使わない
        const m = dateKey.substring(4, 6);
        const d = dateKey.substring(6, 8);
        // dateCell.textContent = `${y}年${m}月${d}日`; // 👈 これを以下に書き換え
        dateCell.textContent = `${m}月${d}日`; 
        lastDate = dateKey;
        lastArea = ""; 
    }

    // --- エリア（車種）の表示判定 ---
    // 旧 .reservation-area -> 新 .reservation-model
    const areaCell = tr.querySelector(".reservation-model");
    if (currentArea === lastArea) {
      areaCell.textContent = "";
    } else {
      areaCell.textContent = currentArea;
      lastArea = currentArea;
    }

    // --- 各項目の流し込み ---
    tr.querySelector(".reservation-time").textContent = item.cr15f_time || "-";
    tr.querySelector(".reservation-status").textContent = item.cr15f_yoyakustatus || "-";
    // 旧 .reservation-room (cr15f_room) -> 新 .reservation-name (cr15f_name)
    tr.querySelector(".reservation-name").textContent =
      item.cr15f_yoyakustatus === "予約済み" ? item.cr15f_name || "-" : "-";

    // --- ボタンの制御（最新・安定版） ---
    const reserveBtn = tr.querySelector(".reserve-btn");
    const cancelBtn = tr.querySelector(".cancel-btn");
    // 旧 cr15f_gaveid -> 新 cr15f_company_careid
    const recordId = item.cr15f_company_careid;
    const status = item.cr15f_yoyakustatus;

    // 行にIDを刻印（一番下の司令塔用）
    tr.setAttribute("data-recordid", recordId);


    if (status === "予約済み") {
          cancelBtn.style.display = "inline-block";
          reserveBtn.style.display = "none";
      } else {
          reserveBtn.style.display = "inline-block";
          cancelBtn.style.display = "none";
      }


    // 最後に表に追加
    tbody.appendChild(tr);
  });
}


// =========================
// 共通：日付とエリアを遡って取得する関数
// =========================
function getRowDetail(row) {
  let dateText = "";
  let areaText = "";
  const timeText = row.querySelector(".reservation-time").textContent;

  // 日付を探して遡る
  let dateRow = row;
  while (dateRow) {
    dateText = dateRow.querySelector(".reservation-date-cell").textContent.trim();
    if (dateText) break;
    dateRow = dateRow.previousElementSibling;
  }

  // エリア（車種）を探して遡る
  let areaRow = row;
  while (areaRow) {
    // 旧 .reservation-area -> 新 .reservation-model
    areaText = areaRow.querySelector(".reservation-model").textContent.trim();
    if (areaText) break;
    areaRow = areaRow.previousElementSibling;
  }

  return {
    date: dateText || "不明な日付",
    area: areaText || "共通",
    time: timeText
  };
}

// ==========================================
// 予約ボタンクリック処理（決定版）
// ==========================================


async function handleReserveClick(recordId, btn) {
  const loginId = getLoginInfo();
  if (!loginId) { showAlert("予約にはログオンが必要です。"); return; }

  showAlert("処理中です...", null, "loading");

  try {
    console.log("LOG: 予約フローを呼び出します ID:", recordId);
    const flowResult = await callReserveFlow(recordId, loginId);
    console.log("flowResult:", flowResult);
    closeAlert();
    if (flowResult && (flowResult.status === "success" || flowResult.status === "OK" || flowResult.result === "OK")) {
      const row = btn.closest("tr"); // btn から行を探す。これで info が正しく作られます
      const info = getRowDetail(row);
 
      const confirmMsg =
        `予約処理が正常に完了しました。\n\n【予約内容】\n${info.date}\n${info.area}\n${info.time}`;

      // ★ OK後は「My予約モードで再描画」だけを確実に呼ぶ
      // ✅ showAlert(confirmMsg, function () { ... }) の形に統一
      // ✅ 予約成功時（670行目付近）の showAlert を以下に書き換え
      showAlert(confirmMsg, function() {
          console.log("LOG: 予約成功による画面更新を実行します。");
          loadMyReservationView(); 
      });

     } else {
      showAlert(flowResult.message || "予約に失敗しました。");
    }

  } catch (err) {
    console.error("Critical Reserve Error:", err);
    closeAlert();
    showAlert("通信エラーが発生しました。");
  }
}


// ==========================================
// 取消ボタンクリック処理（決定版）
// ==========================================
async function handleCancelClick(recordId, btn) {
  const loginId = getLoginInfo();
  if (!loginId) { showAlert("取消にはログオンが必要です。"); return; }

  showAlert("処理中です...", null, "loading");

  try {
    console.log("LOG: 取消フローを呼び出します ID:", recordId);
    const flowResult = await callCancelFlow(recordId, loginId);
    closeAlert();

      if (flowResult && (flowResult.status === "success" || flowResult.status === "OK" || flowResult.status === "true")) {
      console.log("LOG: 取消フロー成功。メッセージを表示します。");

      const row = btn.closest("tr");
      const info = getRowDetail(row);

      const confirmMsg = `取消処理が正常に完了しました。\n\n【取消内容】\n${info.date}\n${info.area}\n${info.time}`;
      // ✅ showAlert(confirmMsg, function () { ... }) の形に統一
      showAlert(confirmMsg, function() {
          console.log("LOG: 取消後の画面更新を開始します。");
          loadMyReservationView(); 
      });
   } else {

      showAlert(flowResult.message || "取消に失敗しました。");
    }

  } catch (err) {
    console.error("Critical Cancel Error:", err);
    closeAlert();
    showAlert("通信エラーが発生しました。");
  }
}



// =========================
// 週表示ロード
// =========================
async function loadWeekView(startDate, mode) {
  updateWeekButtonsVisibility(true);

  // ★ My予約ページには週ボタンが無いので、存在しなければ週表示処理をスキップ
  const prevWeekBtn = document.getElementById("prevWeekBtn");
  const nextWeekBtn = document.getElementById("nextWeekBtn");
  if (!prevWeekBtn || !nextWeekBtn) {
    return;   // ← My予約ページではここで終了（トップページは通過）
  }

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
}

/// ✅ My予約一覧：今日以降のすべての予約を表示する修正版
async function loadMyReservationView() {
    console.log("LOG: loadMyReservationView 始動。今日以降の全予約を取得します。");
    
    const loginId = getLoginInfo();
    if (!loginId) {
        console.error("LOG: ログオンIDがありません。");
        return;
    }

    // 1. UIの調整（週移動ボタンを隠す）
    updateWeekButtonsVisibility(false);

    // 2. 日付表示の設定
    const today = new Date();
    // 表示上の終了日は「無期限」の意味を込めて遠い未来（例：1年後）に設定
    const farFuture = addDays(today, 365); 
    
    const sDisplay = document.getElementById("startDateDisplay");
    const eDisplay = document.getElementById("endDateDisplay");
    if (sDisplay) sDisplay.textContent = formatDateDisplay(today);
    if (eDisplay) eDisplay.textContent = "以降すべて"; // 終了日表示を分かりやすく変更

    // 3. データの取得
    // startKey（今日）は設定しますが、endKeyを非常に大きな値にすることで、将来分をすべて拾います
    const startKey = formatDateKey(today);
    const endKey = "20991231"; // ずっと先の未来を指定
    
    console.log("LOG: 自分の将来予約をすべて取得中...", loginId);
    
    // fetchReservations を呼び出し（内部で ge 'startKey' and le 'endKey' が走ります）
    const records = await fetchReservations(startKey, endKey, loginId);
    
    // 4. 描画（"MY"モードで実行）
    renderReservationList(records, "MY", loginId);
    
    console.log("LOG: My予約（将来分すべて）の描画が完了しました。");
}


// =========================
// ログオン／ログオフ／パスワード変更
// =========================
function setupLoginHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");
  const passwordChangeBtn = document.getElementById("passwordChangeBtn");
  const loginForm = document.getElementById("loginForm");
  const passwordChangeForm = document.getElementById("passwordChangeForm");
  const submitLoginBtn = document.getElementById("submitLogin");
  const submitPasswordChangeBtn = document.getElementById("submitPasswordChange");
  const loginIdInput = document.getElementById("loginId");
  const loginPwInput = document.getElementById("loginPw");
  const newPassword1 = document.getElementById("newPassword1");
  const newPassword2 = document.getElementById("newPassword2");

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      loginForm.style.display = "block";
      loginForm.style.visibility = "visible";   // ★追加

      passwordChangeForm.style.display = "none";
      passwordChangeForm.style.visibility = "hidden"; // ★追加

      loginBtn.style.display = "none";
      //loginPwElem.value = "";
      //loginIdInputElem.value = "";
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

  if (passwordChangeBtn) {
    passwordChangeBtn.addEventListener("click", () => {
      // ログオンフォームは隠す
      loginForm.style.display = "none";
      loginForm.style.visibility = "hidden";

      // パスワード変更フォームを表示
      passwordChangeForm.classList.add("show");
      passwordChangeForm.style.display = "flex";
      passwordChangeForm.style.visibility = "visible";
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

     // ▼ 管理者ログオン
    if (result.status === "manage") {
        sessionStorage.setItem("roomID", room);
        localStorage.setItem("managelag", "true");
        
        console.log("LOG: 管理ページ(admin.html)へ移動します。");
        
    // ❌ 修正前: window.location.href = "/manage/";
    // ✅ 修正後: 実際のファイル名に変更
    window.location.href = "admin.html"; 
    return;
}

      // ▼ 通常ログオン成功
      if (result.status === "OK") {
        setLoginInfo(room);
	sessionStorage.setItem("roomID", room);
        updateLoginUI();

        loginForm.style.display = "none";
        loginForm.style.visibility = "hidden";

        showAlert("ログオンしました。ログオンの有効時間は１０分です。");
        return;
      }

      // ▼ エラー
      showAlert(result.message || "ログオンに失敗しました。");

    } catch (err) {
      closeAlert();
      showAlert("ログオン処理中にエラーが発生しました。");
    }
  });
}


  if (submitPasswordChangeBtn) {
  submitPasswordChangeBtn.addEventListener("click", async (e) => {
    e.preventDefault();
    console.log("調査LOG: 新フローへの送信開始");

    const loginId = getLoginInfo(); // ログオン済みの部屋番号
    const pw1 = newPassword1.value.trim();
    const pw2 = newPassword2.value.trim();

    // 入力チェック（数字4桁かつ一致）
    if (!pw1 || pw1 !== pw2 || !/^\d{4}$/.test(pw1)) {
      showAlert("パスワードを数字4桁で一致させて入力してください。");
      return;
    }

    showAlert("パスワード変更中...", null, "loading");

    try {
      // 💡 新しいフローへ直接「部屋番号」と「新パスワード」を送信します
      const res = await fetch(FLOW_URL_PASSWORD_CHANGE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber: loginId,
          newPassword: pw1
        })
      });

      console.log("調査LOG: サーバー応答ステータス:", res.status);

      if (!res.ok) throw new Error("サーバー側でエラーが発生しました(" + res.status + ")");

      const result = await res.json();
      closeAlert();

      // AzureからのResponse（status: "OK"など）を判定
      if (result.status === "OK" || result.status === "success") {
        showAlert(result.message || "パスワードを正常に変更しました。");
        // フォームを閉じてクリア
        passwordChangeForm.style.display = "none";
        passwordChangeForm.style.visibility = "hidden";
        newPassword1.value = "";
        newPassword2.value = "";
      } else {
        showAlert("エラー: " + (result.message || "変更に失敗しました。"));
      }

    } catch (err) {
      console.error("調査LOG: ❌送信エラー:", err.message);
      closeAlert();
      showAlert("通信エラーが発生しました。新フローの履歴を確認してください。");
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
  const maxDate = addDays(today, 90); // 3ヶ月先

  datePicker.datepicker("destroy");
  datePicker.datepicker({
    dateFormat: "yy-mm-dd",
    minDate: today,
    maxDate: maxDate,
    onSelect: function (dateText) {
      const parts = dateText.split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const selected = new Date(y, m, d);
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
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startDateRef.date = today;
      loadWeekView(startDateRef.date, "WEEK");
    });
  }

  if (prevWeekBtn) {
    prevWeekBtn.addEventListener("click", () => {
      if (prevWeekBtn.disabled) return;
      startDateRef.date = addDays(startDateRef.date, -7);
      loadWeekView(startDateRef.date, "WEEK");
    });
  }

  if (nextWeekBtn) {
    nextWeekBtn.addEventListener("click", () => {
      if (nextWeekBtn.disabled) return;
      startDateRef.date = addDays(startDateRef.date, 7);
      loadWeekView(startDateRef.date, "WEEK");
    });
  }

if (myReservationBtn) {
    myReservationBtn.addEventListener("click", async (event) => {
      // 標準のページ遷移を完全にストップ
      event.preventDefault();

      const loginId = getLoginInfo();
      if (!loginId) {
        showAlert("My予約を表示するにはログオンが必要です。");
        return;
      }

      showAlert("My予約を取得中です...", null, "loading");

      try {
        // 同じページ内で自分の予約だけを表示
        await loadMyReservationView();
        closeAlert();
      } catch (err) {
        console.error(err);
        closeAlert();
        showAlert("My予約の取得中にエラーが発生しました。");
      }
    });
  }
}

// =========================
// 初期化（全ページ共通：TokenCheck 門番仕様）
// =========================
document.addEventListener("DOMContentLoaded", async function () {
  
  const path = location.pathname.toLowerCase();

  // 🔴 門番：ホームページ（index.html）起動時に TokenCheck を実行
  if (path === "/" || path.includes("index") || path.includes("home")) {
    console.log("セキュリティチェックを開始します...");
    
    // 💡 Azure Logic Apps (sig=aNKc...) を呼び出し
    const ok = await checkHomeAccess(); 
    
    if (!ok) {
        // 🚨 NGなら checkHomeAccess 内で Google へリダイレクトされます
        // 念のため、ここで JS の後続処理（データ取得など）を強制停止
        console.error("認証NG：アクセスを遮断しました。");
        return; 
    }
    console.log("認証成功：システムを起動します。");
  }

  /* --- 🔐 以下、認証を通過したユーザーのみが実行される本動作 --- */
  
  // ログオン情報の表示更新
  updateLoginUI();

  // 日付の初期設定（今日を基準にする）
  const startDateRef = { date: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  startDateRef.date = today;

  // ボタンやカレンダーのイベント設定
  setupLoginHandlers();
  setupNavigation(startDateRef);
  setupCalendar(startDateRef);

  // 定期的にログオン表示を更新（30秒ごと）
  setInterval(() => {
    updateLoginUI();
  }, 30000);

  // 認証OKなら、ここで初めて予約一覧を読み込む
  loadWeekView(startDateRef.date, "WEEK");

});

// ==========================================
// 【最終調査ログ】画面全体を見張り、クリックを確実に捕まえる
// ==========================================
// ✅ ファイルの一番最後をこのように書き換えてください
document.addEventListener("click", async function(event) {
  const reserveBtn = event.target.closest(".reserve-btn");
  const cancelBtn = event.target.closest(".cancel-btn");

  if (reserveBtn || cancelBtn) {
    console.log("LOG: ボタンの物理クリックを検知しました。");
    const row = event.target.closest("tr");
    const recordId = row.getAttribute("data-recordid");

    // 第2引数に event.target (ボタンそのもの) を渡すようにします
    if (reserveBtn) await handleReserveClick(recordId, reserveBtn);
    if (cancelBtn) await handleCancelClick(recordId, cancelBtn);
  }
});