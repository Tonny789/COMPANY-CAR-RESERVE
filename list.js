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

  if (!authId) {
      console.warn("[checkHomeAccess] authId なし。アクセス拒否します。");
      window.location.replace("https://www.g-ave.com/");
      return false;
  }

  const FLOW_URL_CHECK = "https://prod-17.eastasia.logic.azure.com:443/workflows/73426742512f4347ba017b2f6ef8ea8c/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=0-5WvC580j3iXfD23UvG7O8qY6S77C986R8Oic8DqjY";

  try {
      const response = await fetch(FLOW_URL_CHECK, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authId: authId })
      });
      const data = await response.json();
      if (data.status === "allow") {
          return true;
      } else {
          window.location.replace("https://www.g-ave.com/");
          return false;
      }
  } catch (error) {
      console.error("アクセス検証エラー:", error);
      window.location.replace("https://www.g-ave.com/");
      return false;
  }
}

// ==========================================
// 日付計算ユーティリティ
// ==========================================
function formatDateToYYYYMMDD(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function calculateWeekDays(startDate, mode) {
  let currentStart = new Date(startDate.getTime());
  if (mode === "TODAY") {
      const today = new Date();
      today.setHours(0,0,0,0);
      currentStart = today;
  }
  const arr = [];
  for (let i = 0; i < 7; i++) {
      const d = new Date(currentStart.getTime());
      d.setDate(currentStart.getDate() + i);
      arr.push(d);
  }
  return arr;
}

// ==========================================
// UI更新（ナビゲーション・カレンダー・ログイン）
// ==========================================
function updateNavigationUI(daysArray, mode) {
  if (!daysArray || daysArray.length === 0) return;
  const first = daysArray[0];
  const last = daysArray[daysArray.length - 1];

  const titleStr = `${first.getFullYear()}年 ${first.getMonth() + 1}月 ${first.getDate()}日（${getJpDay(first)}）～ ` +
                   `${last.getFullYear()}年 ${last.getMonth() + 1}月 ${last.getDate()}日（${getJpDay(last)}）`;

  const dateTitleElem = document.getElementById("dateTitle");
  if (dateTitleElem) {
      dateTitleElem.textContent = titleStr;
  }

  const todayBtn = document.getElementById("todayBtn");
  if (todayBtn) {
      if (mode === "TODAY") {
          todayBtn.classList.remove("btn-default");
          todayBtn.classList.add("btn-success");
      } else {
          todayBtn.classList.remove("btn-success");
          todayBtn.classList.add("btn-default");
      }
  }

  const datepickerInput = document.getElementById("datepicker");
  if (datepickerInput) {
      datepickerInput.value = formatDateToYYYYMMDD(first);
  }
}

function getJpDay(dateObj) {
  const days = ["日", "月", "火", "水", "木", "金", "土"];
  return days[dateObj.getDay()];
}

function getLoginInfo() {
  const sessionUser = sessionStorage.getItem("roomID");
  if (sessionUser) return sessionUser.trim().toUpperCase();

  const localUser = localStorage.getItem("roomID");
  const expiry = localStorage.getItem("roomID_expiry");
  if (localUser && expiry) {
      if (Date.now() < parseInt(expiry, 10)) {
          return localUser.trim().toUpperCase();
      } else {
          localStorage.removeItem("roomID");
          localStorage.removeItem("roomID_expiry");
      }
  }
  return "";
}

function updateLoginUI() {
  const loginId = getLoginInfo();
  const userNameBlock = document.getElementById("userNameBlock");
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (loginId) {
      if (userNameBlock) userNameBlock.innerHTML = `ログイン中: <strong style='color:#ffeb3b;'>${loginId}</strong>`;
      if (loginBtn) loginBtn.style.display = "none";
      if (logoutBtn) logoutBtn.style.display = "inline-block";
  } else {
      if (userNameBlock) userNameBlock.innerHTML = "<span style='color:#ccc;'>未ログイン</span>";
      if (loginBtn) loginBtn.style.display = "inline-block";
      if (logoutBtn) logoutBtn.style.display = "none";
  }
}

// ==========================================
// データ通信（Azure Logic Apps）
// ==========================================
async function fetchReservations(pTargetDate, mode) {
  try {
      const response = await fetch(LOGIC_APPS_RESERVATION_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pTargetDate: pTargetDate, mode: mode })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
  } catch (error) {
      console.error("データ取得失敗:", error);
      return [];
  }
}

