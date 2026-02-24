import Database from 'better-sqlite3';
const db = new Database('pos.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);
tables.forEach(table => {
    const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table.name}'`).get();
    console.log(`\nSchema for ${table.name}:`);
    console.log(schema.sql);
});
db.close();
