import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import pool from './db.js';
import { stkPush, registerC2BUrls } from './mpesa.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const PORT = process.env.PORT || 5001;

const transaction = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

const dbAll = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

const dbRun = async (sql, params = []) => {
  const [result] = await pool.execute(sql, params);
  return result;
};

const dbGet = async (sql, params = []) => {
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
};

const dbSet = async (connection, sql, params = []) => {
  const [result] = await connection.execute(sql, params);
  return result;
};

// --- AUTH ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND password = ?', [username, hash]);
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
app.post('/api/payments/stkpush', async (req, res) => {
  try {
    const { amount, phone, reference, description } = req.body;
    const result = await stkPush(amount, phone, reference, description);

    if (result.CheckoutRequestID) {
      await dbRun(`
        INSERT INTO mpesa_transactions (checkout_request_id, merchant_request_id, result_code, result_desc, amount, phone, transaction_date)
        VALUES (?, ?, -1, 'Pending Payment', ?, ?, NOW())
        ON DUPLICATE KEY UPDATE checkout_request_id = VALUES(checkout_request_id)
      `, [result.CheckoutRequestID, result.MerchantRequestID || null, amount, phone]);
    }

    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// STK Push Status Polling
app.get('/api/payments/status/:checkoutRequestId', async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    const record = await dbGet('SELECT result_code, result_desc, mpesa_receipt, amount FROM mpesa_transactions WHERE checkout_request_id = ?', [checkoutRequestId]);

    if (!record) {
      return res.json({ success: true, status: 'not_found' });
    }

    if (record.result_code === -1) {
      return res.json({ success: true, status: 'pending', description: record.result_desc });
    }

    if (record.result_code === 0) {
      return res.json({ success: true, status: 'success', receipt: record.mpesa_receipt, amount: record.amount, description: record.result_desc });
    }

    return res.json({ success: true, status: 'failed', description: record.result_desc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// STK Push Callback
app.post('/api/payments/callback', async (req, res) => {
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

    await dbRun(`
      INSERT INTO mpesa_transactions (checkout_request_id, merchant_request_id, result_code, result_desc, amount, mpesa_receipt, transaction_date, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        result_code = VALUES(result_code),
        result_desc = VALUES(result_desc),
        amount = VALUES(amount),
        mpesa_receipt = VALUES(mpesa_receipt),
        phone = VALUES(phone)
    `, [checkoutRequestID, merchantRequestID, resultCode, resultDesc, amount, mpesaCode, String(transDate || ''), String(phone || '')]);

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (err) {
    console.error('Callback Error:', err.message);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

app.post('/api/payments/c2b-validation', (req, res) => {
  console.log('C2B Validation Request:', req.body);
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

app.post('/api/payments/c2b-confirmation', async (req, res) => {
  try {
    console.log('C2B Confirmation Received:', req.body);
    const { TransID, TransAmount, BillRefNumber, MSISDN } = req.body;
    const amount = Number(TransAmount) || 0;
    const billRef = (BillRefNumber || '').trim();
    const phone = MSISDN || '';

    const existing = await dbGet('SELECT id FROM mpesa_transactions WHERE mpesa_receipt = ?', [TransID]);
    if (existing) {
      console.log(`Duplicate C2B callback ignored for receipt: ${TransID}`);
      return res.json({ ResultCode: 0, ResultDesc: 'Already processed' });
    }

    await dbRun(`
      INSERT INTO mpesa_transactions (checkout_request_id, merchant_request_id, result_code, result_desc, amount, mpesa_receipt, transaction_date, phone, is_claimed)
      VALUES (NULL, NULL, 0, 'C2B Offline Payment', ?, ?, NOW(), ?, 0)
    `, [amount, TransID, phone]);

    let matched = false;

    if (billRef) {
      const sale = await dbGet('SELECT id, payment_mode, mpesa_code FROM sales WHERE ref_number = ?', [billRef]);
      if (sale) {
        const newCodes = sale.mpesa_code ? `${sale.mpesa_code},${TransID}` : TransID;
        await dbRun("UPDATE sales SET payment_mode = 'M-Pesa', mpesa_code = ? WHERE id = ?", [newCodes, sale.id]);
        matched = true;
      }

      if (!matched) {
        const tailoring = await dbGet('SELECT id, paid_amount FROM tailoring_orders WHERE order_code = ?', [billRef]);
        if (tailoring) {
          const newPaid = Number(tailoring.paid_amount || 0) + amount;
          await dbRun('UPDATE tailoring_orders SET paid_amount = ? WHERE id = ?', [newPaid, tailoring.id]);
          matched = true;
        }
      }

      if (!matched) {
        const service = await dbGet('SELECT id, paid_amount, mpesa_code FROM services WHERE service_code = ?', [billRef]);
        if (service) {
          const newPaid = Number(service.paid_amount || 0) + amount;
          const newCodes = service.mpesa_code ? `${service.mpesa_code},${TransID}` : TransID;
          await dbRun('UPDATE services SET paid_amount = ?, mpesa_code = ? WHERE id = ?', [newPaid, newCodes, service.id]);
          matched = true;
        }
      }

      if (!matched) {
        const fitting = await dbGet('SELECT id, paid_amount, mpesa_code FROM fitting_deposits WHERE fitting_code = ?', [billRef]);
        if (fitting) {
          const newPaid = Number(fitting.paid_amount || 0) + amount;
          const newCodes = fitting.mpesa_code ? `${fitting.mpesa_code},${TransID}` : TransID;
          await dbRun('UPDATE fitting_deposits SET paid_amount = ?, mpesa_code = ? WHERE id = ?', [newPaid, newCodes, fitting.id]);
          matched = true;
        }
      }
    }

    if (matched) {
      await dbRun('UPDATE mpesa_transactions SET is_claimed = 1 WHERE mpesa_receipt = ?', [TransID]);
    }

    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (err) {
    console.error('C2B Confirmation Error:', err.message);
    res.status(500).json({ ResultCode: 1, ResultDesc: 'Internal Server Error' });
  }
});

app.get('/api/payments/register-urls', async (req, res) => {
  try {
    const result = await registerC2BUrls();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/payments/unclaimed', async (req, res) => {
  try {
    const records = await dbAll('SELECT * FROM mpesa_transactions WHERE is_claimed = 0 AND result_code = 0 ORDER BY created_at DESC');
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments/claim', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code required' });
    await dbRun('UPDATE mpesa_transactions SET is_claimed = 1 WHERE mpesa_receipt = ?', [code]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- ITEMS ---
app.get('/api/items', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM items');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/items/low-stock', async (req, res) => {
  try {
    const rows = await dbAll("SELECT *, 'item' as type FROM items WHERE stock <= min_stock OR stock IS NULL");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/items/upsert', async (req, res) => {
  try {
    const item = req.body;
    if (item.id) {
      await dbRun(
        'UPDATE items SET code = ?, item_code = ?, item_name = ?, price = ?, stock = ?, min_stock = ?, category = ? WHERE id = ?',
        [item.code, item.item_code || item.code, item.item_name || item.name, item.price || 0, item.stock || 0, item.min_stock || 5, item.category || null, item.id]
      );
    } else {
      await dbRun(
        'INSERT INTO items (code, item_code, item_name, price, stock, min_stock, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [item.code, item.item_code || item.code, item.item_name || item.name, item.price || 0, item.stock || 0, item.min_stock || 5, item.category || null]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await dbGet('SELECT code FROM items WHERE id = ?', [id]);
    if (row && (row.code === 'SYSTEM_SERVICE' || row.code === 'SYSTEM_TAILORING')) {
      return res.status(400).json({ success: false, message: 'Restricted: System item' });
    }
    await dbRun('DELETE FROM items WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- SALES ---
app.post('/api/sales/process', async (req, res) => {
  try {
    const { items, total, cashier, cashierId, paymentMode, mpesaCode } = req.body;
    const ref = 'REF-' + Date.now();

    await transaction(async (connection) => {
      const saleRes = await dbSet(connection,
        'INSERT INTO sales (ref_number, total_amount, cashier_name, payment_mode, mpesa_code, cashier_id, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [ref, total, cashier, paymentMode, mpesaCode || null, cashierId, 'pos']
      );
      const saleId = saleRes.insertId;

      for (const it of items) {
        await dbSet(connection,
          'INSERT INTO sale_items (sale_id, item_id, item_name, item_code, quantity, price, total, material, color_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [saleId, it.id, it.name, it.code || 'N/A', it.qty, it.price, it.qty * it.price, it.material || null, it.colorCode || null]
        );
        if (!String(it.code).startsWith('SYSTEM_')) {
          await dbSet(connection, 'UPDATE items SET stock = stock - ? WHERE id = ?', [it.qty, it.id]);
        }
      }
      return ref;
    });

    res.json({ success: true, ref });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT s.*,
      EXISTS(SELECT 1 FROM sale_items WHERE sale_id = s.id AND (material IS NOT NULL OR color_code IS NOT NULL)) as is_custom
      FROM sales s
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/sales/:id/items', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// --- SERVICES ---
app.get('/api/services', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM services ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/services', async (req, res) => {
  try {
    const data = req.body;
    const code = 'SRV-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    await transaction(async (connection) => {
      await dbSet(connection,
        'INSERT INTO services (service_code, customer_name, customer_phone, item_description, service_required, total_amount, paid_amount, status, payment_mode, mpesa_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [code, data.customer_name, data.customer_phone, data.item_description, data.service_required, data.total_amount, data.paid_amount, 'pending', data.payment_mode || 'Cash', data.mpesa_code || null]
      );

      if (data.paid_amount > 0) {
        const ref = 'SRV-DEP-' + Date.now();
        await dbSet(connection,
          'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [ref, data.paid_amount, data.cashier_name, data.cashier_id, data.payment_mode || 'Cash', data.mpesa_code || null, 'service']
        );
      }
    });

    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/services/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, status, payment_mode, mpesa_code, cashier_name, cashier_id } = req.body;

    await transaction(async (connection) => {
      await dbSet(connection,
        'UPDATE services SET paid_amount = paid_amount + ?, status = ?, payment_mode = ?, mpesa_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [amount, status, payment_mode, mpesa_code, id]
      );

      const ref = 'SRV-PY-' + Date.now();
      await dbSet(connection,
        'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [ref, amount, cashier_name || 'System', cashier_id || null, payment_mode || 'Cash', mpesa_code || null, 'service']
      );
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- TAILORING ORDERS ---
app.get('/api/tailoring-orders', async (req, res) => {
  try {
    const rows = await dbAll(`
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

app.post('/api/tailoring-orders', async (req, res) => {
  try {
    const data = req.body;
    const code = 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const styleId = (data.style_id && data.style_id !== '') ? parseInt(data.style_id) : null;
    const materialId = (data.material_id && data.material_id !== '') ? parseInt(data.material_id) : null;

    await transaction(async (connection) => {
      await dbSet(connection,
        `INSERT INTO tailoring_orders (order_code, customer_name, customer_phone, style_id, material_id, measurements, total_price, paid_amount, deadline, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, data.customer_name, data.customer_phone, styleId, materialId, JSON.stringify(data.measurements), data.total_price, data.paid_amount, data.deadline, 'pending']
      );

      if (data.paid_amount > 0) {
        const ref = 'TLR-' + Date.now();
        await dbSet(connection,
          'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [ref, data.paid_amount, data.cashier_name, data.cashier_id, data.payment_mode || 'Cash', data.mpesa_code || null, 'tailoring']
        );
      }
    });

    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/tailoring-orders/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_mode, mpesa_code, cashier_name, cashier_id } = req.body;

    await transaction(async (connection) => {
      const ord = await dbGet('SELECT * FROM tailoring_orders WHERE id = ?', [id]);
      if (!ord) throw new Error('Order not found');

      const newPaid = Number(ord.paid_amount) + Number(amount);
      const newStatus = newPaid >= Number(ord.total_price) ? 'collected' : ord.status;

      await dbSet(connection, 'UPDATE tailoring_orders SET paid_amount = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPaid, newStatus, id]);

      const ref = 'TLR-PY-' + Date.now();
      await dbSet(connection,
        'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [ref, amount, cashier_name, cashier_id, payment_mode || 'Cash', mpesa_code || null, 'tailoring_payment']
      );
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- SETTINGS ---
app.get('/api/settings', async (req, res) => {
  try {
    const rows = await dbAll('SELECT `key`, value FROM settings');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const settings = req.body;
    await transaction(async (connection) => {
      for (const [key, value] of Object.entries(settings)) {
        await dbSet(connection, 'INSERT INTO settings (`key`, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)', [key, value]);
      }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- GALLERY ---
app.get('/api/gallery', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM gallery ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/gallery', async (req, res) => {
  try {
    const data = req.body;
    await dbRun('INSERT INTO gallery (title, description, image_data, category) VALUES (?, ?, ?, ?)', [data.title, data.description, data.image_data, data.category]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/gallery/:id', async (req, res) => {
  try {
    const data = req.body;
    const result = await dbRun('UPDATE gallery SET title = ?, image_data = COALESCE(?, image_data), category = ? WHERE id = ?', [data.title, data.image_data || null, data.category, req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Style not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/gallery/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM gallery WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- MATERIALS & COLORS ---
app.get('/api/materials', async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM materials ORDER BY name ASC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/materials', async (req, res) => {
  try {
    await dbRun('INSERT INTO materials (name) VALUES (?)', [req.body.name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/materials/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM materials WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/colors', async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM colors ORDER BY color_code ASC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/colors', async (req, res) => {
  try {
    await dbRun('INSERT INTO colors (color_code, color_name) VALUES (?, ?)', [req.body.color_code, req.body.color_name]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/colors/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM colors WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- FITTING DEPOSITS ---
app.get('/api/fitting-deposits', async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM fitting_deposits ORDER BY updated_at DESC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/fitting-deposits', async (req, res) => {
  try {
    const data = req.body;
    const code = 'FIT-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    await transaction(async (connection) => {
      await dbSet(connection,
        `INSERT INTO fitting_deposits (fitting_code, customer_name, customer_phone, item_id, item_name, material, color, total_amount, paid_amount, status, payment_mode, mpesa_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, data.customer_name, data.customer_phone, data.item_id || null, data.item_name, data.material || null, data.color || null, data.total_amount, data.paid_amount, 'pending', data.payment_mode || 'Cash', data.mpesa_code || null]
      );

      if (data.paid_amount > 0) {
        const ref = 'FIT-DEP-' + Date.now();
        await dbSet(connection,
          'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
          [ref, data.paid_amount, data.cashier_name, data.cashier_id, data.payment_mode || 'Cash', data.mpesa_code || null, 'fitting']
        );
      }
    });

    res.json({ success: true, code });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/fitting-deposits/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_mode, mpesa_code, cashier_name, cashier_id } = req.body;

    await transaction(async (connection) => {
      const fit = await dbGet('SELECT * FROM fitting_deposits WHERE id = ?', [id]);
      if (!fit) throw new Error('Deposit not found');

      const newPaid = Number(fit.paid_amount) + Number(amount);
      const newStatus = newPaid >= Number(fit.total_amount) ? 'completed' : fit.status;

      await dbSet(connection, 'UPDATE fitting_deposits SET paid_amount = ?, status = ?, payment_mode = ?, mpesa_code = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newPaid, newStatus, payment_mode || 'Cash', mpesa_code || null, id]);

      const ref = 'FIT-PY-' + Date.now();
      await dbSet(connection,
        'INSERT INTO sales (ref_number, total_amount, cashier_name, cashier_id, payment_mode, mpesa_code, sale_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [ref, amount, cashier_name, cashier_id, payment_mode || 'Cash', mpesa_code || null, 'fitting_payment']
      );
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- EXPENSES ---
app.get('/api/expenses', async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM expenses ORDER BY created_at DESC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { category, amount, description, payment_mode } = req.body;
    await dbRun('INSERT INTO expenses (category, amount, description, payment_mode) VALUES (?, ?, ?, ?)', [category, amount, description, payment_mode || 'Cash']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- USERS ---
app.get('/api/users', async (req, res) => {
  try {
    res.json(await dbAll('SELECT id, username, role, full_name, status FROM users'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/users/upsert', async (req, res) => {
  try {
    const u = req.body;
    if (u.id) {
      if (u.password) {
        const hash = crypto.createHash('sha256').update(u.password).digest('hex');
        await dbRun('UPDATE users SET full_name = ?, username = ?, status = ?, password = ? WHERE id = ?', [u.full_name, u.username, u.status, hash, u.id]);
      } else {
        await dbRun('UPDATE users SET full_name = ?, username = ?, status = ? WHERE id = ?', [u.full_name, u.username, u.status, u.id]);
      }
    } else {
      const hash = crypto.createHash('sha256').update(u.password || '1234').digest('hex');
      await dbRun('INSERT INTO users (username, password, role, full_name, status) VALUES (?, ?, ?, ?, ?)', [u.username, hash, u.role || 'cashier', u.full_name, 'active']);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- WORKFORCE ---
app.get('/api/workforce', async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM workforce ORDER BY name ASC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/workforce', async (req, res) => {
  try {
    const { name, role } = req.body;
    await dbRun('INSERT INTO workforce (name, role, status) VALUES (?, ?, ?)', [name, role, 'active']);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/workforce/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM workforce WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/production-logs', async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM production_logs ORDER BY created_at DESC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/production-logs', async (req, res) => {
  try {
    const { worker_id, worker_name, item_name, item_id, quantity, action } = req.body;
    await dbRun('INSERT INTO production_logs (worker_id, worker_name, item_name, item_id, quantity, action) VALUES (?, ?, ?, ?, ?, ?)', [worker_id, worker_name, item_name, item_id || null, quantity, action]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/workforce-payments', async (req, res) => {
  try {
    res.json(await dbAll('SELECT * FROM workforce_payments ORDER BY created_at DESC'));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/workforce-payments', async (req, res) => {
  try {
    const { worker_id, worker_name, amount, payment_mode, notes, mpesa_code } = req.body;
    await dbRun('INSERT INTO workforce_payments (worker_id, worker_name, amount, payment_mode, notes, mpesa_code) VALUES (?, ?, ?, ?, ?, ?)', [worker_id, worker_name, amount, payment_mode || 'Cash', notes, mpesa_code || null]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- WORKER AUTH ---
app.post('/api/workforce/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const user = await dbGet('SELECT * FROM workforce WHERE username = ? AND password = ?', [username, hash]);
    if (user) {
      if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account disabled' });
      return res.json({ success: true, worker: { id: user.id, username: user.username, role: user.role, name: user.name } });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/workforce/:id/credentials', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    await dbRun('UPDATE workforce SET username = ?, password = ? WHERE id = ?', [username, hash, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- WORKER TASKS ---
app.get('/api/worker-tasks/assignable', async (req, res) => {
  try {
    const services = await dbAll("SELECT id, service_code as code, CONCAT(item_description, ' (', customer_name, ')') as description FROM services WHERE status != 'collected' AND id NOT IN (SELECT reference_id FROM worker_tasks WHERE task_type = 'service')");
    const tailoring = await dbAll("SELECT t.id, t.order_code as code, CONCAT(COALESCE(g.title, 'Custom'), ' (', t.customer_name, ')') as description FROM tailoring_orders t LEFT JOIN gallery g ON t.style_id = g.id WHERE t.status != 'collected' AND t.id NOT IN (SELECT reference_id FROM worker_tasks WHERE task_type = 'tailoring')");
    res.json({ services: services || [], tailoring: tailoring || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/worker-tasks', async (req, res) => {
  try {
    const { worker_id } = req.query;
    let query = `SELECT wt.*, t.measurements, t.deadline, m.name as material_name, g.image_data as design_image
                 FROM worker_tasks wt
                 LEFT JOIN tailoring_orders t ON wt.reference_id = t.id AND wt.task_type = 'tailoring'
                 LEFT JOIN gallery g ON t.style_id = g.id
                 LEFT JOIN materials m ON t.material_id = m.id`;
    const params = [];
    if (worker_id) {
      query += ' WHERE wt.worker_id = ?';
      params.push(worker_id);
    }
    query += ' ORDER BY wt.assigned_at DESC';
    res.json(await dbAll(query, params));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/worker-tasks/completed', async (req, res) => {
  try {
    const { worker_id, range } = req.query;
    let filter = "wt.status = 'completed'";
    if (range === 'daily') filter += " AND DATE(wt.completed_at) = CURDATE()";
    else if (range === 'weekly') filter += " AND DATE(wt.completed_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    else if (range === 'monthly') filter += " AND DATE(wt.completed_at) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')";
    else if (range === 'yearly') filter += " AND DATE(wt.completed_at) >= CONCAT(YEAR(CURDATE()), '-01-01')";

    let query = `SELECT wt.*, t.measurements, t.deadline, m.name as material_name, g.image_data as design_image
                 FROM worker_tasks wt
                 LEFT JOIN tailoring_orders t ON wt.reference_id = t.id AND wt.task_type = 'tailoring'
                 LEFT JOIN gallery g ON t.style_id = g.id
                 LEFT JOIN materials m ON t.material_id = m.id
                 WHERE ${filter}`;
    const params = [];
    if (worker_id) {
      query += ' AND wt.worker_id = ?';
      params.push(worker_id);
    }
    query += ' ORDER BY wt.completed_at DESC';
    res.json(await dbAll(query, params));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/api/worker-tasks', async (req, res) => {
  try {
    const { worker_id, worker_name, task_type, task_id, task_code, task_description, assigned_by, notes } = req.body;
    await dbRun(`
      INSERT INTO worker_tasks (worker_id, worker_name, task_type, reference_id, task_code, task_description, assigned_by, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'assigned')
    `, [worker_id, worker_name, task_type, task_id, task_code, task_description, assigned_by, notes || null]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/worker-tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (status === 'completed') {
      await dbRun('UPDATE worker_tasks SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]);
    } else {
      await dbRun('UPDATE worker_tasks SET status = ? WHERE id = ?', [status, id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/worker-tasks/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM worker_tasks WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// --- REPORTS ---
app.get('/api/reports/:range', async (req, res) => {
  const { range } = req.params;
  let filter = '1=1';
  if (range === 'daily') filter = `DATE(COALESCE(created_at, created_at)) = CURDATE()`;
  else if (range === 'weekly') filter = `DATE(COALESCE(created_at, created_at)) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`;
  else if (range === 'monthly') filter = `DATE(COALESCE(created_at, created_at)) >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`;
  else if (range === 'yearly') filter = `DATE(COALESCE(created_at, created_at)) >= CONCAT(YEAR(CURDATE()), '-01-01')`;

  try {
    const summary = await dbGet(`SELECT count(*) as count, COALESCE(sum(total_amount), 0) as total FROM sales WHERE ${filter}`);
    const modes = await dbAll(`SELECT payment_mode, count(*) as count, sum(total_amount) as total FROM sales WHERE ${filter} GROUP BY payment_mode`);
    const items = await dbAll(`SELECT item_name, sum(quantity) as qty, sum(total) as total FROM sale_items JOIN sales ON sales.id = sale_items.sale_id WHERE ${filter} GROUP BY item_name ORDER BY qty DESC LIMIT 10`);
    const salesByType = await dbAll(`SELECT COALESCE(sale_type, 'pos') as sale_type, count(*) as count, sum(total_amount) as total FROM sales WHERE ${filter} GROUP BY COALESCE(sale_type, 'pos')`);

    let expFilter = '1=1';
    if (range === 'daily') expFilter = 'DATE(created_at) = CURDATE()';
    else if (range === 'weekly') expFilter = 'DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    else if (range === 'monthly') expFilter = 'DATE(created_at) >= DATE_FORMAT(CURDATE(), "%Y-%m-01")';
    else if (range === 'yearly') expFilter = 'DATE(created_at) >= CONCAT(YEAR(CURDATE()), "-01-01")';

    const expensesSummary = await dbGet(`SELECT COALESCE(sum(amount), 0) as total, count(*) as count FROM expenses WHERE ${expFilter}`);
    const workforceSummary = await dbGet(`SELECT COALESCE(sum(amount), 0) as total, count(*) as count FROM workforce_payments WHERE ${expFilter}`);

    let workDoneFilter = "status = 'completed'";
    if (range === 'daily') workDoneFilter += ' AND DATE(completed_at) = CURDATE()';
    else if (range === 'weekly') workDoneFilter += ' AND DATE(completed_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)';
    else if (range === 'monthly') workDoneFilter += ' AND DATE(completed_at) >= DATE_FORMAT(CURDATE(), "%Y-%m-01")';
    else if (range === 'yearly') workDoneFilter += ' AND DATE(completed_at) >= CONCAT(YEAR(CURDATE()), "-01-01")';
    const workDone = await dbAll(`SELECT worker_name, task_type, count(*) as count FROM worker_tasks WHERE ${workDoneFilter} GROUP BY worker_name, task_type ORDER BY count DESC`);

    res.json({ summary, modes, items, salesByType, expensesSummary, workforceSummary, workDone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- BACKUP ---
app.get('/api/backup', async (req, res) => {
  try {
    const tables = ['users', 'items', 'sales', 'sale_items', 'services', 'fitting_deposits', 'tailoring_orders', 'expenses', 'workforce', 'workforce_payments', 'production_logs', 'settings', 'gallery'];
    const backup = {};
    for (const table of tables) {
      backup[table] = await dbAll(`SELECT * FROM ${table}`);
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
