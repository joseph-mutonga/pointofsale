const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, 'pos.db');
const db = new Database(dbPath);

try {
    const workforceColumns = db.pragma('table_info(workforce)');
    const hasUsername = workforceColumns.some(col => col.name === 'username');
    const hasPassword = workforceColumns.some(col => col.name === 'password');

    if (!hasUsername) {
        console.log('Adding username to workforce...');
        db.prepare('ALTER TABLE workforce ADD COLUMN username VARCHAR(255);').run();
        db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_workforce_username ON workforce(username);').run();
    }
    
    if (!hasPassword) {
        console.log('Adding password to workforce...');
        db.prepare('ALTER TABLE workforce ADD COLUMN password TEXT;').run();
    }

    console.log('Creating worker_tasks table...');
    db.prepare(`
        CREATE TABLE IF NOT EXISTS worker_tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_id INTEGER,
            task_type VARCHAR(50), 
            reference_id INTEGER, 
            status VARCHAR(50) DEFAULT 'assigned',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            notes TEXT,
            assigned_by VARCHAR(255)
        )
    `).run();

    console.log('Schema update complete.');
} catch (e) {
    console.error('Error updating schema:', e.message);
} finally {
    db.close();
}
