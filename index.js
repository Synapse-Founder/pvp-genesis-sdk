import { ethers } from 'ethers';

/**
 * PVP Genesis SDK
 * Official SDK for Physical Value Protocol on Polygon
 */

const PVP_CONTRACT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
const POLYGON_RPC = 'https://polygon-rpc.com';

const PVP_ABI = [
  'function submitWork(uint256 difficulty, uint256 nonce, bytes signature) external',
  'function getCurrentDifficulty() external view returns (uint256)',
  'function getWorkReward() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'event WorkSubmitted(address indexed miner, uint256 reward, uint256 difficulty)'
];

export class PVPClient {
  constructor(privateKey, rpcUrl = POLYGON_RPC) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(PVP_CONTRACT_ADDRESS, PVP_ABI, this.wallet);
  }

  /**
   * Get current mining difficulty
   */
  async getDifficulty() {
    return await this.contract.getCurrentDifficulty();
  }

  /**
   * Get current work reward
   */
  async getReward() {
    return await this.contract.getWorkReward();
  }

  /**
   * Get PVP token balance
   */
  async getBalance(address) {
    return await this.contract.balanceOf(address || this.wallet.address);
  }

  /**
   * Submit work to the contract
   */
  async submitWork(difficulty, nonce, signature) {
    const tx = await this.contract.submitWork(difficulty, nonce, signature);
    return await tx.wait();
  }

  /**
   * Mine: Find a valid nonce for the current difficulty
   */
  async mine() {
    const difficulty = await this.getDifficulty();
    const target = BigInt(2) ** BigInt(256) / difficulty;

    let nonce = 0;
    while (true) {
      const hash = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
          ['address', 'uint256', 'uint256'],
          [this.wallet.address, difficulty, nonce]
        )
      );

      if (BigInt(hash) < target) {
        return { difficulty, nonce, hash };
      }

      nonce++;
      if (nonce % 10000 === 0) {
        console.log(`Tried ${nonce} nonces...`);
      }
    }
  }

  /**
   * Request oracle signature
   */
  async requestOracleSignature(oracleUrl, difficulty, nonce) {
    const response = await fetch(`${oracleUrl}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        miner: this.wallet.address,
        difficulty: difficulty.toString(),
        nonce: nonce.toString()
      })
    });

    if (!response.ok) {
      throw new Error(`Oracle error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.signature;
  }

  /**
   * Full mining cycle: mine + get signature + submit
   */
  async mineAndSubmit(oracleUrl) {
    console.log('🔨 Starting mining...');
    const { difficulty, nonce, hash } = await this.mine();
    console.log(`✅ Found valid nonce: ${nonce}`);
    console.log(`📊 Hash: ${hash}`);

    console.log('📡 Requesting oracle signature...');
    const signature = await this.requestOracleSignature(oracleUrl, difficulty, nonce);
    console.log(`✅ Signature received: ${signature}`);

    console.log('📤 Submitting work to contract...');
    const receipt = await this.submitWork(difficulty, nonce, signature);
    console.log(`✅ Work submitted! Tx: ${receipt.hash}`);

    return receipt;
  }
}

/**
 * Oracle Server Helper
 */
export class PVPOracle {
  constructor(privateKey) {
    this.wallet = new ethers.Wallet(privateKey);
  }

  /**
   * Sign work submission
   */
  async signWork(miner, difficulty, nonce) {
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256'],
      [miner, difficulty, nonce]
    );

    const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));
    return signature;
  }

  /**
   * Verify work is valid
   */
  verifyWork(miner, difficulty, nonce) {
    const hash = ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'uint256'],
        [miner, difficulty, nonce]
      )
    );

    const target = BigInt(2) ** BigInt(256) / BigInt(difficulty);
    return BigInt(hash) < target;
  }
}

export default { PVPClient, PVPOracle, PVP_CONTRACT_ADDRESS, POLYGON_RPC };
