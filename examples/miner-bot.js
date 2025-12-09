import { PVPClient } from '../index.js';

/**
 * PVP Genesis Miner Bot
 * Continuously mines and submits work to earn PVP tokens
 */

// Configuration
const PRIVATE_KEY = '0x839042e0c3af67a15ae0ff27af8217f83e73ad28a07f9f6c65cdebb9f9f821ed';
const ORACLE_URL = 'http://localhost:3000';
const MINING_INTERVAL = 5000; // 5 seconds between mining attempts

async function main() {
  console.log('🚀 PVP Genesis Miner Bot Starting...\n');

  // Initialize client
  const client = new PVPClient(PRIVATE_KEY);
  console.log(`💼 Wallet: ${client.wallet.address}`);

  // Check initial balance
  const initialBalance = await client.getBalance();
  console.log(`💰 Initial PVP Balance: ${ethers.formatEther(initialBalance)} PVP\n`);

  // Mining loop
  let miningCount = 0;
  while (true) {
    try {
      miningCount++;
      console.log(`\n⛏️  Mining Attempt #${miningCount}`);
      console.log(`⏰ ${new Date().toLocaleTimeString()}`);

      // Get current difficulty and reward
      const difficulty = await client.getDifficulty();
      const reward = await client.getReward();
      console.log(`📊 Current Difficulty: ${difficulty}`);
      console.log(`💎 Current Reward: ${ethers.formatEther(reward)} PVP`);

      // Mine and submit
      const receipt = await client.mineAndSubmit(ORACLE_URL);

      // Check new balance
      const newBalance = await client.getBalance();
      console.log(`\n✨ Success! New Balance: ${ethers.formatEther(newBalance)} PVP`);
      console.log(`📈 Earned: ${ethers.formatEther(newBalance - initialBalance)} PVP total`);

      // Wait before next mining attempt
      console.log(`\n⏳ Waiting ${MINING_INTERVAL / 1000}s before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, MINING_INTERVAL));

    } catch (error) {
      console.error(`\n❌ Mining error: ${error.message}`);
      console.log(`⏳ Retrying in ${MINING_INTERVAL / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, MINING_INTERVAL));
    }
  }
}

main().catch(console.error);
