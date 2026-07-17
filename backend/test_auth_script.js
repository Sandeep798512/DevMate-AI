const fs = require('fs');
const path = require('path');

async function run() {
  try {
    // 1. Login
    console.log('Logging in...');
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sandeep@devmate.ai',
        password: 'password123'
      })
    });
    
    if (!loginRes.ok) {
      const errText = await loginRes.text();
      throw new Error(`Login failed with status ${loginRes.status}: ${errText}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('Login successful! Access token obtained.');
    
    // 2. Upload file
    const filePath = path.join(__dirname, 'test_auth.txt');
    fs.writeFileSync(filePath, 'console.log("hello authenticated world");');
    
    const fileBuffer = fs.readFileSync(filePath);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });
    
    const formData = new FormData();
    formData.append('file', blob, 'test_auth.txt');
    formData.append('action', 'explain');
    
    console.log('Sending authenticated upload request to http://localhost:3000/api/upload...');
    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    console.log('Upload status:', res.status);
    const data = await res.json();
    console.log('Upload response data:', JSON.stringify(data, null, 2));
    
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error('Error in test script:', err);
  }
}

run();
