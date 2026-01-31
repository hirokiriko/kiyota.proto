import {
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from "../lib/api";
import type { Customer, CustomerRank } from "../lib/types";
import { CUSTOMER_RANK_LABELS } from "../lib/types";
import { getContentArea, escapeHtml } from "../lib/utils";

let customers: Customer[] = [];
let editingId: string | null = null;

export async function renderCustomerManagement(): Promise<void> {
  const content = getContentArea();
  content.innerHTML = '<p class="loading">読み込み中...</p>';

  try {
    customers = await getCustomers();
  } catch {
    customers = [];
  }

  content.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">顧客情報管理</h2>
      <button id="show-add-form" class="btn btn-primary">新規顧客登録</button>
    </div>
    <div id="customer-message"></div>

    <!-- 登録/編集フォーム -->
    <div id="customer-form-card" class="card" style="display:none;">
      <h3 id="form-title" style="margin-bottom:16px; font-size:16px;">新規顧客登録</h3>
      <form id="customer-form">
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">氏名<span class="required">*</span></label>
            <input type="text" id="cust-name" class="form-input" required />
          </div>
          <div class="form-group">
            <label class="form-label">ランク</label>
            <select id="cust-rank" class="form-select">
              ${(Object.keys(CUSTOMER_RANK_LABELS) as CustomerRank[])
                .map(
                  (r) =>
                    `<option value="${r}">${CUSTOMER_RANK_LABELS[r]}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">電話番号</label>
            <input type="tel" id="cust-phone" class="form-input" />
          </div>
          <div class="form-group">
            <label class="form-label">メールアドレス</label>
            <input type="email" id="cust-email" class="form-input" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">住所</label>
            <input type="text" id="cust-address" class="form-input" />
          </div>
          <div class="form-group full-width">
            <label class="form-label">備考</label>
            <textarea id="cust-notes" class="form-textarea"></textarea>
          </div>
        </div>
        <div class="btn-group" style="margin-top:16px;">
          <button type="submit" class="btn btn-primary" id="cust-submit-btn">登録</button>
          <button type="button" class="btn btn-secondary" id="cancel-form">キャンセル</button>
        </div>
      </form>
    </div>

    <!-- フィルター -->
    <div class="card">
      <div class="filter-bar">
        <div class="form-group">
          <label class="form-label">検索</label>
          <input type="text" id="cust-search" class="form-input" placeholder="氏名で検索" />
        </div>
        <div class="form-group">
          <label class="form-label">ランク</label>
          <select id="cust-filter-rank" class="form-select">
            <option value="">すべて</option>
            ${(Object.keys(CUSTOMER_RANK_LABELS) as CustomerRank[])
              .map(
                (r) =>
                  `<option value="${r}">${CUSTOMER_RANK_LABELS[r]}</option>`
              )
              .join("")}
          </select>
        </div>
        <button id="cust-filter-btn" class="btn btn-primary">検索</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>氏名</th>
              <th>ランク</th>
              <th>電話番号</th>
              <th>メール</th>
              <th>住所</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="customers-tbody">
          </tbody>
        </table>
      </div>
      <p id="customers-empty" style="display:none; text-align:center; padding:24px; color:#888;">
        顧客データがありません。
      </p>
    </div>
  `;

  renderCustomerRows();
  bindCustomerEvents();
}

function renderCustomerRows(): void {
  const tbody = document.getElementById("customers-tbody")!;
  const emptyEl = document.getElementById("customers-empty")!;

  if (customers.length === 0) {
    tbody.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  tbody.innerHTML = customers
    .map(
      (c) => `
    <tr data-id="${c.id}">
      <td>${escapeHtml(c.name)}</td>
      <td><span class="badge">${c.rank}</span></td>
      <td>${escapeHtml(c.phone)}</td>
      <td>${escapeHtml(c.email)}</td>
      <td>${escapeHtml(c.address)}</td>
      <td>
        <div class="btn-group">
          <button class="btn btn-secondary btn-sm edit-customer" data-id="${c.id}">編集</button>
          <button class="btn btn-danger btn-sm delete-customer" data-id="${c.id}">削除</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

function showForm(customer?: Customer): void {
  const card = document.getElementById("customer-form-card")!;
  const title = document.getElementById("form-title")!;
  const submitBtn = document.getElementById(
    "cust-submit-btn"
  ) as HTMLButtonElement;

  if (customer) {
    editingId = customer.id!;
    title.textContent = "顧客情報編集";
    submitBtn.textContent = "更新";
    (document.getElementById("cust-name") as HTMLInputElement).value =
      customer.name;
    (document.getElementById("cust-rank") as HTMLSelectElement).value =
      customer.rank;
    (document.getElementById("cust-phone") as HTMLInputElement).value =
      customer.phone;
    (document.getElementById("cust-email") as HTMLInputElement).value =
      customer.email;
    (document.getElementById("cust-address") as HTMLInputElement).value =
      customer.address;
    (document.getElementById("cust-notes") as HTMLTextAreaElement).value =
      customer.notes;
  } else {
    editingId = null;
    title.textContent = "新規顧客登録";
    submitBtn.textContent = "登録";
    (document.getElementById("customer-form") as HTMLFormElement).reset();
  }

  card.style.display = "block";
  (document.getElementById("cust-name") as HTMLInputElement).focus();
}

function hideForm(): void {
  document.getElementById("customer-form-card")!.style.display = "none";
  editingId = null;
}

function bindCustomerEvents(): void {
  const msgEl = document.getElementById("customer-message")!;
  const showAddBtn = document.getElementById("show-add-form")!;
  const cancelBtn = document.getElementById("cancel-form")!;
  const form = document.getElementById("customer-form") as HTMLFormElement;
  const filterBtn = document.getElementById("cust-filter-btn")!;
  const tbody = document.getElementById("customers-tbody")!;

  showAddBtn.addEventListener("click", () => showForm());
  cancelBtn.addEventListener("click", hideForm);

  // フィルター
  filterBtn.addEventListener("click", async () => {
    const search = (
      document.getElementById("cust-search") as HTMLInputElement
    ).value;
    const rank = (
      document.getElementById("cust-filter-rank") as HTMLSelectElement
    ).value as CustomerRank | "";

    try {
      customers = await getCustomers({
        search: search || undefined,
        rank: rank || undefined,
      });
      renderCustomerRows();
    } catch (err: any) {
      msgEl.innerHTML = `<div class="message message-error">検索エラー: ${escapeHtml(err.message)}</div>`;
    }
  });

  // フォーム送信（登録/更新）
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      name: (document.getElementById("cust-name") as HTMLInputElement).value,
      rank: (document.getElementById("cust-rank") as HTMLSelectElement)
        .value as CustomerRank,
      phone: (document.getElementById("cust-phone") as HTMLInputElement).value,
      email: (document.getElementById("cust-email") as HTMLInputElement).value,
      address: (document.getElementById("cust-address") as HTMLInputElement)
        .value,
      notes: (document.getElementById("cust-notes") as HTMLTextAreaElement)
        .value,
    };

    try {
      if (editingId) {
        await updateCustomer(editingId, data);
        msgEl.innerHTML =
          '<div class="message message-success">顧客情報を更新しました。</div>';
      } else {
        await createCustomer(data);
        msgEl.innerHTML =
          '<div class="message message-success">顧客を登録しました。</div>';
      }

      hideForm();
      customers = await getCustomers();
      renderCustomerRows();
      setTimeout(() => {
        msgEl.innerHTML = "";
      }, 2000);
    } catch (err: any) {
      msgEl.innerHTML = `<div class="message message-error">エラー: ${escapeHtml(err.message)}</div>`;
    }
  });

  // 編集ボタン
  tbody.addEventListener("click", (e) => {
    const editBtn = (e.target as HTMLElement).closest(".edit-customer");
    if (editBtn) {
      const id = (editBtn as HTMLElement).dataset.id!;
      const customer = customers.find((c) => c.id === id);
      if (customer) showForm(customer);
      return;
    }

    // 削除ボタン
    const deleteBtn = (e.target as HTMLElement).closest(".delete-customer");
    if (deleteBtn) {
      const id = (deleteBtn as HTMLElement).dataset.id!;
      const customer = customers.find((c) => c.id === id);
      if (
        customer &&
        confirm(`「${customer.name}」を削除してもよろしいですか？`)
      ) {
        deleteCustomer(id)
          .then(async () => {
            customers = customers.filter((c) => c.id !== id);
            renderCustomerRows();
            msgEl.innerHTML =
              '<div class="message message-success">顧客を削除しました。</div>';
            setTimeout(() => {
              msgEl.innerHTML = "";
            }, 2000);
          })
          .catch((err: any) => {
            msgEl.innerHTML = `<div class="message message-error">削除エラー: ${escapeHtml(err.message)}</div>`;
          });
      }
    }
  });
}
