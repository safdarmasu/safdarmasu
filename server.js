import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import prisma from './src/db.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// =========================================================================
// 1. CUSTOMERS ENDPOINTS
// =========================================================================

// Search old customer by phone
app.get('/api/customers/search', async (req, res) => {
  const { phone } = req.query;
  if (!phone) return res.status(400).json({ error: "Phone query parameter is required" });
  try {
    const customer = await prisma.customer.findUnique({
      where: { phone: phone },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
          include: {
            items: {
              include: { inventoryItem: true }
            },
            payments: true
          }
        }
      }
    });
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch all customers with calculated summary
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          include: {
            payments: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Process customer financials
    const formattedCustomers = customers.map(c => {
      let totalAmountSpent = 0;
      let totalPaid = 0;
      let totalBalanceDue = 0;
      c.orders.forEach(o => {
        totalAmountSpent += o.totalAmount;
        totalPaid += o.advancePaid;
        totalBalanceDue += o.balanceDue;
      });

      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        createdAt: c.createdAt,
        totalOrders: c.orders.length,
        totalAmountSpent,
        totalPaid,
        totalBalanceDue,
        lastOrder: c.orders.length > 0 ? c.orders[0] : null
      };
    });

    res.json(formattedCustomers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// =========================================================================
// 2. INVENTORY ENDPOINTS
// =========================================================================

// Fetch all inventory items
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch low stock items
app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    const items = await prisma.inventoryItem.findMany();
    // Low stock if stock <= alertLimit
    const lowStockItems = items.filter(item => item.stock <= item.alertLimit);
    res.json(lowStockItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add new inventory item manually
app.post('/api/inventory/add', async (req, res) => {
  const { name, type, skuCode, stock, alertLimit, price, brand, color, modelNumber } = req.body;
  if (!name || !type || !skuCode || stock === undefined || !alertLimit || price === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const newItem = await prisma.inventoryItem.create({
      data: {
        name,
        type,
        skuCode,
        stock: parseInt(stock),
        alertLimit: parseInt(alertLimit),
        price: parseFloat(price),
        brand: type === 'FRAME' ? brand : null,
        color: type === 'FRAME' ? color : null,
        modelNumber: type === 'FRAME' ? modelNumber : null,
      }
    });
    res.status(201).json(newItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// =========================================================================
// 3. ORDERS & BILLING ENDPOINTS (Two-Table System: JobOrder & PaymentLog)
// =========================================================================

// Fetch all orders
app.get('/api/orders', async (req, res) => {
  try {
    const orders = await prisma.jobOrder.findMany({
      include: {
        customer: true,
        payments: {
          orderBy: { paymentDate: 'desc' }
        },
        items: {
          include: {
            inventoryItem: true
          }
        }
      },
      orderBy: { orderDate: 'desc' }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create Order (with payment logging and stock subtraction + lens auto-adding)
app.post('/api/orders/create', async (req, res) => {
  const {
    customerPhone,
    customerName,
    prescriptionData,
    totalAmount,
    advancePaid,
    paymentMethod,
    items // Array of { inventoryItemId: String, isNew: Boolean, name: String, type: String, price: Float, quantity: Int }
  } = req.body;

  const numericTotal = parseFloat(totalAmount) || 0;
  const numericAdvance = parseFloat(advancePaid) || 0;
  const balanceDue = parseFloat((numericTotal - numericAdvance).toFixed(2));

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or Find Customer
      let customer = await tx.customer.findUnique({ where: { phone: customerPhone } });
      if (!customer) {
        customer = await tx.customer.create({ data: { name: customerName, phone: customerPhone } });
      } else {
        // Update customer name if it changed
        await tx.customer.update({
          where: { id: customer.id },
          data: { name: customerName }
        });
      }

      const processedItems = [];

      // 2. Inventory & Stock deduction logic
      for (const item of items) {
        let dbItem = null;

        if (item.inventoryItemId) {
          dbItem = await tx.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
        }

        // If it's a new or missing item, OR it's a LENS and not in stock, auto-add it (Inventory Disconnection)
        if (!dbItem && item.isNew) {
          // Auto-generate a unique SKU code
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          const skuCode = item.type === 'FRAME' ? `FRM-AUTO-${randomSuffix}` : `LNS-AUTO-${randomSuffix}`;

          dbItem = await tx.inventoryItem.create({
            data: {
              name: item.name,
              type: item.type,
              skuCode: skuCode,
              stock: item.quantity, // auto-add stock to fulfill the order
              alertLimit: 2,
              price: parseFloat(item.price) || 0,
              brand: item.brand || null,
              color: item.color || null,
              modelNumber: item.modelNumber || null,
            }
          });
        }

        if (!dbItem) {
          throw new Error(`Inventory item lookup failed.`);
        }

        // Handle out-of-stock items
        if (dbItem.stock < item.quantity) {
          if (dbItem.type === 'LENS') {
            // Inventory Disconnection for Lenses: Auto-add stock to fulfill the sale
            await tx.inventoryItem.update({
              where: { id: dbItem.id },
              data: { stock: item.quantity } // Adjust stock to match the order quantity so it can be sold
            });
          } else {
            // Frames still require stock check, but let's allow sales by auto-adding if user confirms,
            // or throwing error. Let's make frames strictly check stock, unless they check a bypass flag.
            throw new Error(`Frame "${dbItem.name}" is out of stock! Only ${dbItem.stock} left.`);
          }
        }

        // Deduct stock
        await tx.inventoryItem.update({
          where: { id: dbItem.id },
          data: { stock: { decrement: item.quantity } }
        });

        processedItems.push({
          inventoryItemId: dbItem.id,
          quantity: item.quantity
        });
      }

      // 3. Create the Job Order
      const newOrder = await tx.jobOrder.create({
        data: {
          customerId: customer.id,
          prescriptionData: JSON.stringify(prescriptionData),
          totalAmount: numericTotal,
          advancePaid: numericAdvance,
          balanceDue: balanceDue,
          status: "Placed",
          items: {
            create: processedItems.map(i => ({
              inventoryItemId: i.inventoryItemId,
              quantity: i.quantity
            }))
          }
        }
      });

      // 4. Create the initial Payment Log (Table B) if payment was made
      if (numericAdvance > 0) {
        await tx.paymentLog.create({
          data: {
            orderId: newOrder.id,
            amountPaid: numericAdvance,
            paymentMethod: paymentMethod || "UPI",
            notes: "Advance payment recorded at checkout"
          }
        });
      }

      return newOrder;
    });

    res.status(201).json({ message: "Order placed successfully!", order: result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Record a new payment (Table B)
app.post('/api/orders/:id/payments', async (req, res) => {
  const { id } = req.params;
  const { amountPaid, paymentMethod, notes } = req.body;

  const numericAmount = parseFloat(amountPaid);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: "Invalid payment amount" });
  }

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.jobOrder.findUnique({ where: { id: id } });
      if (!order) throw new Error("Order not found");

      if (numericAmount > order.balanceDue) {
        throw new Error(`Payment exceeds the remaining balance due of ₹${order.balanceDue}`);
      }

      // Log payment in Table B
      await tx.paymentLog.create({
        data: {
          orderId: id,
          amountPaid: numericAmount,
          paymentMethod: paymentMethod || "UPI",
          notes: notes || "Partial installment payment"
        }
      });

      const newAdvance = parseFloat((order.advancePaid + numericAmount).toFixed(2));
      const newBalance = parseFloat((order.totalAmount - newAdvance).toFixed(2));

      // Update Order
      const updated = await tx.jobOrder.update({
        where: { id: id },
        data: {
          advancePaid: newAdvance,
          balanceDue: newBalance,
          // If fully paid, optionally set status to Completed
          status: newBalance === 0 ? "Completed" : order.status
        }
      });

      return updated;
    });

    res.json({ message: "Payment logged successfully!", order: updatedOrder });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Update Order status (Lifecycle Hook)
app.patch('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["Placed", "In_Lab", "Ready_For_Pickup", "Completed"].includes(status)) {
    return res.status(400).json({ error: "Invalid status state" });
  }

  try {
    const updatedOrder = await prisma.jobOrder.update({
      where: { id: id },
      data: { status: status },
      include: { customer: true }
    });

    res.json({ message: "Order status updated successfully!", order: updatedOrder });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`OPTISOFT Backend Server running locally on port ${PORT}`));
