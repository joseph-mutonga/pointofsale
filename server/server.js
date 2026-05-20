import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import path from 'path';
import { stkPush, registerC2BUrls } from './mpesa.js';

dotenv.config();

const app = express();
const dbPath = path.resolve(process.cwd(), 'pos.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 5001;

// Helper: run a SELECT and return all rows
const dbAll = (sql, params = []) => db.prepare(sql).all(...params);
// Helper: run INSERT/UPDATE/DELETE
const dbRun = (sql, params = []) => db.prepare(sql).run(...params);
// Helper: run a SELECT and return first row
const dbGet = (sql, params = []) => db.prepare(sql).get(...params);

// --- AUTH ---
app.post('/api/login', (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const user = dbGet('SELECT * FROM users WHERE username = ? AND password = ?', [username, hash]);
    if (user) {
      if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account disabled' });
      return res.json({ success: true, user: { id: user.id, username: user.username, role: user.role, full_name: user.full_name } });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- MPESA ---
app.post('/api/mpesa/stkpush', async (req, res) => {
  try {
    const { amount, phone, reference, description } = req.body;
    const result = await stkPush(amount, phone, reference, description);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// STK Push Callback
app.post('/api/mpesa/callback', (req, res) => {
  try {
    const { Body } = req.body;
    console.log('M-Pesa Callback Received:', JSON.stringify(req.body, null, 2));

    const stkCallback = Body.stkCallback;
    const checkoutRequestID = stkCallback.CheckoutRequestID;
    const merchantRequestID = stkCallback.MerchantRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    let amount = null;
    let mpesaCode = null;
    let phone = null;
    let transDate = null;

    if (resultCode === 0) {
      const metadata = stkCallback.CallbackMetadata.Item;
      amount = metadata.find(i => i.Name === 'Amount')?.Value;
      mpesaCode = metadata.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
      phone = metadata.find(i => i.Name === 'PhoneNumber')?.Value;
      transDate = metadata.find(i => i.Name === 'TransactionDate')?.Value;
      console.log(`Payment Successful: ${mpesaCode}, Amount: ${amount}, Phone: ${phone}`);
    } else {
      console.log('M-Pesa Payment Failed:', resultDesc);
    }

    db.prepare(`
      INSERT INTO mpesa_transactions (checkout_request_id, merchant_request_id, result_code, result_desc, amount, mpesa_receipt, transaction_date, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(checkout_request_id) DO UPDATE SET
        result_code = excluded.result_code,
        result_desc = excluded.result_desc,
        amount = excluded.amount,
        mpesa_receipt = excluded.mpesa_receipt,
        phone = excluded.phone
    `).run(checkoutRequestID, merchantRequestID, resultCode, resultDesc, amount, mpesaCode, String(transDate || ''), String(phone || ''));

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (err) {
    console.error('Callback Error:', err.message);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

// C2B Validation
app.post('/api/mpesa/c2b-validation', (req, res) => {
  console.log('C2B Validation Request:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// C2B Confirmation (Offline Payment)
app.post('/api/mpesa/c2b-confirmation', (req, res) => {
  try {
    console.log('C2B Confirmation Received:', req.body);
    const { TransID, TransAmount, FirstName, MiddleName, LastName } = req.body;
    const ref = 'C2B-' + TransID;
    db.prepare(
      'INSERT INTO sales (ref_number, total_amount, cashier_name, payment_mode, mpesa_code, sale_type) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(ref, TransAmount, 'M-Pesa System', 'M-Pesa Offline', TransID, 'mpesa_c2b');
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (err) {
    console.error('C2B Confirmation Error:', err.message);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

app.get('/api/mpesa/register-urls', async (req, res) => {
  try {
    const result = await registerC2BUrls();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- ITEMS ---
app.get('/api/items', (req, res) => {
  try {
    const rows = dbAll('SELECT * FROM items');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/items/low-stock', (req, res) => {
  try {
    const rows = dbAll("SELECT *, 'item' as type FROM items WHERE stock <= min_stock OR stock IS NULL");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/items/upsert', (req, res) => {
  try {
    const item = req.body;
    if (item.id) {
      db.prepare(
        'UPDATE items SET code = ?, item_code = ?, item_name = ?, price = ?, stock = ?, min_stock = ?, category = ? WHERE id = ?'
      ).run(item.code, item.item_code || item.code, item.item_name || item.name, item.price || 0, item.stock || 0, item.min_stock || 5, item.category || null, item.id);
    } else {
      db.prepare(
        'INSERT INTO items (code, item_code, item_name, price, stock, min_stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(item.code, item.item_code || item.code, item.item_name || item.name, item.price || 0, item.stock || 0, item.min_stock || 5, item.category || null);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/items/:id', (req, res) => {
  try {
    const { id } = req.params;
    const row = dbGet('SELECT code FROM items WHERE id = ?', [id]);
    if (row && (row.code === 'SYSTEM_SERVICE' || row.code === 'SYSTEM_TAILORING')) {
      return res.status(400).json({ success: false, message: 'Restricted: System item' });
    }
    db.prepare('DELETE FROM items WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- SALES ---
app.post('/api/sales/process', (req, res) => {
  try {
    const { items, total, cashier, cashierId, paymentMode, mpesaCode } = req.body;
    const ref = 'REF-' + Date.now();

    const trans = db.transaction(() => {
      const saleRes = db.prepare(
        'INSERT INTO sales (ref_number, total_amount, cashier_name, payment_mode, mpesa_code, cashier_id, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(ref, total, cashier, paymentMode, mpesaCode || null, cashierId, 'pos');
      const saleId = saleRes.lastInsertRowid;

      for (const it of items) {
        db.prepare(
          'INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total, material, color_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(saleId, it.id, it.name, it.code || 'N/A', it.qty, it.price, it.qty * it.price, it.material || null, it.colorCode || null);
        if (!String(it.code).startsWith('SYSTEM_')) {
          db.prepare('UPDATE items SET stock = stock - ? WHERE id = ?').run(it.qty, it.id);
        }
      }
      return ref;
    });

    const resultRef = trans();
    res.json({ success: true, ref: resultRef });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/sales', (req, res) => {
  try {
    const rows = dbAll(`
      SELECT s.*,
      EXISTS(SELECT 1 FROM sale_items WHERE sale_id = s.id AND (material IS NOT NULL OR color_code IS NOT NULL)) as is_custom
      FROM sales s
      ORDER BY COALESCE(s.created_at, s.date) DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/sales/:id/items', (req, res) => {
  try {
    const rows = dbAll('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- SERVICES ---
app.get('/api/services', (req, res) => {
  try {
    const rows = dbAll('SELECT * FROM services ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/services', (req, res) => {
  try {
    const data = req.body;
    const code = 'SRV-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const trans = db.transaction(() => {
      db.prepare(
        'INSERT INTO services (service_code, customer_name, customer_phone, item_description, service_required, total_amount, paid_amount, status, payment_mode, mpesa_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(code, data.customer_name, data.customer_phone, data.item_description, data.service_required, data.total_amount, data.paid_amount, 'pending', data.payment_mode || 'Cash', data.mpesa_code || null);

      if (data.paid_amount > 0) {
        const ref = 'SRV-DEP-' + Date.now();
        db.prepare(
          'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
        ).run(ref, data.paid_amount, data.cashier_name, data.cashier_id, data.payment_mode || 'Cash', data.mpesa_code || null, 'service');
      }
    });

    trans();
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/services/:id/payment', (req, res) => {
  try {
    const { id } = req.params;
    const { amount, status, payment_mode, mpesa_code, cashier_name, cashier_id } = req.body;

    const trans = db.transaction(() => {
      db.prepare(
        'UPDATE services SET paid_amount = paid_amount + ?, status = ?, payment_mode = ?, mpesa_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).run(amount, status, payment_mode, mpesa_code, id);

      const ref = 'SRV-PY-' + Date.now();
      db.prepare(
        'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(ref, amount, cashier_name || 'System', cashier_id || null, payment_mode || 'Cash', mpesa_code || null, 'service');
    });

    trans();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- TAILORING ORDERS ---
app.get('/api/tailoring-orders', (req, res) => {
  try {
    const rows = dbAll(`
      SELECT t.*, g.title as style_name, g.image_data as style_image, m.name as material_name
      FROM tailoring_orders t
      LEFT JOIN gallery g ON t.style_id = g.id
      LEFT JOIN materials m ON t.material_id = m.id
      ORDER BY t.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/tailoring-orders', (req, res) => {
  try {
    const data = req.body;
    const code = 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const styleId = (data.style_id && data.style_id !== '') ? parseInt(data.style_id) : null;
    const materialId = (data.material_id && data.material_id !== '') ? parseInt(data.material_id) : null;

    const trans = db.transaction(() => {
      db.prepare(
        `INSERT INTO tailoring_orders (order_code, customer_name, customer_phone, style_id, material_id, measurements, total_price, paid_amount, deadline, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(code, data.customer_name, data.customer_phone, styleId, materialId, JSON.stringify(data.measurements), data.total_price, data.paid_amount, data.deadline, 'pending');

      if (data.paid_amount > 0) {
        const ref = 'TLR-' + Date.now();
        db.prepare(
          'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
        ).run(ref, data.paid_amount, data.cashier_name, data.cashier_id, data.payment_mode || 'Cash', data.mpesa_code || null, 'tailoring');
      }
    });

    trans();
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/tailoring-orders/:id/payment', (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_mode, mpesa_code, cashier_name, cashier_id } = req.body;

    const trans = db.transaction(() => {
      const ord = dbGet('SELECT * FROM tailoring_orders WHERE id = ?', [id]);
      if (!ord) throw new Error('Order not found');

      const newPaid = Number(ord.paid_amount) + Number(amount);
      const newStatus = newPaid >= Number(ord.total_price) ? 'collected' : ord.status;

      db.prepare('UPDATE tailoring_orders SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newPaid, newStatus, id);

      const ref = 'TLR-PY-' + Date.now();
      db.prepare(
        'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(ref, amount, cashier_name, cashier_id, payment_mode || 'Cash', mpesa_code || null, 'tailoring_payment');
    });

    trans();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- SETTINGS ---
app.get('/api/settings', (req, res) => {
  try {
    const rows = dbAll('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const settings = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const trans = db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        upsert.run(key, value);
      }
    });
    trans();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- GALLERY ---
app.get('/api/gallery', (req, res) => {
  try {
    const rows = dbAll('SELECT * FROM gallery ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/gallery', (req, res) => {
  try {
    const data = req.body;
    db.prepare('INSERT INTO gallery (title, description, image_data, category) VALUES (?, ?, ?, ?)')
      .run(data.title, data.description, data.image_data, data.category);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/gallery/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM gallery WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- MATERIALS & COLORS ---
app.get('/api/materials', (req, res) => {
  try {
    res.json(dbAll('SELECT * FROM materials ORDER BY name ASC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/materials', (req, res) => {
  try {
    db.prepare('INSERT INTO materials (name) VALUES (?)').run(req.body.name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/materials/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM materials WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/colors', (req, res) => {
  try {
    res.json(dbAll('SELECT * FROM colors ORDER BY color_code ASC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/colors', (req, res) => {
  try {
    db.prepare('INSERT INTO colors (color_code, color_name) VALUES (?, ?)').run(req.body.color_code, req.body.color_name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/colors/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM colors WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- FITTING DEPOSITS ---
app.get('/api/fitting-deposits', (req, res) => {
  try {
    res.json(dbAll('SELECT * FROM fitting_deposits ORDER BY updated_at DESC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/fitting-deposits', (req, res) => {
  try {
    const data = req.body;
    const code = 'FIT-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const trans = db.transaction(() => {
      db.prepare(
        `INSERT INTO fitting_deposits (fitting_code, customer_name, customer_phone, item_id, item_name, material, color, total_amount, paid_amount, status, payment_mode, mpesa_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(code, data.customer_name, data.customer_phone, data.item_id || null, data.item_name, data.material || null, data.color || null, data.total_amount, data.paid_amount, 'pending', data.payment_mode || 'Cash', data.mpesa_code || null);

      if (data.paid_amount > 0) {
        const ref = 'FIT-DEP-' + Date.now();
        db.prepare(
          'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
        ).run(ref, data.paid_amount, data.cashier_name, data.cashier_id, data.payment_mode || 'Cash', data.mpesa_code || null, 'fitting');
      }
    });

    trans();
    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/fitting-deposits/:id/payment', (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_mode, mpesa_code, cashier_name, cashier_id } = req.body;

    const trans = db.transaction(() => {
      const fit = dbGet('SELECT * FROM fitting_deposits WHERE id = ?', [id]);
      if (!fit) throw new Error('Deposit not found');

      const newPaid = Number(fit.paid_amount) + Number(amount);
      const newStatus = newPaid >= Number(fit.total_amount) ? 'completed' : fit.status;

      db.prepare('UPDATE fitting_deposits SET paid_amount = ?, status = ?, payment_mode = ?, mpesa_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(newPaid, newStatus, payment_mode || 'Cash', mpesa_code || null, id);

      const ref = 'FIT-PY-' + Date.now();
      db.prepare(
        'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'
      ).run(ref, amount, cashier_name, cashier_id, payment_mode || 'Cash', mpesa_code || null, 'fitting_payment');
    });

    trans();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- EXPENSES ---
app.get('/api/expenses', (req, res) => {
  try {
    res.json(dbAll('SELECT * FROM expenses ORDER BY created_at DESC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/expenses', (req, res) => {
  try {
    const { category, amount, description, payment_mode } = req.body;
    db.prepare('INSERT INTO expenses (category, amount, description, payment_mode) VALUES (?, ?, ?, ?)')
      .run(category, amount, description, payment_mode || 'Cash');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- USERS ---
app.get('/api/users', (req, res) => {
  try {
    res.json(dbAll('SELECT id, username, role, full_name, status FROM users'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users/upsert', (req, res) => {
  try {
    const u = req.body;
    if (u.id) {
      if (u.password) {
        const hash = crypto.createHash('sha256').update(u.password).digest('hex');
        db.prepare('UPDATE users SET full_name = ?, username = ?, status = ?, password = ? WHERE id = ?')
          .run(u.full_name, u.username, u.status, hash, u.id);
      } else {
        db.prepare('UPDATE users SET full_name = ?, username = ?, status = ? WHERE id = ?')
          .run(u.full_name, u.username, u.status, u.id);
      }
    } else {
      const hash = crypto.createHash('sha256').update(u.password || '1234').digest('hex');
      db.prepare('INSERT INTO users (username, password, role, full_name, status) VALUES (?, ?, ?, ?, ?)')
        .run(u.username, hash, u.role || 'cashier', u.full_name, 'active');
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- WORKFORCE ---
app.get('/api/workforce', (req, res) => {
  try {
    res.json(dbAll('SELECT * FROM workforce ORDER BY name ASC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/production-logs', (req, res) => {
  try {
    res.json(dbAll('SELECT * FROM production_logs ORDER BY created_at DESC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/production-logs', (req, res) => {
  try {
    const { worker_id, worker_name, item_name, item_id, quantity, action } = req.body;
    db.prepare('INSERT INTO production_logs (worker_id, worker_name, item_name, item_id, quantity, action) VALUES (?, ?, ?, ?, ?, ?)')
      .run(worker_id, worker_name, item_name, item_id || null, quantity, action);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/workforce-payments', (req, res) => {
  try {
    res.json(dbAll('SELECT * FROM workforce_payments ORDER BY created_at DESC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/workforce-payments', (req, res) => {
  try {
    const { worker_id, worker_name, amount, payment_mode, notes, mpesa_code } = req.body;
    db.prepare('INSERT INTO workforce_payments (worker_id, worker_name, amount, payment_mode, notes, mpesa_code) VALUES (?, ?, ?, ?, ?, ?)')
      .run(worker_id, worker_name, amount, payment_mode || 'Cash', notes, mpesa_code || null);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- REPORTS ---
app.get('/api/reports/:range', (req, res) => {
  const { range } = req.params;
  const dateExpr = "COALESCE(created_at, date)";
  let filter = "1=1";
  if (range === 'daily') filter = `date(${dateExpr}, 'localtime') = date('now', 'localtime')`;
  else if (range === 'weekly') filter = `date(${dateExpr}, 'localtime') >= date('now', 'localtime', '-7 days')`;
  else if (range === 'monthly') filter = `date(${dateExpr}, 'localtime') >= date('now', 'localtime', 'start of month')`;
  else if (range === 'yearly') filter = `date(${dateExpr}, 'localtime') >= date('now', 'localtime', 'start of year')`;

  try {
    const summary = dbGet(`SELECT count(*) as count, coalesce(sum(total_amount), 0) as total FROM sales WHERE ${filter}`);
    const modes = dbAll(`SELECT payment_mode, count(*) as count, sum(total_amount) as total FROM sales WHERE ${filter} GROUP BY payment_mode`);
    const items = dbAll(`SELECT item_name, sum(quantity) as qty, sum(total) as total FROM sale_items JOIN sales ON sales.id = sale_items.sale_id WHERE ${filter} GROUP BY item_name ORDER BY qty DESC LIMIT 10`);
    const salesByType = dbAll(`SELECT COALESCE(sale_type, 'pos') as sale_type, count(*) as count, sum(total_amount) as total FROM sales WHERE ${filter} GROUP BY COALESCE(sale_type, 'pos')`);

    let expFilter = "1=1";
    if (range === 'daily') expFilter = "date(created_at, 'localtime') = date('now', 'localtime')";
    else if (range === 'weekly') expFilter = "date(created_at, 'localtime') >= date('now', 'localtime', '-7 days')";
    else if (range === 'monthly') expFilter = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of month')";
    else if (range === 'yearly') expFilter = "date(created_at, 'localtime') >= date('now', 'localtime', 'start of year')";

    const expensesSummary = dbGet(`SELECT coalesce(sum(amount), 0) as total, count(*) as count FROM expenses WHERE ${expFilter}`);
    const workforceSummary = dbGet(`SELECT coalesce(sum(amount), 0) as total, count(*) as count FROM workforce_payments WHERE ${expFilter}`);

    res.json({ summary, modes, items, salesByType, expensesSummary, workforceSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BACKUP ---
app.get('/api/backup', (req, res) => {
  try {
    const tables = ['users', 'items', 'sales', 'sale_items', 'services', 'fitting_deposits', 'tailoring_orders', 'expenses', 'workforce', 'workforce_payments', 'production_logs', 'settings', 'gallery'];
    const backup = {};
    for (const table of tables) {
      backup[table] = dbAll(`SELECT * FROM ${table}`);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=eunika_backup_' + Date.now() + '.json');
    res.json(backup);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.use((req, res) => res.status(404).json({ message: 'Not Found' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
