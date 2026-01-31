type RouteHandler = () => void;

interface Route {
  path: string;
  handler: RouteHandler;
}

const routes: Route[] = [];

export function addRoute(path: string, handler: RouteHandler): void {
  routes.push({ path, handler });
}

export function navigate(path: string): void {
  window.history.pushState({}, "", path);
  handleRoute();
}

export function handleRoute(): void {
  const path = window.location.pathname;
  const route = routes.find((r) => r.path === path);
  if (route) {
    route.handler();
  } else {
    // デフォルトは注文管理画面
    const defaultRoute = routes.find((r) => r.path === "/");
    if (defaultRoute) {
      defaultRoute.handler();
    }
  }
}

export function initRouter(): void {
  window.addEventListener("popstate", handleRoute);

  // ナビゲーションリンクのクリックを処理
  document.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a[data-nav]");
    if (anchor) {
      e.preventDefault();
      const href = anchor.getAttribute("href");
      if (href) {
        navigate(href);
      }
    }
  });
}
