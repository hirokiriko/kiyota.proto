/** 金額をフォーマット */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
  }).format(amount);
}

/** 日付をフォーマット */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("ja-JP");
}

/** 今日の日付をYYYY-MM-DD形式で返す */
export function today(): string {
  return new Date().toISOString().split("T")[0];
}

/** コンテンツエリアを取得 */
export function getContentArea(): HTMLElement {
  return document.getElementById("content")!;
}

/** テーブルをCSVとしてエクスポート */
export function exportTableToCSV(
  headers: string[],
  rows: string[][],
  filename: string
): void {
  const bom = "\uFEFF";
  const csv =
    bom +
    [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

/** シンプルなHTMLエスケープ */
export function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