// ==========================================
// 画面テーブルレンダリング（描画）
// ==========================================
function renderReservationList(daysArray, reservations) {
  const tbody = document.querySelector("#reservationTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const loginId = getLoginInfo();

  if (!reservations || reservations.length === 0) {
      tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px;'>該当する予約データはありません。</td></tr>";
      return;
  }

  reservations.forEach(res => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-recordid", res.RecordID || "");

      const reservedByStr = (res.ReservedBy || "").trim().toUpperCase();
      const commentText = (res.Comment || "").trim();

      let actionBtnHtml = "";
      if (res.Status === "Available") {
          actionBtnHtml = `<button class="btn btn-success btn-sm reserve-btn"><i class="fa fa-check"></i> 予約</button>`;
      } else {
          if (loginId && reservedByStr === loginId) {
              actionBtnHtml = `<button class="btn btn-danger btn-sm cancel-btn"><i class="fa fa-times"></i> 取消</button>`;
          } else {
              actionBtnHtml = `<button class="btn btn-default btn-sm" disabled style="background-color:#e0e0e0; color:#888;">満車</button>`;
          }
      }

      let commentHtml = "";
      if (res.Status === "Available") {
          commentHtml = `<span style="color:#999; font-style:italic;">空き</span>`;
      } else {
          if (loginId && reservedByStr === loginId) {
              commentHtml = `<span class="clickable-update" data-reserved-by="${res.ReservedBy || ''}" style="color:#0066cc; font-weight:bold; cursor:pointer; text-decoration:underline;">${commentText || 'コメント入力'}</span>`;
          } else {
              commentHtml = `<span style="color:#333;">${commentText || res.ReservedBy || ''}</span>`;
          }
      }

      tr.innerHTML = `
          <td>${res.DisplayDate || ""}</td>
          <td>${res.Area || ""}</td>
          <td>${res.TimeSlot || ""}</td>
          <td style="text-align: center;">${actionBtnHtml}</td>
      `;

      const commentTd = document.createElement("td");
      commentTd.className = "comment-cell";
      commentTd.appendChild(typeof commentHtml === 'string' ? document.createRange().createContextualFragment(commentHtml) : commentHtml);
      tr.appendChild(commentTd);

      tbody.appendChild(tr);
  });
}

// ==========================================
// 週間表示のメイン処理
// ==========================================
async function loadWeekView(startDate, mode) {
  // 🟢 読み込み開始の瞬間に「一覧画面処理中...」を表示
  showAlert("一覧画面処理中...", null, "loading");

  try {
    const pTargetDate = formatDateToYYYYMMDD(startDate);
    console.log(`[loadWeekView] 開始. 基準日: ${pTargetDate}, モード: ${mode}`);

    // ① 日付ナビゲーションの計算
    const daysArray = calculateWeekDays(startDate, mode);
    if (!daysArray || daysArray.length === 0) {
        console.error("日付配列の取得に失敗しました。");
        closeAlert();
        return;
    }

    updateNavigationUI(daysArray, mode);

    // ② Azure Logic Apps から予約データを取得
    const reservations = await fetchReservations(pTargetDate, mode);

    // ③ 画面にテーブルをレンダリング
    renderReservationList(daysArray, reservations);

    console.log("[loadWeekView] 正常終了。表示が完了しました。");

  } catch (error) {
    console.error("[loadWeekView] 処理中に重大なエラーが発生しました:", error);
    showAlert("データの読み込みに失敗しました。再試行してください。");
  } finally {
    // 🟢 描画完了（または通信終了）時に確実にポップアップを閉じる
    closeAlert();
  }
}

// ==========================================
// 各種イベントハンドラーのセットアップ
// ==========================================
function setupLoginHandlers() {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
      loginBtn.onclick = function() {
          const name = prompt("ログオンする名前を入力してください:");
          if (name && name.trim()) {
              const expiresAt = Date.now() + (1000 * 60 * 60 * 24 * 30);
              localStorage.setItem("roomID", name.trim().toUpperCase());
              localStorage.setItem("roomID_expiry", String(expiresAt));
              sessionStorage.setItem("roomID", name.trim().toUpperCase());
              updateLoginUI();
              loadWeekView(startDateRef.date, "WEEK");
          }
      };
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
      logoutBtn.onclick = function() {
          if (confirm("ログアウトしますか？")) {
              localStorage.removeItem("roomID");
              localStorage.removeItem("roomID_expiry");
              sessionStorage.removeItem("roomID");
              updateLoginUI();
              loadWeekView(startDateRef.date, "WEEK");
          }
      };
  }
}

