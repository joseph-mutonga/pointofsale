const Database = require('better-sqlite3');
const path = require('path');

try {
    const db = new Database('pos.db');
    console.log('Database connected successfully');

    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Tables:', tables.map(t => t.name));

    // Check items table info
    if (tables.some(t => t.name === 'items')) {
        const columns = db.prepare("PRAGMA table_info(items)").all();
        console.log('Items columns:', columns.map(c => c.name));
    }

    // Check materials table info
    if (tables.some(t => t.name === 'materials')) {
        const columns = db.prepare("PRAGMA table_info(materials)").all();
        console.log('Materials columns:', columns.map(c => c.name));
    }

    db.close();
} catch (err) {
    console.error('Database error:', err);
    process.exit(1);
}
