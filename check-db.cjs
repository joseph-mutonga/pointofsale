const Database = require('better-sqlite3');
const db = new Database('./database.sqlite');

console.log('Items table exists:', db.prepare('SELECT name FROM sqlite_master WHERE type="table" AND name="items"').get());
console.log('Items count:', db.prepare('SELECT COUNT(*) as count FROM items').get().count);
console.log('Items schema:', db.prepare('PRAGMA table_info(items)').all());

db.close();