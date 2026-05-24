const Database = require('better-sqlite3');
const path = require('path');
const http = require('http');

const dbPath = path.join(__dirname, 'pos.db');
const db = new Database(dbPath);

async function runTest() {
  console.log('Testing C2B Confirmation Mapping...');

  // 1. Create a dummy tailoring order
  const orderCode = 'TEST-ORDER-' + Date.now();
  db.prepare(`
    INSERT INTO tailoring_orders (order_code, customer_name, total_price, paid_amount)
    VALUES (?, 'Test Customer', 5000, 1000)
  `).run(orderCode);

  console.log('Created tailoring order:', orderCode, 'Paid: 1000');

  // 2. Send HTTP request to backend
  const payload = JSON.stringify({
    TransactionType: "Pay Bill",
    TransID: "TEST" + Date.now(),
    TransTime: "20230815120000",
    TransAmount: "2500",
    BusinessShortCode: "123456",
    BillRefNumber: orderCode,
    InvoiceNumber: "",
    OrgAccountBalance: "50000.00",
    ThirdPartyTransID: "",
    MSISDN: "254712345678",
    FirstName: "John",
    MiddleName: "Doe",
    LastName: ""
  });

  const options = {
    hostname: 'localhost',
    port: 5001,
    path: '/api/mpesa/c2b-confirmation',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Response from server:', data);
      
      // 3. Verify Database
      const order = db.prepare('SELECT paid_amount FROM tailoring_orders WHERE order_code = ?').get(orderCode);
      console.log('Updated tailoring order paid_amount:', order?.paid_amount, '(Expected: 3500)');
      
      const tx = db.prepare('SELECT * FROM mpesa_transactions WHERE phone = ? ORDER BY id DESC LIMIT 1').get("254712345678");
      console.log('Logged transaction in mpesa_transactions:', tx?.result_desc);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(payload);
  req.end();
}

runTest();
