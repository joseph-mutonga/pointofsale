import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'eunika',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z'
});

async function initializeDatabase() {
  const adminConnection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  try {
    await adminConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'eunika'}\``);
  } finally {
    await adminConnection.end();
  }

  const schema = [
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role ENUM('admin', 'cashier') NOT NULL,
      full_name VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active'
    )`,
    `CREATE TABLE IF NOT EXISTS items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      code VARCHAR(255) UNIQUE NOT NULL,
      item_code VARCHAR(255),
      item_name VARCHAR(255) NOT NULL,
      price DOUBLE NOT NULL,
      stock INT DEFAULT 0,
      min_stock INT DEFAULT 5,
      category VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS materials (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS colors (
      id INT PRIMARY KEY AUTO_INCREMENT,
      color_code VARCHAR(255) NOT NULL UNIQUE,
      color_name VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sales (
      id INT PRIMARY KEY AUTO_INCREMENT,
      ref_number VARCHAR(255) UNIQUE NOT NULL,
      total_amount DOUBLE NOT NULL,
      cashier_name VARCHAR(255),
      cashier_id INT,
      payment_mode VARCHAR(255) DEFAULT 'Cash',
      mpesa_code VARCHAR(255),
      sale_type VARCHAR(255) DEFAULT 'pos',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_sales_created_at (created_at)
    )`,
    `CREATE TABLE IF NOT EXISTS sale_items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sale_id INT NOT NULL,
      item_id INT NOT NULL,
      item_name VARCHAR(255) NOT NULL,
      item_code VARCHAR(255),
      quantity INT NOT NULL,
      price DOUBLE NOT NULL,
      total DOUBLE NOT NULL,
      material VARCHAR(255),
      color_code VARCHAR(255),
      KEY idx_sale_items_sale_id (sale_id)
    )`,
    `CREATE TABLE IF NOT EXISTS services (
      id INT PRIMARY KEY AUTO_INCREMENT,
      service_code VARCHAR(255) UNIQUE NOT NULL,
      customer_name VARCHAR(255),
      customer_phone VARCHAR(255),
      item_description TEXT,
      service_required TEXT,
      total_amount DOUBLE NOT NULL,
      paid_amount DOUBLE DEFAULT 0,
      payment_mode VARCHAR(255),
      mpesa_code VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS fitting_deposits (
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
      payment_mode VARCHAR(255),
      mpesa_code VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS workforce (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      username VARCHAR(255) UNIQUE,
      password TEXT,
      role VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS production_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      worker_id INT,
      worker_name VARCHAR(255),
      item_name VARCHAR(255),
      item_id INT,
      quantity INT NOT NULL,
      action VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS workforce_payments (
      id INT PRIMARY KEY AUTO_INCREMENT,
      worker_id INT,
      worker_name VARCHAR(255),
      amount DOUBLE NOT NULL,
      payment_mode VARCHAR(255) DEFAULT 'Cash',
      notes TEXT,
      mpesa_code VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tailoring_orders (
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
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INT PRIMARY KEY AUTO_INCREMENT,
      description TEXT NOT NULL,
      amount DOUBLE NOT NULL,
      category VARCHAR(255),
      payment_mode VARCHAR(255) DEFAULT 'Cash',
      cashier_id INT,
      cashier_name VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      key_name VARCHAR(255) PRIMARY KEY,
      value TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS gallery (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_data TEXT,
      category VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS mpesa_transactions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      checkout_request_id VARCHAR(255) UNIQUE,
      merchant_request_id VARCHAR(255),
      result_code INT,
      result_desc TEXT,
      amount DOUBLE,
      mpesa_receipt VARCHAR(255),
      transaction_date VARCHAR(255),
      phone VARCHAR(255),
      is_claimed TINYINT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      KEY idx_mpesa_claimed (is_claimed)
    )`,
    `CREATE TABLE IF NOT EXISTS worker_tasks (
      id INT PRIMARY KEY AUTO_INCREMENT,
      worker_id INT NOT NULL,
      worker_name VARCHAR(255),
      task_type VARCHAR(50) NOT NULL,
      reference_id INT NOT NULL,
      task_code VARCHAR(255),
      task_description TEXT,
      status VARCHAR(50) DEFAULT 'assigned',
      assigned_by VARCHAR(255),
      notes TEXT,
      assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      KEY idx_worker_tasks_worker (worker_id)
    )`
  ];

  for (const tableSql of schema) {
    await pool.execute(tableSql);
  }
}

initializeDatabase().catch((error) => {
  console.error('MySQL initialization failed:', error.message);
});

export default pool;