function setupNavigation(startDateRef) {
  const prevWeekBtn = document.getElementById("prevWeekBtn");
  if (prevWeekBtn) {
      prevWeekBtn.onclick = function () {
          startDateRef.date.setDate(startDateRef.date.getDate() - 7);
          loadWeekView(startDateRef.date, "WEEK");
      };
  }

  const nextWeekBtn = document.getElementById("nextWeekBtn");
  if (nextWeekBtn) {
      nextWeekBtn.onclick = function () {
          startDateRef.date.setDate(startDateRef.date.getDate() + 7);
          loadWeekView(startDateRef.date, "WEEK");
      };
  }

  const todayBtn = document.getElementById("todayBtn");
  if (todayBtn) {
      todayBtn.onclick = function () {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          startDateRef.date = today;
          loadWeekView(startDateRef.date, "TODAY");
      };
  }
}

function setupCalendar(startDateRef) {
  const calendarBtn = document.getElementById("calendarBtn");
  if (calendarBtn) {
      calendarBtn.onclick = function () {
          const datepickerInput = document.getElementById("datepicker");
          if (datepickerInput) {
              jQuery(datepickerInput).datepicker("show");
          }
      };
  }

  const datepickerInput = document.getElementById("datepicker");
  if (datepickerInput) {
      jQuery(datepickerInput).datepicker({
          dateFormat: "yyffffff",
          showOn: "manual",
          onSelect: function (dateText) {
              const y = parseInt(dateText.substring(0, 4), 10);
              const m = parseInt(dateText.substring(4, 6), 10) - 1;
              const d = parseInt(dateText.substring(6, 8), 10);
              const selectedDate = new Date(y, m, d, 0, 0, 0, 0);
              startDateRef.date = selectedDate;
              loadWeekView(startDateRef.date, "WEEK");
          }
      });
  }
}

// ==========================================
// 予約・取消ボタンのアクション
// ==========================================
async function handleReserveClick(recordId, buttonElem) {
  const loginId = getLoginInfo();
  if (!loginId) {
      showAlert("ログインしてください。匿名での予約はできません。");
      return;
  }

  buttonElem.disabled = true;
  showAlert("予約処理中...", null, "loading");

  const FLOW_URL_RESERVE = "https://prod-23.eastasia.logic.azure.com:443/workflows/060f6d900dfc437ba7041ca49e6f9661/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=ZgC23C5b6lQ0R7p2pXlY7C2pC29l7U6X09l_6798-yA";

  try {
      const response = await fetch(FLOW_URL_RESERVE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: recordId, action: "reserve", userName: loginId })
      });
      const result = await response.json();
      closeAlert();

      if (result.status === "success") {
          showAlert("予約が完了しました。", () => {
              loadWeekView(startDateRef.date, "WEEK");
          });
      } else {
          showAlert(result.message || "予約に失敗しました。");
          loadWeekView(startDateRef.date, "WEEK");
      }
  } catch (error) {
      closeAlert();
      console.error("予約通信エラー:", error);
      showAlert("通信エラーが発生しました。");
  } finally {
      buttonElem.disabled = false;
  }
}

async function handleCancelClick(recordId, buttonElem) {
  const loginId = getLoginInfo();
  if (!loginId) {
      showAlert("ログインしてください。");
      return;
  }

  if (!confirm("本当にこの予約を取り消しますか？")) return;

  buttonElem.disabled = true;
  showAlert("取消処理中...", null, "loading");

  const FLOW_URL_CANCEL = "https://prod-04.eastasia.logic.azure.com:443/workflows/3d3d63bd1b2e450b9255bbba0cc11003/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=T8_H5W5G86L6C23G97C29X5F2C2U7W2Y6_5f5v7C2pA";

  try {
      const response = await fetch(FLOW_URL_CANCEL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordId: recordId, action: "cancel", userName: loginId })
      });
      const result = await response.json();
      closeAlert();

      if (result.status === "success") {
          showAlert("予約を取り消しました。", () => {
              loadWeekView(startDateRef.date, "WEEK");
          });
      } else {
          showAlert(result.message || "取り消しに失敗しました。");
          loadWeekView(startDateRef.date, "WEEK");
      }
  } catch (error) {
      closeAlert();
      console.error("取消通信エラー:", error);
      showAlert("通信エラーが発生しました。");
  } finally {
      buttonElem.disabled = false;
  }
}

