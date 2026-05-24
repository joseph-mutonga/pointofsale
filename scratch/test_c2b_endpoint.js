// Native fetch is available in Node 20
import Database from 'better-sqlite3';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const db = new Database('./pos.db');

// Start the server
const server = spawn('node', ['server/server.js']);

server.on('error', (err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});

setTimeout(async () => {
  try {
    const TransID = 'TEST_END_' + Date.now();
    
    // Send mock Daraja C2B payload for Buy Goods (No BillRefNumber)
    const payload = {
      TransID,
      TransAmount: 200,
      BillRefNumber: '',
      MSISDN: '254700123456',
      FirstName: 'John',
      LastName: 'Doe'
    };

    console.log('Sending mock C2B request...');
    const res = await fetch('http://localhost:5001/api/mpesa/c2b-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log('Response:', data);

    // Verify DB
    const mpesaTx = db.prepare('SELECT * FROM mpesa_transactions WHERE mpesa_receipt = ?').get(TransID);
    console.log('Mpesa Transaction is_claimed:', mpesaTx ? mpesaTx.is_claimed : 'Not Found');
    
    const duplicateSale = db.prepare('SELECT * FROM sales WHERE mpesa_code = ?').get(TransID);
    console.log('Duplicate Sale found:', !!duplicateSale);

    if (mpesaTx && mpesaTx.is_claimed === 0 && !duplicateSale) {
      console.log('✅ TEST PASSED: Transaction safely recorded as unclaimed and no duplicate sale created.');
    } else {
      console.log('❌ TEST FAILED.');
    }

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    server.kill();
    process.exit(0);
  }
}, 3000);
