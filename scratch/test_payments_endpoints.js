// Native fetch is available in Node 20

async function testEndpoints() {
  try {
    console.log('Testing Validation URL...');
    const valRes = await fetch('http://localhost:5001/api/payments/c2b-validation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    console.log('Validation Status:', valRes.status);
    console.log('Validation Response:', await valRes.json());

    console.log('\nTesting Confirmation URL...');
    const confRes = await fetch('http://localhost:5001/api/payments/c2b-confirmation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TransID: 'TEST_PING_123',
        TransAmount: 10,
        MSISDN: '254700000000'
      })
    });
    console.log('Confirmation Status:', confRes.status);
    console.log('Confirmation Response:', await confRes.json());

    console.log('\n✅ Both endpoints are reachable and responding correctly!');
  } catch (err) {
    console.error('Error hitting endpoints:', err.message);
    console.error('Make sure the server is running on port 5001.');
  }
}

testEndpoints();
