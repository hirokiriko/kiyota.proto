export interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type OrderStatus = "received" | "in_progress" | "completed" | "delivered";

export interface Order {
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes: string;
  orderDate: string;
  deliveryDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CustomerRank = "A" | "B" | "C" | "D";

export interface Customer {
  name: string;
  rank: CustomerRank;
  phone: string;
  email: string;
  address: string;
  notes: string;
  createdAt?: string;
  updatedAt?: string;
}
