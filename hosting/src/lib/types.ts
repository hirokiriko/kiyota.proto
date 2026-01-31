/** 注文明細 */
export interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/** 注文ステータス */
export type OrderStatus = "received" | "in_progress" | "completed" | "delivered";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "受付",
  in_progress: "制作中",
  completed: "完了",
  delivered: "納品済",
};

/** 注文 */
export interface Order {
  id?: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes: string;
  orderDate: string; // YYYY-MM-DD
  deliveryDate: string; // YYYY-MM-DD or empty
  createdAt?: string;
  updatedAt?: string;
}

/** 会員ランク */
export type CustomerRank = "A" | "B" | "C" | "D";

export const CUSTOMER_RANK_LABELS: Record<CustomerRank, string> = {
  A: "A (最優良)",
  B: "B (優良)",
  C: "C (一般)",
  D: "D (新規)",
};

/** 顧客 */
export interface Customer {
  id?: string;
  name: string;
  rank: CustomerRank;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}

/** 月間集計行 */
export interface MonthlySummaryRow {
  customerName: string;
  customerRank: string;
  orderCount: number;
  totalAmount: number;
  items: { productName: string; quantity: number; subtotal: number }[];
}
