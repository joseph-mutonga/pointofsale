const Database = require('better-sqlite3');
const db = new Database('pos.db');
const columns = db.prepare("PRAGMA table_info(sales)").all();
console.log(JSON.stringify(columns, null, 2));
db.close();
