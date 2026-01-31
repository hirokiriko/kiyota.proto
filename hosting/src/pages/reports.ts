import { getMonthlySummary } from "../lib/api";
import type { MonthlySummaryResult } from "../lib/api";
import {
  getContentArea,
  formatCurrency,
  escapeHtml,
  exportTableToCSV,
} from "../lib/utils";

export async function renderReports(): Promise<void> {
  const content = getContentArea();
  const now = new Date();

  content.innerHTML = `
    <div class="page-header">
      <h2 class="page-title">月間集計表出力</h2>
    </div>
    <div id="report-message"></div>
    <div class="card">
      <div class="filter-bar no-print">
        <div class="form-group">
          <label class="form-label">年</label>
          <select id="report-year" class="form-select">
            ${Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i)
              .map(
                (y) =>
                  `<option value="${y}" ${y === now.getFullYear() ? "selected" : ""}>${y}年</option>`
              )
              .join("")}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">月</label>
          <select id="report-month" class="form-select">
            ${Array.from({ length: 12 }, (_, i) => i + 1)
              .map(
                (m) =>
                  `<option value="${m}" ${m === now.getMonth() + 1 ? "selected" : ""}>${m}月</option>`
              )
              .join("")}
          </select>
        </div>
        <button id="report-generate" class="btn btn-primary">集計する</button>
      </div>
    </div>

    <div id="report-result" style="display:none;">
      <div class="card">
        <div class="summary-header">
          <h3 id="report-title"></h3>
          <div class="btn-group no-print">
            <button id="report-csv" class="btn btn-success">CSV出力</button>
            <button id="report-print" class="btn btn-secondary" onclick="window.print()">印刷</button>
          </div>
        </div>

        <div id="report-summary-stats" style="margin-bottom:16px;"></div>

        <div class="table-wrapper">
          <table id="report-table">
            <thead>
              <tr>
                <th>顧客名</th>
                <th>ランク</th>
                <th class="text-right">注文件数</th>
                <th>製品内訳</th>
                <th class="text-right">合計金額</th>
              </tr>
            </thead>
            <tbody id="report-tbody">
            </tbody>
            <tfoot id="report-tfoot">
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  `;

  bindReportEvents();
}

function renderReport(data: MonthlySummaryResult): void {
  const resultEl = document.getElementById("report-result")!;
  const titleEl = document.getElementById("report-title")!;
  const statsEl = document.getElementById("report-summary-stats")!;
  const tbody = document.getElementById("report-tbody")!;
  const tfoot = document.getElementById("report-tfoot")!;

  titleEl.textContent = `${data.year}年${data.month}月 月間集計表`;

  statsEl.innerHTML = `
    <div style="display:flex; gap:24px;">
      <div>受注件数: <strong>${data.totalOrders}件</strong></div>
      <div>合計金額: <strong class="summary-total">${formatCurrency(data.grandTotal)}</strong></div>
    </div>
  `;

  if (data.summary.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="5" style="text-align:center; padding:24px; color:#888;">該当する注文がありません。</td></tr>';
    tfoot.innerHTML = "";
    resultEl.style.display = "block";
    return;
  }

  tbody.innerHTML = data.summary
    .map(
      (row) => `
    <tr>
      <td>${escapeHtml(row.customerName)}</td>
      <td><span class="badge">${escapeHtml(row.customerRank)}</span></td>
      <td class="text-right">${row.orderCount}件</td>
      <td>
        ${row.items
          .map(
            (item) =>
              `${escapeHtml(item.productName)} x${item.quantity} (${formatCurrency(item.subtotal)})`
          )
          .join("<br>")}
      </td>
      <td class="text-right">${formatCurrency(row.totalAmount)}</td>
    </tr>
  `
    )
    .join("");

  tfoot.innerHTML = `
    <tr style="font-weight:700;">
      <td colspan="4" class="text-right">総合計</td>
      <td class="text-right">${formatCurrency(data.grandTotal)}</td>
    </tr>
  `;

  resultEl.style.display = "block";
}

function bindReportEvents(): void {
  const generateBtn = document.getElementById("report-generate")!;
  const csvBtn = document.getElementById("report-csv")!;
  const msgEl = document.getElementById("report-message")!;

  let currentData: MonthlySummaryResult | null = null;

  generateBtn.addEventListener("click", async () => {
    const year = parseInt(
      (document.getElementById("report-year") as HTMLSelectElement).value,
      10
    );
    const month = parseInt(
      (document.getElementById("report-month") as HTMLSelectElement).value,
      10
    );

    generateBtn.textContent = "集計中...";
    (generateBtn as HTMLButtonElement).disabled = true;
    msgEl.innerHTML = "";

    try {
      currentData = await getMonthlySummary(year, month);
      renderReport(currentData);
    } catch (err: any) {
      msgEl.innerHTML = `<div class="message message-error">集計エラー: ${escapeHtml(err.message)}</div>`;
    } finally {
      generateBtn.textContent = "集計する";
      (generateBtn as HTMLButtonElement).disabled = false;
    }
  });

  csvBtn.addEventListener("click", () => {
    if (!currentData) return;

    const headers = [
      "顧客名",
      "ランク",
      "注文件数",
      "製品内訳",
      "合計金額",
    ];
    const rows = currentData.summary.map((row) => [
      row.customerName,
      row.customerRank,
      String(row.orderCount),
      row.items
        .map((i) => `${i.productName} x${i.quantity}`)
        .join(" / "),
      String(row.totalAmount),
    ]);

    const filename = `集計表_${currentData.year}年${currentData.month}月.csv`;
    exportTableToCSV(headers, rows, filename);
  });
}
