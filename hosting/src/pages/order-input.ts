import { getCustomers, createOrder } from "../lib/api";
import type { Customer, OrderItem } from "../lib/types";
import { getContentArea, today, formatCurrency, escapeHtml } from "../lib/utils";

let customers: Customer[] = [];
let items: OrderItem[] = [
  { productName: "", quantity: 1, unitPrice: 0, subtotal: 0 },
];

export async function renderOrderInput(): Promise<void> {
  const content = getContentArea();
  content.innerHTML = '<p class="loading">読み込み中...</p>';

  try {
    customers = await getCustomers();
  } catch {
    customers = [];
  }

  content.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">注文入力</h2>
    </div>
    <div id="order-message"></div>
    <form id="order-form" class="card">
      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">顧客名<span class="required">*</span></label>
          <select id="customer-select" class="form-select" required>
            <option value="">-- 顧客を選択 --</option>
            ${customers
              .map(
                (c) =>
                  `<option value="${c.id}" data-name="${escapeHtml(c.name)}">${escapeHtml(c.name)} (${c.rank})</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">注文日<span class="required">*</span></label>
          <input type="date" id="order-date" class="form-input" value="${today()}" required />
        </div>
        <div class="form-group">
          <label class="form-label">納品希望日</label>
          <input type="date" id="delivery-date" class="form-input" />
        </div>
      </div>

      <h3 style="margin: 24px 0 8px; font-size: 15px; color: #555;">注文明細</h3>
      <div class="table-wrapper">
        <table class="items-table" id="items-table">
          <thead>
            <tr>
              <th class="col-product">製品名</th>
              <th class="col-qty">数量</th>
              <th class="col-price">単価</th>
              <th class="col-subtotal text-right">小計</th>
              <th class="col-action"></th>
            </tr>
          </thead>
          <tbody id="items-body">
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" class="text-right" style="font-weight:600;">合計</td>
              <td class="text-right" style="font-weight:700;" id="total-amount">${formatCurrency(0)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <button type="button" id="add-item-btn" class="btn btn-secondary" style="margin-top:8px;">+ 明細行を追加</button>

      <div class="form-group full-width" style="margin-top:16px;">
        <label class="form-label">備考</label>
        <textarea id="order-notes" class="form-textarea" placeholder="備考があれば入力"></textarea>
      </div>

      <div class="btn-group" style="margin-top: 20px;">
        <button type="submit" class="btn btn-primary">注文を登録</button>
        <button type="reset" class="btn btn-secondary">クリア</button>
      </div>
    </form>
  `;

  renderItemRows();
  bindEvents();
}

function renderItemRows(): void {
  const tbody = document.getElementById("items-body")!;
  tbody.innerHTML = items
    .map(
      (item, i) => `
    <tr data-index="${i}">
      <td><input type="text" class="form-input item-product" value="${escapeHtml(item.productName)}" placeholder="製品名" required /></td>
      <td><input type="number" class="form-input item-qty" value="${item.quantity}" min="1" required /></td>
      <td><input type="number" class="form-input item-price" value="${item.unitPrice}" min="0" required /></td>
      <td class="text-right item-subtotal">${formatCurrency(item.subtotal)}</td>
      <td class="text-center">
        ${items.length > 1 ? `<button type="button" class="btn btn-danger btn-sm remove-item" data-index="${i}">削除</button>` : ""}
      </td>
    </tr>
  `
    )
    .join("");

  updateTotal();
}

function updateTotal(): void {
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const el = document.getElementById("total-amount");
  if (el) el.textContent = formatCurrency(total);
}

function bindEvents(): void {
  const form = document.getElementById("order-form") as HTMLFormElement;
  const addBtn = document.getElementById("add-item-btn")!;
  const tbody = document.getElementById("items-body")!;

  // 明細行の入力変更
  tbody.addEventListener("input", (e) => {
    const target = e.target as HTMLInputElement;
    const row = target.closest("tr");
    if (!row) return;
    const index = parseInt(row.dataset.index!, 10);

    if (target.classList.contains("item-product")) {
      items[index].productName = target.value;
    } else if (target.classList.contains("item-qty")) {
      items[index].quantity = parseInt(target.value, 10) || 0;
      items[index].subtotal = items[index].quantity * items[index].unitPrice;
      row.querySelector(".item-subtotal")!.textContent = formatCurrency(
        items[index].subtotal
      );
      updateTotal();
    } else if (target.classList.contains("item-price")) {
      items[index].unitPrice = parseInt(target.value, 10) || 0;
      items[index].subtotal = items[index].quantity * items[index].unitPrice;
      row.querySelector(".item-subtotal")!.textContent = formatCurrency(
        items[index].subtotal
      );
      updateTotal();
    }
  });

  // 明細行削除
  tbody.addEventListener("click", (e) => {
    const btn = (e.target as HTMLElement).closest(".remove-item");
    if (!btn) return;
    const index = parseInt((btn as HTMLElement).dataset.index!, 10);
    items.splice(index, 1);
    renderItemRows();
    bindItemEvents();
  });

  // 明細行追加
  addBtn.addEventListener("click", () => {
    items.push({ productName: "", quantity: 1, unitPrice: 0, subtotal: 0 });
    renderItemRows();
    bindItemEvents();
  });

  // フォーム送信
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("order-message")!;
    msgEl.innerHTML = "";

    const customerSelect = document.getElementById(
      "customer-select"
    ) as HTMLSelectElement;
    const selectedOption =
      customerSelect.options[customerSelect.selectedIndex];
    const customerId = customerSelect.value;
    const customerName = selectedOption?.dataset.name || "";
    const orderDate = (
      document.getElementById("order-date") as HTMLInputElement
    ).value;
    const deliveryDate = (
      document.getElementById("delivery-date") as HTMLInputElement
    ).value;
    const notes = (
      document.getElementById("order-notes") as HTMLTextAreaElement
    ).value;

    if (!customerId) {
      msgEl.innerHTML =
        '<div class="message message-error">顧客を選択してください。</div>';
      return;
    }

    const validItems = items.filter((item) => item.productName.trim());
    if (validItems.length === 0) {
      msgEl.innerHTML =
        '<div class="message message-error">少なくとも1つの製品を入力してください。</div>';
      return;
    }

    const submitBtn = form.querySelector(
      'button[type="submit"]'
    ) as HTMLButtonElement;
    submitBtn.disabled = true;
    submitBtn.textContent = "登録中...";

    try {
      await createOrder({
        customerId,
        customerName,
        items: validItems,
        status: "received",
        notes,
        orderDate,
        deliveryDate,
      });

      msgEl.innerHTML =
        '<div class="message message-success">注文を登録しました。</div>';

      // フォームリセット
      items = [{ productName: "", quantity: 1, unitPrice: 0, subtotal: 0 }];
      form.reset();
      (document.getElementById("order-date") as HTMLInputElement).value =
        today();
      renderItemRows();
    } catch (err: any) {
      msgEl.innerHTML = `<div class="message message-error">エラー: ${escapeHtml(err.message)}</div>`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "注文を登録";
    }
  });
}

function bindItemEvents(): void {
  // rebind already handled by event delegation on tbody
}
