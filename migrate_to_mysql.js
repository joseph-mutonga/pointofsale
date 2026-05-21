import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const sqliteDbPath = path.resolve(process.cwd(), 'pos.db');
const db = new sqlite3.Database(sqliteDbPath);

function all(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrate() {
  console.log('Starting migration to MySQL...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  await connection.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
  await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
  await connection.query(`USE ${process.env.DB_NAME}`);

  console.log(`Using database: ${process.env.DB_NAME}`);

  const tables = [
    {
      name: 'users',
      schema: `
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          username VARCHAR(255) UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role ENUM('admin', 'cashier') NOT NULL,
          full_name VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active'
        )
      `
    },
    {
      name: 'items',
      schema: `
        CREATE TABLE IF NOT EXISTS items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          code VARCHAR(255) UNIQUE NOT NULL,
          item_code VARCHAR(255),
          item_name VARCHAR(255) NOT NULL,
          price DOUBLE NOT NULL,
          stock INT DEFAULT 0,
          min_stock INT DEFAULT 5,
          category VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'materials',
      schema: `
        CREATE TABLE IF NOT EXISTS materials (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'colors',
      schema: `
        CREATE TABLE IF NOT EXISTS colors (
          id INT PRIMARY KEY AUTO_INCREMENT,
          color_code VARCHAR(255) NOT NULL UNIQUE,
          color_name VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'sales',
      schema: `
        CREATE TABLE IF NOT EXISTS sales (
          id INT PRIMARY KEY AUTO_INCREMENT,
          ref_number VARCHAR(255) UNIQUE NOT NULL,
          total_amount DOUBLE NOT NULL,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          cashier_name VARCHAR(255),
          cashier_id INT,
          payment_mode VARCHAR(255) DEFAULT 'Cash',
          mpesa_code VARCHAR(255),
          type VARCHAR(255) DEFAULT 'pos',
          sale_type VARCHAR(255) DEFAULT 'pos',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'sale_items',
      schema: `
        CREATE TABLE IF NOT EXISTS sale_items (
          id INT PRIMARY KEY AUTO_INCREMENT,
          sale_id INT NOT NULL,
          item_id INT NOT NULL,
          item_name VARCHAR(255) NOT NULL,
          item_code VARCHAR(255),
          quantity INT NOT NULL,
          price DOUBLE NOT NULL,
          total DOUBLE NOT NULL,
          material VARCHAR(255),
          color_code VARCHAR(255)
        )
      `
    },
    {
      name: 'services',
      schema: `
        CREATE TABLE IF NOT EXISTS services (
          id INT PRIMARY KEY AUTO_INCREMENT,
          service_code VARCHAR(255) UNIQUE NOT NULL,
          customer_name VARCHAR(255),
          customer_phone VARCHAR(255),
          item_description TEXT,
          service_required TEXT,
          total_amount DOUBLE NOT NULL,
          paid_amount DOUBLE DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          payment_mode VARCHAR(255),
          mpesa_code VARCHAR(255)
        )
      `
    },
    {
      name: 'fitting_deposits',
      schema: `
        CREATE TABLE IF NOT EXISTS fitting_deposits (
          id INT PRIMARY KEY AUTO_INCREMENT,
          fitting_code VARCHAR(255) UNIQUE NOT NULL,
          customer_name VARCHAR(255),
          customer_phone VARCHAR(255),
          item_id INT,
          item_name VARCHAR(255),
          material VARCHAR(255),
          color VARCHAR(255),
          total_amount DOUBLE NOT NULL,
          paid_amount DOUBLE DEFAULT 0,
          status VARCHAR(50) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          payment_mode VARCHAR(255),
          mpesa_code VARCHAR(255)
        )
      `
    },
    {
      name: 'workforce',
      schema: `
        CREATE TABLE IF NOT EXISTS workforce (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          username VARCHAR(255) UNIQUE,
          password TEXT,
          role VARCHAR(255),
          status VARCHAR(50) DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'worker_tasks',
      schema: `
        CREATE TABLE IF NOT EXISTS worker_tasks (
            id INT PRIMARY KEY AUTO_INCREMENT,
            worker_id INT,
            worker_name VARCHAR(255),
            task_type VARCHAR(50), 
            reference_id INT,
            task_code VARCHAR(255),
            task_description TEXT,
            status VARCHAR(50) DEFAULT 'assigned',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            assigned_by VARCHAR(255)
        )
      `
    },
    {
      name: 'production_logs',
      schema: `
        CREATE TABLE IF NOT EXISTS production_logs (
          id INT PRIMARY KEY AUTO_INCREMENT,
          worker_id INT,
          worker_name VARCHAR(255),
          item_name VARCHAR(255),
          item_id INT,
          quantity INT NOT NULL,
          action VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'workforce_payments',
      schema: `
        CREATE TABLE IF NOT EXISTS workforce_payments (
          id INT PRIMARY KEY AUTO_INCREMENT,
          worker_id INT,
          worker_name VARCHAR(255),
          amount DOUBLE NOT NULL,
          payment_mode VARCHAR(255) DEFAULT 'Cash',
          notes TEXT,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          mpesa_code VARCHAR(255)
        )
      `
    },
    {
      name: 'tailoring_orders',
      schema: `
        CREATE TABLE IF NOT EXISTS tailoring_orders (
          id INT PRIMARY KEY AUTO_INCREMENT,
          order_code VARCHAR(255) UNIQUE NOT NULL,
          customer_name VARCHAR(255),
          customer_phone VARCHAR(255),
          style_id INT,
          material_id INT,
          measurements JSON,
          total_price DOUBLE NOT NULL,
          paid_amount DOUBLE DEFAULT 0,
          deadline DATE,
          status VARCHAR(50) DEFAULT 'pending',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'expenses',
      schema: `
        CREATE TABLE IF NOT EXISTS expenses (
          id INT PRIMARY KEY AUTO_INCREMENT,
          description TEXT NOT NULL,
          amount DOUBLE NOT NULL,
          category VARCHAR(255),
          payment_mode VARCHAR(255) DEFAULT 'Cash',
          mpesa_code VARCHAR(255),
          cashier_id INT,
          cashier_name VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    },
    {
      name: 'settings',
      schema: `
        CREATE TABLE IF NOT EXISTS settings (
          \`key\` VARCHAR(255) PRIMARY KEY,
          value TEXT
        )
      `
    },
    {
      name: 'gallery',
      schema: `
        CREATE TABLE IF NOT EXISTS gallery (
          id INT PRIMARY KEY AUTO_INCREMENT,
          title VARCHAR(255),
          description TEXT,
          image_data LONGTEXT,
          category VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
    }
  ];

  for (const table of tables) {
    console.log(`Creating table: ${table.name}`);
    await connection.query(table.schema);

    const rows = await all(`SELECT * FROM ${table.name}`);
    if (rows.length > 0) {
      console.log(`Migrating ${rows.length} rows for ${table.name}`);
      const columns = Object.keys(rows[0]);
      const placeholders = columns.map(() => '?').join(',');
      const sql = `INSERT IGNORE INTO ${table.name} (${columns.map(c => "`" + c + "`").join(',')}) VALUES (${placeholders})`;

      for (const row of rows) {
        const values = columns.map(c => {
          if (table.name === 'tailoring_orders' && c === 'measurements' && typeof row[c] === 'string') {
             // Validate JSON for MySQL
             try { JSON.parse(row[c]); return row[c]; } catch(e) { return '[]'; }
          }
          return row[c];
        });
        await connection.execute(sql, values);
      }
    }
  }

  console.log('Migration completed successfully!');
  await connection.end();
  process.exit(0);
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
