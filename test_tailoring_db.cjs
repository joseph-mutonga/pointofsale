const Database = require('better-sqlite3');
const path = require('path');

// Open the database
const dbPath = './pos.db';
const db = new Database(dbPath);

console.log('=== Testing Tailoring Orders Database ===\n');

// Check if table exists and view schema
console.log('1. Checking table schema:');
const tableInfo = db.prepare("PRAGMA table_info(tailoring_orders)").all();
console.log(tableInfo);
console.log('');

// Check existing data
console.log('2. Checking existing tailoring orders:');
try {
    const orders = db.prepare('SELECT * FROM tailoring_orders').all();
    console.log(`Found ${orders.length} tailoring orders:`);
    orders.forEach(order => {
        console.log(`  - Order ${order.order_code}: ${order.customer_name} (${order.status})`);
        console.log(`    Style ID: ${order.style_id}, Material ID: ${order.material_id}`);
        console.log(`    Total: ${order.total_price}, Paid: ${order.paid_amount}`);
    });
} catch (e) {
    console.log('Error fetching orders:', e.message);
}
console.log('');

// Test insert with NULL values
console.log('3. Testing INSERT with NULL style_id and material_id:');
try {
    const testCode = 'TEST-' + Date.now().toString().slice(-6);
    const measurements = JSON.stringify({ chest: '40', waist: '32', notes: 'Test order' });

    db.prepare(`
        INSERT INTO tailoring_orders (order_code, customer_name, customer_phone, style_id, material_id, measurements, total_price, paid_amount, deadline)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(testCode, 'Test Customer', '0712345678', null, null, measurements, 5000, 1000, '2026-02-01');

    console.log(`✅ Successfully inserted test order: ${testCode}`);

    // Verify it was inserted
    const inserted = db.prepare('SELECT * FROM tailoring_orders WHERE order_code = ?').get(testCode);
    console.log('   Inserted data:', inserted);

    // Clean up test data
    db.prepare('DELETE FROM tailoring_orders WHERE order_code = ?').run(testCode);
    console.log('   Test data cleaned up');
} catch (e) {
    console.log('❌ Error inserting test order:', e.message);
}
console.log('');

// Check gallery and materials tables
console.log('4. Checking gallery items:');
try {
    const gallery = db.prepare('SELECT id, title FROM gallery').all();
    console.log(`   Found ${gallery.length} gallery items`);
    gallery.forEach(g => console.log(`     - ID ${g.id}: ${g.title}`));
} catch (e) {
    console.log('   Error:', e.message);
}
console.log('');

console.log('5. Checking materials:');
try {
    const materials = db.prepare('SELECT id, name FROM materials').all();
    console.log(`   Found ${materials.length} materials`);
    materials.forEach(m => console.log(`     - ID ${m.id}: ${m.name}`));
} catch (e) {
    console.log('   Error:', e.message);
}
console.log('');

// Test JOIN query
console.log('6. Testing JOIN query (as used in app):');
try {
    const orders = db.prepare(`
        SELECT t.*, g.title as style_name, m.name as material_name 
        FROM tailoring_orders t
        LEFT JOIN gallery g ON t.style_id = g.id
        LEFT JOIN materials m ON t.material_id = m.id
        ORDER BY t.created_at DESC
    `).all();
    console.log(`   Query returned ${orders.length} orders successfully`);
    if (orders.length > 0) {
        console.log('   Sample order:');
        console.log(`     Code: ${orders[0].order_code}`);
        console.log(`     Style: ${orders[0].style_name || 'NULL (custom)'}`);
        console.log(`     Material: ${orders[0].material_name || 'NULL (customer provided)'}`);
    }
} catch (e) {
    console.log('   ❌ Error:', e.message);
}

db.close();
console.log('\n=== Test Complete ===');
