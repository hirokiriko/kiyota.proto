import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Order, Customer, OrderStatus, CustomerRank } from "./types";

// ===== 注文 API =====

export async function getOrders(filters?: {
  status?: OrderStatus;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<Order[]> {
  const constraints: ReturnType<typeof where>[] = [];

  if (filters?.status) {
    constraints.push(where("status", "==", filters.status));
  }
  if (filters?.customerId) {
    constraints.push(where("customerId", "==", filters.customerId));
  }
  if (filters?.startDate) {
    constraints.push(where("orderDate", ">=", filters.startDate));
  }
  if (filters?.endDate) {
    constraints.push(where("orderDate", "<=", filters.endDate));
  }

  const q = query(
    collection(db, "orders"),
    ...constraints,
    orderBy("orderDate", "desc"),
    limit(100)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Order);
}

export async function getOrder(id: string): Promise<Order | null> {
  const d = await getDoc(doc(db, "orders", id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as Order;
}

export async function createOrder(
  data: Omit<Order, "id" | "createdAt" | "updatedAt" | "totalAmount">
): Promise<Order> {
  const now = new Date().toISOString();
  const items = data.items.map((item) => ({
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    subtotal: item.quantity * item.unitPrice,
  }));
  const totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);

  const order = {
    customerId: data.customerId,
    customerName: data.customerName,
    items,
    totalAmount,
    status: data.status || "received",
    notes: data.notes || "",
    orderDate: data.orderDate,
    deliveryDate: data.deliveryDate || "",
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, "orders"), order);
  return { id: ref.id, ...order };
}

export async function updateOrder(
  id: string,
  data: Partial<Order>
): Promise<void> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { updatedAt: now };

  if (data.items) {
    updateData.items = data.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.quantity * item.unitPrice,
    }));
    updateData.totalAmount = (
      updateData.items as { subtotal: number }[]
    ).reduce((sum, item) => sum + item.subtotal, 0);
  }
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.customerId !== undefined) updateData.customerId = data.customerId;
  if (data.customerName !== undefined)
    updateData.customerName = data.customerName;
  if (data.orderDate !== undefined) updateData.orderDate = data.orderDate;
  if (data.deliveryDate !== undefined)
    updateData.deliveryDate = data.deliveryDate;

  await updateDoc(doc(db, "orders", id), updateData);
}

export async function deleteOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, "orders", id));
}

// ===== 顧客 API =====

export async function getCustomers(filters?: {
  rank?: CustomerRank;
  search?: string;
}): Promise<Customer[]> {
  const constraints: ReturnType<typeof where>[] = [];

  if (filters?.rank) {
    constraints.push(where("rank", "==", filters.rank));
  }

  const q = query(
    collection(db, "customers"),
    ...constraints,
    orderBy("name"),
    limit(200)
  );

  const snapshot = await getDocs(q);
  let customers = snapshot.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as Customer
  );

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    customers = customers.filter((c) => c.name.toLowerCase().includes(s));
  }

  return customers;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const d = await getDoc(doc(db, "customers", id));
  if (!d.exists()) return null;
  return { id: d.id, ...d.data() } as Customer;
}

export async function createCustomer(
  data: Omit<Customer, "id" | "createdAt" | "updatedAt">
): Promise<Customer> {
  const now = new Date().toISOString();
  const customer = {
    name: data.name,
    rank: data.rank || "D",
    phone: data.phone || "",
    email: data.email || "",
    address: data.address || "",
    notes: data.notes || "",
    createdAt: now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, "customers"), customer);
  return { id: ref.id, ...customer } as Customer;
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<void> {
  const now = new Date().toISOString();
  const updateData: Record<string, unknown> = { updatedAt: now };

  if (data.name !== undefined) updateData.name = data.name;
  if (data.rank !== undefined) updateData.rank = data.rank;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.notes !== undefined) updateData.notes = data.notes;

  await updateDoc(doc(db, "customers", id), updateData);
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, "customers", id));
}

// ===== 月間集計 =====

export interface MonthlySummaryResult {
  year: number;
  month: number;
  summary: {
    customerName: string;
    customerRank: string;
    orderCount: number;
    totalAmount: number;
    items: { productName: string; quantity: number; subtotal: number }[];
  }[];
  totalOrders: number;
  grandTotal: number;
}

export async function getMonthlySummary(
  year: number,
  month: number
): Promise<MonthlySummaryResult> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const q = query(
    collection(db, "orders"),
    where("orderDate", ">=", startDate),
    where("orderDate", "<", endDate),
    orderBy("orderDate")
  );

  const snapshot = await getDocs(q);

  const summaryMap = new Map<
    string,
    {
      customerName: string;
      customerRank: string;
      orderCount: number;
      totalAmount: number;
      items: Map<string, { quantity: number; subtotal: number }>;
    }
  >();

  // 顧客情報を取得
  const customerIds = new Set<string>();
  snapshot.docs.forEach((d) => {
    const data = d.data() as Order;
    customerIds.add(data.customerId);
  });

  const customerMap = new Map<string, Customer>();
  for (const cid of customerIds) {
    const custDoc = await getDoc(doc(db, "customers", cid));
    if (custDoc.exists()) {
      customerMap.set(cid, {
        id: custDoc.id,
        ...custDoc.data(),
      } as Customer);
    }
  }

  snapshot.docs.forEach((d) => {
    const order = d.data() as Order;
    const key = order.customerId;
    const customer = customerMap.get(key);

    if (!summaryMap.has(key)) {
      summaryMap.set(key, {
        customerName: order.customerName,
        customerRank: customer?.rank || "?",
        orderCount: 0,
        totalAmount: 0,
        items: new Map(),
      });
    }

    const entry = summaryMap.get(key)!;
    entry.orderCount++;
    entry.totalAmount += order.totalAmount;

    order.items.forEach((item) => {
      const existing = entry.items.get(item.productName);
      if (existing) {
        existing.quantity += item.quantity;
        existing.subtotal += item.subtotal;
      } else {
        entry.items.set(item.productName, {
          quantity: item.quantity,
          subtotal: item.subtotal,
        });
      }
    });
  });

  const summary = Array.from(summaryMap.values()).map((entry) => ({
    customerName: entry.customerName,
    customerRank: entry.customerRank,
    orderCount: entry.orderCount,
    totalAmount: entry.totalAmount,
    items: Array.from(entry.items.entries()).map(([name, data]) => ({
      productName: name,
      quantity: data.quantity,
      subtotal: data.subtotal,
    })),
  }));

  return {
    year,
    month,
    summary,
    totalOrders: snapshot.size,
    grandTotal: summary.reduce((sum, r) => sum + r.totalAmount, 0),
  };
}
