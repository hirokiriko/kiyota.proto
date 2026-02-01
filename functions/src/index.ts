import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { Order, Customer } from "./types";

admin.initializeApp();
const db = admin.firestore();

// ===== CORS ヘルパー =====
function withCors(
  handler: (
    req: functions.https.Request,
    res: functions.Response
  ) => Promise<void>
) {
  return functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      await handler(req, res);
    } catch (error: any) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });
}

// ===== 注文 API =====

/** 注文一覧取得 / 注文作成 */
export const orders = withCors(async (req, res) => {
  if (req.method === "GET") {
    const { status, customerId, startDate, endDate } = req.query;
    let query: admin.firestore.Query = db.collection("orders");

    if (status && typeof status === "string") {
      query = query.where("status", "==", status);
    }
    if (customerId && typeof customerId === "string") {
      query = query.where("customerId", "==", customerId);
    }
    if (startDate && typeof startDate === "string") {
      query = query.where("orderDate", ">=", startDate);
    }
    if (endDate && typeof endDate === "string") {
      query = query.where("orderDate", "<=", endDate);
    }

    query = query.orderBy("orderDate", "desc").limit(100);

    const snapshot = await query.get();
    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(orders);
    return;
  }

  if (req.method === "POST") {
    const data = req.body as Order;
    const now = new Date().toISOString();
    const order: Order = {
      customerId: data.customerId,
      customerName: data.customerName,
      items: data.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      })),
      totalAmount: data.items.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      ),
      status: "received",
      notes: data.notes || "",
      orderDate: data.orderDate,
      deliveryDate: data.deliveryDate || "",
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("orders").add(order);
    res.status(201).json({ id: docRef.id, ...order });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

/** 注文個別操作（取得/更新/削除） */
export const orderDetail = withCors(async (req, res) => {
  const orderId = req.query.id as string;
  if (!orderId) {
    res.status(400).json({ error: "Order ID is required" });
    return;
  }

  const docRef = db.collection("orders").doc(orderId);

  if (req.method === "GET") {
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json({ id: doc.id, ...doc.data() });
    return;
  }

  if (req.method === "PUT") {
    const data = req.body;
    const now = new Date().toISOString();

    const updateData: Partial<Order> & { updatedAt: string } = {
      updatedAt: now,
    };

    if (data.items) {
      updateData.items = data.items.map(
        (item: { productName: string; quantity: number; unitPrice: number }) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.quantity * item.unitPrice,
        })
      );
      updateData.totalAmount = updateData.items!.reduce(
        (sum, item) => sum + item.subtotal,
        0
      );
    }
    if (data.status) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.customerId) updateData.customerId = data.customerId;
    if (data.customerName) updateData.customerName = data.customerName;
    if (data.orderDate) updateData.orderDate = data.orderDate;
    if (data.deliveryDate !== undefined)
      updateData.deliveryDate = data.deliveryDate;

    await docRef.update(updateData);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
    return;
  }

  if (req.method === "DELETE") {
    await docRef.delete();
    res.json({ message: "Deleted" });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

// ===== 顧客 API =====

/** 顧客一覧取得 / 顧客作成 */
export const customers = withCors(async (req, res) => {
  if (req.method === "GET") {
    const { rank, search } = req.query;
    let query: admin.firestore.Query = db
      .collection("customers")
      .orderBy("name");

    if (rank && typeof rank === "string") {
      query = query.where("rank", "==", rank);
    }

    const snapshot = await query.limit(200).get();
    let customers = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // 名前でのクライアントサイドフィルタリング
    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      customers = customers.filter((c: any) =>
        c.name.toLowerCase().includes(searchLower)
      );
    }

    res.json(customers);
    return;
  }

  if (req.method === "POST") {
    const data = req.body as Customer;
    const now = new Date().toISOString();
    const customer: Customer = {
      name: data.name,
      rank: data.rank || "D",
      phone: data.phone || "",
      email: data.email || "",
      address: data.address || "",
      notes: data.notes || "",
      createdAt: now,
      updatedAt: now,
    };

    const docRef = await db.collection("customers").add(customer);
    res.status(201).json({ id: docRef.id, ...customer });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

/** 顧客個別操作 */
export const customerDetail = withCors(async (req, res) => {
  const customerId = req.query.id as string;
  if (!customerId) {
    res.status(400).json({ error: "Customer ID is required" });
    return;
  }

  const docRef = db.collection("customers").doc(customerId);

  if (req.method === "GET") {
    const doc = await docRef.get();
    if (!doc.exists) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    res.json({ id: doc.id, ...doc.data() });
    return;
  }

  if (req.method === "PUT") {
    const data = req.body;
    const now = new Date().toISOString();
    const updateData: Partial<Customer> & { updatedAt: string } = {
      updatedAt: now,
    };

    if (data.name) updateData.name = data.name;
    if (data.rank) updateData.rank = data.rank;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.notes !== undefined) updateData.notes = data.notes;

    await docRef.update(updateData);
    const updated = await docRef.get();
    res.json({ id: updated.id, ...updated.data() });
    return;
  }

  if (req.method === "DELETE") {
    await docRef.delete();
    res.json({ message: "Deleted" });
    return;
  }

  res.status(405).json({ error: "Method not allowed" });
});

// ===== 月間集計 API =====

/** 月間集計データ取得 */
export const monthlySummary = withCors(async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { year, month } = req.query;
  if (!year || !month) {
    res.status(400).json({ error: "year and month are required" });
    return;
  }

  const y = parseInt(year as string, 10);
  const m = parseInt(month as string, 10);
  const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate =
    m === 12
      ? `${y + 1}-01-01`
      : `${y}-${String(m + 1).padStart(2, "0")}-01`;

  const snapshot = await db
    .collection("orders")
    .where("orderDate", ">=", startDate)
    .where("orderDate", "<", endDate)
    .orderBy("orderDate")
    .get();

  // 顧客別に集計
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

  // 顧客情報を一括取得
  const customerIds = new Set<string>();
  snapshot.docs.forEach((doc) => {
    const data = doc.data() as Order;
    customerIds.add(data.customerId);
  });

  const customerMap = new Map<string, Customer>();
  if (customerIds.size > 0) {
    // Firestoreの in クエリは最大30件
    const ids = Array.from(customerIds);
    for (let i = 0; i < ids.length; i += 30) {
      const batch = ids.slice(i, i + 30);
      const custSnapshot = await db
        .collection("customers")
        .where(admin.firestore.FieldPath.documentId(), "in", batch)
        .get();
      custSnapshot.docs.forEach((doc) => {
        customerMap.set(doc.id, doc.data() as Customer);
      });
    }
  }

  snapshot.docs.forEach((doc) => {
    const order = doc.data() as Order;
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

  const result = Array.from(summaryMap.values()).map((entry) => ({
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

  res.json({
    year: y,
    month: m,
    summary: result,
    totalOrders: snapshot.size,
    grandTotal: result.reduce((sum, r) => sum + r.totalAmount, 0),
  });
});
