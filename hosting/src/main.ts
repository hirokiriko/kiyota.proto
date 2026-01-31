import { addRoute, initRouter, handleRoute } from "./lib/router";
import { renderOrderInput } from "./pages/order-input";
import { renderOrderManagement } from "./pages/order-management";
import { renderCustomerManagement } from "./pages/customer-management";
import { renderReports } from "./pages/reports";

// ルート登録
addRoute("/", renderOrderInput);
addRoute("/orders", renderOrderManagement);
addRoute("/customers", renderCustomerManagement);
addRoute("/reports", renderReports);

// ナビゲーションのアクティブ状態を更新
function updateNav(): void {
  const path = window.location.pathname;
  document.querySelectorAll(".nav-link").forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle(
      "active",
      href === path || (href === "/" && path === "/")
    );
  });
}

// nav更新をイベントに追加
window.addEventListener("popstate", updateNav);

// pushStateをインターセプトしてnav更新
const originalPushState = history.pushState.bind(history);
history.pushState = (...args: Parameters<typeof history.pushState>) => {
  originalPushState(...args);
  updateNav();
};

// 初期化
initRouter();
updateNav();
handleRoute();
