const Database = require('better-sqlite3');
const db = new Database('./pos.db');

try {
  // Check if column exists
  const columns = db.prepare("PRAGMA table_info(mpesa_transactions)").all();
  if (!columns.find(c => c.name === 'is_claimed')) {
    console.log('Adding is_claimed column to mpesa_transactions...');
    db.prepare("ALTER TABLE mpesa_transactions ADD COLUMN is_claimed INTEGER DEFAULT 0").run();
    console.log('Successfully added is_claimed column.');
  } else {
    console.log('is_claimed column already exists.');
  }
} catch (e) {
  console.error('Error patching database:', e.message);
}