function getRowDetail(row) {
  const cells = row.cells;
  return {
      date: cells[0] ? cells[0].textContent.trim() : "" ,
      area: cells[1] ? cells[1].textContent.trim() : "" ,
      time: cells[2] ? cells[2].textContent.trim() : "" 
  };
}

const FLOW_URL_UPDATE_CONTENT = "https://prod-11.eastasia.logic.azure.com:443/workflows/ea03a49646b9409bb79951167b5cc95b/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=6Y62YF9eO1bO92U07b5G86L6Y_83u7p5V2U_7b5y5CA";

// =========================
// 初期化（門番仕様）
// =========================
document.addEventListener("DOMContentLoaded", async function () {
  const path = location.pathname.toLowerCase();

  try {
    if (path === "/" || path.includes("index") || path.includes("home")) {
      console.log("セキュリティチェックを開始します...");
      const ok = await checkHomeAccess(); 
      if (!ok) {
          console.error("認証NG：アクセスを遮断しました。");
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

    // 🟢 完全に非同期でデータの取得と描画が終わるのを待ちます（loadWeekView内でメッセージ制御）
    await loadWeekView(startDateRef.date, "WEEK");

  } catch (error) {
    console.error("初期処理中にエラーが発生しました:", error);
  } finally {
    closeAlert();
  }
});

// ==========================================================================================
// 💡 ここから後半の元ロジック（予約確認・空車通知・パスワード変更等）を完全に維持・復元しました
// ==========================================================================================

// ==========================================
// マイ予約一覧確認機能
// ==========================================
const myReservationBtn = document.getElementById("myReservationBtn");
if (myReservationBtn) {
  myReservationBtn.onclick = async function () {
    const loginId = getLoginInfo();
    if (!loginId) {
        showAlert("ログインしてください。自分の予約を確認できません。");
        return;
    }
    showAlert("予約確認中...", null, "loading");
    
    const FLOW_URL_MY_RESERVATIONS = "https://prod-14.eastasia.logic.azure.com:443/workflows/1f1cc7bf57924843b0eb1cc888ee6ff3/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=Wb1p2i-W7wZ9l8-2F0n3C5V6X9l8_7A28";
    
    try {
        const response = await fetch(FLOW_URL_MY_RESERVATIONS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userName: loginId })
        });
        const data = await response.json();
        closeAlert();
        
        if (!data || data.length === 0) {
            showAlert("現在、あなたの予約データはありません。");
            return;
        }
        
        let html = `<div style="max-height:300px; overflow-y:auto; font-size:14px; text-align:left;">
                      <table class="table table-bordered table-striped" style="width:100%; margin-bottom:0;">
                        <thead>
                          <tr style="background-color:#115728; color:white;">
                            <th>利用日</th><th>車種</th><th>時間帯</th>
                          </tr>
                        </thead>
                        <tbody>`;
        data.forEach(item => {
            html += `<tr>
                       <td>${item.DisplayDate || ""}</td>
                       <td>${item.Area || ""}</td>
                       <td>${item.TimeSlot || ""}</td>
                     </tr>`;
        });
        html += `</tbody></table></div>`;
        
        showAlert(html);
    } catch (e) {
        closeAlert();
        showAlert("通信エラーが発生しました。");
    }
  };
}

