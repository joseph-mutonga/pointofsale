const Database = require('better-sqlite3');
const db = new Database('./pos.db');
const info = db.prepare("PRAGMA table_info(sale_items)").all();
console.log(JSON.stringify(info, null, 2));
db.close();
