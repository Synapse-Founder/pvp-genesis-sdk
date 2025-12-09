import { PVPOracle } from '../index.js';
import http from 'http';

/**
 * PVP Genesis Oracle Server
 * Signs valid work submissions
 */

// Configuration
const ORACLE_PRIVATE_KEY = '0x839042e0c3af67a15ae0ff27af8217f83e73ad28a07f9f6c65cdebb9f9f821ed';
const PORT = 3000;

// Initialize oracle
const oracle = new PVPOracle(ORACLE_PRIVATE_KEY);
console.log('🔐 Oracle Wallet:', oracle.wallet.address);

// Create HTTP server
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle POST /sign
  if (req.method === 'POST' && req.url === '/sign') {
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { miner, difficulty, nonce } = JSON.parse(body);

        console.log(`\n📥 Sign request received:`);
        console.log(`   Miner: ${miner}`);
        console.log(`   Difficulty: ${difficulty}`);
        console.log(`   Nonce: ${nonce}`);

        // Verify work is valid
        const isValid = oracle.verifyWork(miner, difficulty, nonce);
        if (!isValid) {
          console.log(`❌ Invalid work!`);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid work' }));
          return;
        }

        // Sign the work
        const signature = await oracle.signWork(miner, difficulty, nonce);
        console.log(`✅ Work verified and signed`);
        console.log(`   Signature: ${signature.slice(0, 20)}...`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ signature }));

      } catch (error) {
        console.error(`❌ Error:`, error.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });

    return;
  }

  // Handle GET / (health check)
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      oracle: oracle.wallet.address,
      endpoints: ['/sign']
    }));
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`\n🚀 PVP Oracle Server running on http://localhost:${PORT}`);
  console.log(`📡 Endpoint: POST /sign`);
  console.log(`\nReady to sign work submissions!\n`);
});