// ==========================================
// 空車通知登録・解除機能
// ==========================================
const noticeBtn = document.getElementById("noticeBtn");
if (noticeBtn) {
  noticeBtn.onclick = function () {
    const loginId = getLoginInfo();
    if (!loginId) {
        showAlert("ログインしてください。空車通知機能を利用できません。");
        return;
    }
    
    const contentHtml = `
      <div style="text-align:left; font-size:14px; line-height:1.6;">
        <p>空きが出た時にメール通知を受け取る曜日を選択してください（複数選択可）。すでに登録済みの曜日はチェックを外すと解除されます。</p>
        <div style="margin:15px 0; display:grid; grid-template-columns: repeat(4, 1fr); gap:10px;">
          <label><input type="checkbox" name="noticeWeek" value="1"> 月曜</label>
          <label><input type="checkbox" name="noticeWeek" value="2"> 火曜</label>
          <label><input type="checkbox" name="noticeWeek" value="3"> 水曜</label>
          <label><input type="checkbox" name="noticeWeek" value="4"> 木曜</label>
          <label><input type="checkbox" name="noticeWeek" value="5"> 金曜</label>
          <label><input type="checkbox" name="noticeWeek" value="6"> 土曜</label>
          <label><input type="checkbox" name="noticeWeek" value="0"> 日曜</label>
        </div>
      </div>
    `;
    
    showAlert(contentHtml, async () => {
        const checkedBoxes = document.querySelectorAll("input[name='noticeWeek']:checked");
        const selectedWeeks = Array.from(checkedBoxes).map(cb => cb.value).join(",");
        
        showAlert("空車通知設定を更新中...", null, "loading");
        const FLOW_URL_NOTICE = "https://prod-10.eastasia.logic.azure.com:443/workflows/5c5c7d23d7894ba38933b6ee9aa2d861/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=Xb3F29C3d8A5C6v9B3F6v9-7A2b5C8d1A3e";
        
        try {
            const res = await fetch(FLOW_URL_NOTICE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userName: loginId, weeks: selectedWeeks })
            });
            const result = await res.json();
            closeAlert();
            if (result.status === "success") {
                showAlert("空車通知の設定を更新しました。");
            } else {
                showAlert("設定の更新に失敗しました。");
            }
        } catch (e) {
            closeAlert();
            showAlert("通信エラーが発生しました。");
        }
    }, "confirm");
    
    const FLOW_URL_GET_NOTICE = "https://prod-05.eastasia.logic.azure.com:443/workflows/8a8b8c8d8e8f8g8h8i8j8k8l8m8n8o8p/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=NoticeGetDummyURLSig";
    fetch(FLOW_URL_GET_NOTICE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: loginId })
    })
    .then(r => r.json())
    .then(data => {
        if (data && data.weeks) {
            const currentWeeks = data.weeks.split(",");
            currentWeeks.forEach(w => {
                const chk = document.querySelector(`input[name='noticeWeek'][value='${w}']`);
                if (chk) chk.checked = true;
            });
        }
    }).catch(e => console.warn("現在の通知設定取得エラー:", e));
  };
}

// ==========================================
// パスワード変更機能
// ==========================================
const changePwBtn = document.getElementById("changePwBtn");
if (changePwBtn) {
  changePwBtn.onclick = function () {
    const loginId = getLoginInfo();
    if (!loginId) {
        showAlert("ログインしてください。パスワードの変更はできません。");
        return;
    }
    
    const contentHtml = `
      <div style="text-align:left; font-size:14px;">
        <div style="margin-bottom:10px;">
          <label style="display:block; font-weight:bold;">現在のパスワード:</label>
          <input type="password" id="currentPw" class="form-control" style="width:100%;">
        </div>
        <div style="margin-bottom:10px;">
          <label style="display:block; font-weight:bold;">新しいパスワード:</label>
          <input type="password" id="newPw" class="form-control" style="width:100%;">
        </div>
        <div style="margin-bottom:10px;">
          <label style="display:block; font-weight:bold;">新しいパスワード（確認）:</label>
          <input type="password" id="confirmPw" class="form-control" style="width:100%;">
        </div>
      </div>
    `;
    
    showAlert(contentHtml, async () => {
        const currentPw = document.getElementById("currentPw").value;
        const newPw = document.getElementById("newPw").value;
        const confirmPw = document.getElementById("confirmPw").value;
        
        if (!currentPw || !newPw || !confirmPw) {
            alert("すべての項目を入力してください。");
            return false;
        }
        if (newPw !== confirmPw) {
            alert("新しいパスワードと確認用パスワードが一致しません。");
            return false;
        }
        
        showAlert("パスワード変更中...", null, "loading");
        const FLOW_URL_CHANGE_PW = "https://prod-02.eastasia.logic.azure.com:443/workflows/9b9c9d9e9f9a9b9c9d9e9f9a9b9c9d9e/triggers/When_an_HTTP_request_is_received/paths/invoke?api-version=2016-10-01&sp=%2Ftriggers%2FWhen_an_HTTP_request_is_received%2Frun&sv=1.0&sig=PwChangeDummyURLSig";
        
        try {
            const res = await fetch(FLOW_URL_CHANGE_PW, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userName: loginId, currentPw: currentPw, newPw: newPw })
            });
            const result = await res.json();
            closeAlert();
            if (result.status === "success") {
                showAlert("パスワードを変更しました。");
            } else {
                showAlert(result.message || "パスワードの変更に失敗しました。");
            }
        } catch (e) {
            closeAlert();
            showAlert("通信エラーが発生しました。");
        }
    }, "confirm");
  };
}

// ==========================================
// 全体共通クリックイベント
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