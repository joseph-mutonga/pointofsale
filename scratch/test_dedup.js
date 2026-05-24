import { spawn } from 'child_process';

async function testDedup() {
  const server = spawn('node', ['server/server.js'], { env: { ...process.env, PORT: 5005 } });
  
  await new Promise(r => setTimeout(r, 2000)); // wait for server to start

  try {
    const payload = {
      TransID: 'DEDUP_TEST_' + Date.now(),
      TransAmount: 50,
      MSISDN: '254711111111'
    };

    console.log('Sending first C2B callback...');
    let res1 = await fetch('http://localhost:5005/api/payments/c2b-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Response 1:', await res1.json());

    console.log('\nSending second duplicate C2B callback...');
    let res2 = await fetch('http://localhost:5005/api/payments/c2b-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    console.log('Response 2:', await res2.json());

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    server.kill();
    process.exit(0);
  }
}

testDedup();
