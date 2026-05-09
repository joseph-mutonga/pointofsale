const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');
const crypto = require('crypto');

const dbPath = !app.isPackaged
  ? path.resolve(process.cwd(), 'pos.db')
  : path.join(app.getPath('userData'), 'pos.db');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function initDb() {
  console.log('Initializing database at:', dbPath);

  // --- MIGRATIONS ---
  const tableExists = (name) => db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);

  // Migration: gallery table category column
  if (tableExists('gallery')) {
    const columns = db.prepare("PRAGMA table_info(gallery)").all();
    if (!columns.find(c => c.name === 'category')) {
      console.log('Migrating gallery: adding category column');
      db.prepare("ALTER TABLE gallery ADD COLUMN category TEXT").run();
    }
  }

  // Migration: items table (rename name to item_name if it exists)
  if (tableExists('items')) {
    try {
      const columns = db.prepare("PRAGMA table_info(items)").all();
      const hasName = columns.some(c => c.name === 'name');
      const hasItemName = columns.some(c => c.name === 'item_name');

      if (hasName && !hasItemName) {
        db.prepare("ALTER TABLE items RENAME COLUMN name TO item_name").run();
        console.log('Migrated items table: renamed "name" to "item_name"');
      } else if (hasName && hasItemName) {
        // Both exist, legacy "name" might be causing NOT NULL constraint issues
        try {
          db.prepare("ALTER TABLE items DROP COLUMN name").run();
          console.log('Migrated items table: dropped legacy "name" column');
        } catch (dropErr) {
          // If DROP COLUMN isn't supported, we at least try to ignore it or the user might need a fresh DB
          console.error('Could not drop legacy name column:', dropErr.message);
        }
      }
    } catch (e) {
      console.error('Migration error for items table:', e.message);
    }
  }

  // --- SCHEMA CREATION ---
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
      full_name TEXT,
      status TEXT DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      item_code TEXT,
      item_name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      min_stock INTEGER DEFAULT 5,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      color_code TEXT NOT NULL UNIQUE,
      color_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ref_number TEXT UNIQUE NOT NULL,
      total_amount REAL NOT NULL,
      cashier_name TEXT,
      cashier_id INTEGER,
      payment_mode TEXT DEFAULT 'Cash',
      mpesa_code TEXT,
      sale_type TEXT DEFAULT 'pos',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      item_code TEXT,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      total REAL NOT NULL,
      material TEXT,
      color_code TEXT,
      FOREIGN KEY(sale_id) REFERENCES sales(id),
      FOREIGN KEY(item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_code TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      item_description TEXT,
      service_required TEXT,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      payment_mode TEXT,
      mpesa_code TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS fitting_deposits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fitting_code TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      item_id INTEGER,
      item_name TEXT,
      material TEXT,
      color TEXT,
      total_amount REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS workforce (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS production_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER,
      worker_name TEXT,
      item_name TEXT,
      item_id INTEGER,
      quantity INTEGER NOT NULL,
      action TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(worker_id) REFERENCES workforce(id)
    );

    CREATE TABLE IF NOT EXISTS workforce_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      worker_id INTEGER,
      worker_name TEXT,
      amount REAL NOT NULL,
      payment_mode TEXT DEFAULT 'Cash',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(worker_id) REFERENCES workforce(id)
    );



    CREATE TABLE IF NOT EXISTS tailoring_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      style_id INTEGER,
      material_id INTEGER,
      measurements TEXT,
      total_price REAL NOT NULL,
      paid_amount REAL DEFAULT 0,
      deadline DATE,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT,
      payment_mode TEXT DEFAULT 'Cash',
      cashier_id INTEGER,
      cashier_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(cashier_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS gallery (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image_data TEXT,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // --- COLUMN MIGRATIONS ---
  const addCol = (tbl, col, def) => {
    try {
      db.prepare(`ALTER TABLE ${tbl} ADD COLUMN ${col} ${def}`).run();
      console.log(`✅ Migration: Added ${col} to ${tbl}`);
    } catch (e) {
      if (!e.message.includes('duplicate column name')) {
        console.error(`❌ Migration failed for ${tbl}.${col}:`, e.message);
      }
    }
  };

  addCol('users', 'full_name', 'TEXT');
  console.log('--- Sales Table Columns ---', db.prepare("PRAGMA table_info(sales)").all().map(c => c.name));
  addCol('users', 'status', "TEXT DEFAULT 'active'");
  addCol('items', 'code', 'TEXT');
  addCol('items', 'item_code', 'TEXT');
  addCol('items', 'item_name', 'TEXT');
  addCol('items', 'price', 'REAL');
  addCol('items', 'stock', 'INTEGER');
  addCol('items', 'min_stock', 'INTEGER DEFAULT 5');
  const salesCols = db.prepare("PRAGMA table_info(sales)").all();
  if (!salesCols.find(c => c.name === 'created_at')) {
    console.log('Migrating sales: adding created_at column');
    addCol('sales', 'created_at', 'DATETIME'); // Cannot use CURRENT_TIMESTAMP in ALTER TABLE
    
    // If there's an old 'date' column, migrate data
    if (salesCols.find(c => c.name === 'date')) {
        console.log('Migrating data from date to created_at');
        db.prepare("UPDATE sales SET created_at = date").run();
    }
  }
  
  addCol('sales', 'payment_mode', "TEXT DEFAULT 'Cash'");
  addCol('sales', 'mpesa_code', 'TEXT');
  addCol('sales', 'cashier_id', 'INTEGER');
  addCol('sales', 'sale_type', "TEXT DEFAULT 'pos'");
  addCol('workforce_payments', 'created_at', 'DATETIME'); // Cannot use CURRENT_TIMESTAMP in ALTER TABLE
  addCol('items', 'category', 'TEXT');
  addCol('sale_items', 'item_code', 'TEXT');
  addCol('sale_items', 'material', 'TEXT');
  addCol('sale_items', 'color_code', 'TEXT');
  addCol('services', 'mpesa_code', 'TEXT');
  addCol('fitting_deposits', 'customer_phone', 'TEXT');
  addCol('fitting_deposits', 'payment_mode', "TEXT DEFAULT 'Cash'");
  addCol('fitting_deposits', 'mpesa_code', 'TEXT');
  addCol('tailoring_orders', 'status', "TEXT DEFAULT 'pending'");
  addCol('expenses', 'mpesa_code', 'TEXT');
  addCol('workforce_payments', 'mpesa_code', 'TEXT');


  // --- SEEDING ---
  const checkServiceItem = db.prepare('SELECT * FROM items WHERE code = ?').get('SYSTEM_SERVICE');
  if (!checkServiceItem) {
    db.prepare('INSERT INTO items (code, item_code, item_name, price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?)')
      .run('SYSTEM_SERVICE', 'SERVICE', 'Service Revenue', 0, 999999, 0);
    console.log('System service item created.');
  }

  const checkTailorItem = db.prepare('SELECT * FROM items WHERE code = ?').get('SYSTEM_TAILORING');
  if (!checkTailorItem) {
    db.prepare('INSERT INTO items (code, item_code, item_name, price, stock, min_stock) VALUES (?, ?, ?, ?, ?, ?)')
      .run('SYSTEM_TAILORING', 'TAILOR', 'Tailoring Revenue', 0, 999999, 0);
    console.log('System tailoring item created.');
  }

  const checkAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  const adminHash = crypto.createHash('sha256').update('admin123').digest('hex');

  if (!checkAdmin) {
    db.prepare('INSERT INTO users (username, password, role, full_name, status) VALUES (?, ?, ?, ?, ?)')
      .run('admin', adminHash, 'admin', 'System Admin', 'active');
    console.log('Default admin created.');
  } else {
    db.prepare('UPDATE users SET password = ? WHERE username = ?').run(adminHash, 'admin');
  }

  // --- SETTINGS SEEDING ---
  const defaultSettings = [
    { key: 'shop_name', value: 'Eunika Collection' },
    { key: 'shop_phone', value: '+254 712 345 678' },
    { key: 'shop_address', value: 'Nairobi, Kenya' },
    { key: 'shop_email', value: 'info@eunikacollection.com' },
    { key: 'receipt_footer', value: 'Thank you for your business!' }
  ];

  const checkSet = db.prepare('SELECT count(*) as count FROM settings').get();
  if (checkSet.count === 0) {
    const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    defaultSettings.forEach(s => ins.run(s.key, s.value));
    console.log('Default settings seeded.');
  }

  // --- DATA CLEANUP & INTEGRITY ---
  // 1. Ensure all items have a code (critical for POS scanning)
  try {
    const itemsWithoutCode = db.prepare("SELECT id FROM items WHERE code IS NULL OR code = ''").all();
    if (itemsWithoutCode.length > 0) {
      console.log(`Found ${itemsWithoutCode.length} items without code. Generating defaults...`);
      const upd = db.prepare("UPDATE items SET code = ?, item_code = ? WHERE id = ?");
      const trans = db.transaction((items) => {
        items.forEach(i => {
          const newCode = `GEN-${1000 + i.id}`;
          upd.run(newCode, newCode, i.id);
        });
      });
      trans(itemsWithoutCode);
    }

    // 2. Ensure item_code mirrors code if missing (for consistency)
    db.prepare("UPDATE items SET item_code = code WHERE item_code IS NULL OR item_code = ''").run();

    // 3. Ensure uniqueness on code if it wasn't strictly enforced by previous migrations
    // (This is hard to enforce retrospectively without deleting, so we just ensure they are populated for now)
  } catch (err) {
    console.error('Data cleanup error:', err.message);
  }
  console.log('--- Database Initialization Complete ---');
}

module.exports = { db, initDb, dbPath };
