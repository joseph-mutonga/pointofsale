const Database = require('better-sqlite3');
const db = new Database('./pos.db');

try {
    const info = db.prepare("PRAGMA table_info(items)").all();
    console.log('Columns in items table:');
    console.log(JSON.stringify(info, null, 2));

    const sample = db.prepare("SELECT * FROM items LIMIT 1").get();
    console.log('Sample item:', sample);
} catch (e) {
    console.error('Error:', e.message);
} finally {
    db.close();
}
