const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve('pos.db');
console.log('Checking database at:', dbPath);

try {
    const db = new Database(dbPath);

    // Check tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('Available Tables:', tables.map(t => t.name).join(', '));

    if (tables.some(t => t.name === 'users')) {
        const users = db.prepare('SELECT id, username, password, role FROM users').all();
        console.log('Total Users Found:', users.length);
        console.log('User Details:', JSON.stringify(users, null, 2));
    } else {
        console.log('CRITICAL: users table does not exist!');
    }

    db.close();
} catch (err) {
    console.error('Database Error:', err.message);
}
