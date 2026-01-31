import { getOrders, updateOrder, deleteOrder } from "../lib/api";
import type { Order, OrderStatus } from "../lib/types";
import { ORDER_STATUS_LABELS } from "../lib/types";
import {
  getContentArea,
  formatCurrency,
  formatDate,
  escapeHtml,
} from "../lib/utils";

let orders: Order[] = [];

export async function renderOrderManagement(): Promise<void> {
  const content = getContentArea();
  content.innerHTML = '<p class="loading">読み込み中...</p>';

  try {
    orders = await getOrders();
  } catch {
    orders = [];
  }

  content.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">注文管理</h2>
    </div>
    <div id="order-mgmt-message"></div>
    <div class="card">
      <div class="filter-bar no-print">
        <div class="form-group">
          <label class="form-label">ステータス</label>
          <select id="filter-status" class="form-select">
            <option value="">すべて</option>
            <option value="received">受付</option>
            <option value="in_progress">制作中</option>
            <option value="completed">完了</option>
            <option value="delivered">納品済</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">開始日</label>
          <input type="date" id="filter-start" class="form-input" />
        </div>
        <div class="form-group">
          <label class="form-label">終了日</label>
          <input type="date" id="filter-end" class="form-input" />
        </div>
        <button id="filter-btn" class="btn btn-primary">検索</button>
      </div>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>注文日</th>
              <th>顧客名</th>
              <th>製品</th>
              <th class="text-right">合計金額</th>
              <th>ステータス</th>
              <th>納品日</th>
              <th class="no-print">操作</th>
            </tr>
          </thead>
          <tbody id="orders-tbody">
          </tbody>
        </table>
      </div>
      <p id="orders-empty" style="display:none; text-align:center; padding:24px; color:#888;">
        注文データがありません。
      </p>
    </div>
  `;

  renderOrderRows();
  bindOrderEvents();
}

function renderOrderRows(): void {
  const tbody = document.getElementById("orders-tbody")!;
  const emptyEl = document.getElementById("orders-empty")!;

  if (orders.length === 0) {
    tbody.innerHTML = "";
    emptyEl.style.display = "block";
    return;
  }

  emptyEl.style.display = "none";
  tbody.innerHTML = orders
    .map(
      (order) => `
    <tr data-id="${order.id}">
      <td>${formatDate(order.orderDate)}</td>
      <td>${escapeHtml(order.customerName)}</td>
      <td>${order.items.map((i) => escapeHtml(i.productName)).join(", ")}</td>
      <td class="text-right">${formatCurrency(order.totalAmount)}</td>
      <td>
        <span class="badge badge-${order.status}">
          ${ORDER_STATUS_LABELS[order.status]}
        </span>
      </td>
      <td>${formatDate(order.deliveryDate)}</td>
      <td class="no-print">
        <div class="btn-group">
          <select class="form-select btn-sm status-change" data-id="${order.id}">
            ${(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[])
              .map(
                (s) =>
                  `<option value="${s}" ${s === order.status ? "selected" : ""}>${ORDER_STATUS_LABELS[s]}</option>`
              )
              .join("")}
          </select>
          <button class="btn btn-danger btn-sm delete-order" data-id="${order.id}">削除</button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");
}

function bindOrderEvents(): void {
  const filterBtn = document.getElementById("filter-btn")!;
  const tbody = document.getElementById("orders-tbody")!;
  const msgEl = document.getElementById("order-mgmt-message")!;

  // フィルター検索
  filterBtn.addEventListener("click", async () => {
    const status = (
      document.getElementById("filter-status") as HTMLSelectElement
    ).value as OrderStatus | "";
    const startDate = (
      document.getElementById("filter-start") as HTMLInputElement
    ).value;
    const endDate = (
      document.getElementById("filter-end") as HTMLInputElement
    ).value;

    try {
      orders = await getOrders({
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      renderOrderRows();
    } catch (err: any) {
      msgEl.innerHTML = `<div class="message message-error">検索エラー: ${escapeHtml(err.message)}</div>`;
    }
  });

  // ステータス変更
  tbody.addEventListener("change", async (e) => {
    const target = e.target as HTMLSelectElement;
    if (!target.classList.contains("status-change")) return;

    const orderId = target.dataset.id!;
    const newStatus = target.value as OrderStatus;

    try {
      await updateOrder(orderId, { status: newStatus });
      const order = orders.find((o) => o.id === orderId);
      if (order) {
        order.status = newStatus;
        renderOrderRows();
      }
      msgEl.innerHTML =
        '<div class="message message-success">ステータスを更新しました。</div>';
      setTimeout(() => {
        msgEl.innerHTML = "";
      }, 2000);
    } catch (err: any) {
      msgEl.innerHTML = `<div class="message message-error">更新エラー: ${escapeHtml(err.message)}</div>`;
    }
  });

  // 注文削除
  tbody.addEventListener("click", async (e) => {
    const btn = (e.target as HTMLElement).closest(".delete-order");
    if (!btn) return;

    const orderId = (btn as HTMLElement).dataset.id!;
    if (!confirm("この注文を削除してもよろしいですか？")) return;

    try {
      await deleteOrder(orderId);
      orders = orders.filter((o) => o.id !== orderId);
      renderOrderRows();
      msgEl.innerHTML =
        '<div class="message message-success">注文を削除しました。</div>';
      setTimeout(() => {
        msgEl.innerHTML = "";
      }, 2000);
    } catch (err: any) {
      msgEl.innerHTML = `<div class="message message-error">削除エラー: ${escapeHtml(err.message)}</div>`;
    }
  });
}
