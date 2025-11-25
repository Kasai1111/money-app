import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  updateDoc,
  getDoc,
  setDoc, // ★ 追加: setDocをインポートするじゃ！
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase 設定（自分のプロジェクトに置き換える）
const firebaseConfig = {
  apiKey: "AIzaSyDsgtW8qSKiEYy_nabY_tOaYUjiKbWVd2s",
  authDomain: "management-money-a50fb.firebaseapp.com",
  projectId: "management-money-a50fb",
  storageBucket: "management-money-a50fb.appspot.com",
  messagingSenderId: "1080747253970",
  appId: "1:1080747253970:web:26915a945be5e333c88d0b",
};

// 初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 初期月（現在の年月に設定）
const now = new Date();
let monthId = `${now.getFullYear()}-${(now.getMonth() + 1)
  .toString()
  .padStart(2, "0")}`;
let expensesRef = collection(db, "months", monthId, "expenses");
let monthDocRef = doc(db, "months", monthId);

// DOM
const expenseForm = document.getElementById("expenseForm");
const monthSelect = document.getElementById("monthSelect");
const listDiv = document.getElementById("expenseList");
const budgetDiv = document.getElementById("budgetDisplay");
const totalDiv = document.getElementById("totalDisplay");
const budgetForm = document.getElementById("budgetForm");
const monthlyBudgetInput = document.getElementById("monthlyBudgetInput");

// =========================================================
// 1. 月選択オプションを動的に生成するメソッドじゃ
// =========================================================
function createMonthOptions() {
  const startYear = new Date().getFullYear();
  const endYear = startYear + 1; // 来年末までを表示

  // 現在の年月（YYYY-MM形式）
  const currentMonthId = `${new Date().getFullYear()}-${(
    new Date().getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}`;

  monthSelect.innerHTML = ""; // 一旦全てクリアするじゃ

  for (let year = startYear; year <= endYear; year++) {
    for (let month = 1; month <= 12; month++) {
      const monthStr = month.toString().padStart(2, "0");
      const value = `${year}-${monthStr}`;

      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;

      // 現在の月をデフォルトで選択状態にするじゃ
      if (value === currentMonthId) {
        option.selected = true;
        monthId = currentMonthId; // 初期選択月を最新に更新
      }

      monthSelect.appendChild(option);
    }
  }
  // 初期化された monthId に基づいて expensesRef と monthDocRef を更新するじゃ
  expensesRef = collection(db, "months", monthId, "expenses");
  monthDocRef = doc(db, "months", monthId);
}
createMonthOptions();

// =========================================================
// 2. 共同資金（目標額）設定処理の追加じゃ
// =========================================================
budgetForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const newBudget = Number(monthlyBudgetInput.value);

  if (isNaN(newBudget) || newBudget < 0) {
    return alert("有効な目標額を入力せよ");
  }

  // ★ setDocを使うことで、ドキュメントが存在しなくても自動で作成するじゃ！
  await setDoc(
    monthDocRef, // 対象ドキュメントの参照
    {
      monthlyBudget: newBudget,
    },
    { merge: true } // 既存のフィールドを消さずに更新するじゃ！
  );

  alert(`共同資金の目標額を ${newBudget}円 に設定`);
});

// =========================================================
// 3. 出費追加処理
// =========================================================
expenseForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const category = document.getElementById("category").value;
  const amount = Number(document.getElementById("amount").value);
  const payer = document.getElementById("payer").value;
  const date = document.getElementById("date").value;

  if (!date || !amount) return alert("日付と金額を入力せよ");

  await addDoc(expensesRef, {
    category,
    amount,
    payer,
    date,
    createdAt: new Date(),
  });

  expenseForm.reset();
});

// =========================================================
// 4. 月切替処理
// =========================================================
monthSelect.addEventListener("change", (e) => {
  monthId = e.target.value;
  expensesRef = collection(db, "months", monthId, "expenses");
  monthDocRef = doc(db, "months", monthId);
  onSnapshotUpdate(); // 新しい月のデータを表示
});

// =========================================================
// 5. Firestore 取得 + リアルタイム反映 (onSnapshotUpdate)
// =========================================================
let unsubscribe;
function onSnapshotUpdate() {
  if (unsubscribe) unsubscribe(); // 以前のリスナー解除
  const q = query(expensesRef, orderBy("date", "asc"));
  unsubscribe = onSnapshot(q, async (snapshot) => {
    listDiv.innerHTML = ""; // tbodyの中身を空にする
    let totalHime = 0;
    let totalKano = 0;

    snapshot.forEach((docItem) => {
      const d = docItem.data();
      const docId = docItem.id;

      // テーブルの行（<tr>...</tr>）としてHTMLを組み立てるじゃ
      listDiv.innerHTML += `
        <tr>
          <td>${d.date}</td>
          <td>${d.category}</td>
          <td>${d.amount}円</td>
          <td>${d.payer === "hime" ? "宏亮" : "渚沙"}</td>
          <td>
            <button onclick="editExpense('${docId}')">編集</button>
            <button onclick="deleteExpense('${docId}')">削除</button>
          </td>
        </tr>
      `;
      if (d.payer === "hime") totalHime += d.amount;
      else if (d.payer === "kano") totalKano += d.amount;
    });

    // 共同資金
    const monthSnap = await getDoc(monthDocRef);
    // ★ NaN対策: Number()で囲み、存在しない場合は0として扱うじゃ
    const monthlyBudget = monthSnap.exists()
      ? Number(monthSnap.data().monthlyBudget)
      : 0;

    // 目標額入力欄に現在の値を表示するじゃ！
    monthlyBudgetInput.value = monthlyBudget;

    const remaining = monthlyBudget - (totalHime + totalKano);
    budgetDiv.textContent = `残額: ${remaining}円`;
    budgetDiv.style.color = remaining < 0 ? "red" : "black";

    // 個人合計
    const halfBudget = monthlyBudget / 2;
    totalDiv.innerHTML = `
      宏亮合計: ${totalHime}円 (超過: <span class="${
      totalHime > halfBudget ? "over" : ""
    }">${Math.max(0, totalHime - halfBudget)}円</span>)<br>
      渚沙合計: ${totalKano}円 (超過: <span class="${
      totalKano > halfBudget ? "over" : ""
    }">${Math.max(0, totalKano - halfBudget)}円</span>)
    `;
  });
}

// =========================================================
// 6. 編集・削除
// =========================================================
window.deleteExpense = async function (docId) {
  if (!confirm("削除しても良いか？")) return;
  await deleteDoc(doc(db, "months", monthId, "expenses", docId));
};

window.editExpense = async function (docId) {
  const newAmount = prompt("新しい金額を入力:", "0");
  if (newAmount === null) return;
  const numAmount = Number(newAmount);
  if (isNaN(numAmount) || numAmount < 0) return alert("有効な金額を入力せよ");
  await updateDoc(doc(db, "months", monthId, "expenses", docId), {
    amount: numAmount,
  });
};

// 初回表示
onSnapshotUpdate();
