const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'pos.db');
const db = new Database(dbPath);

try {
    const cols = db.pragma('table_info(worker_tasks)');
    if (!cols.some(c => c.name === 'worker_name')) {
        db.prepare('ALTER TABLE worker_tasks ADD COLUMN worker_name VARCHAR(255);').run();
        db.prepare('ALTER TABLE worker_tasks ADD COLUMN task_code VARCHAR(255);').run();
        db.prepare('ALTER TABLE worker_tasks ADD COLUMN task_description TEXT;').run();
        console.log('Added missing columns to worker_tasks');
    }
} catch (e) {
    console.error('Error:', e.message);
} finally {
    db.close();
}
