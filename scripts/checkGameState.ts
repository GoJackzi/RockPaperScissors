import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x9434AAd18aF442E560C01632798Cf5f8141b2212";
const RPC_URL = "https://eth-sepolia.g.alchemy.com/v2/RSaO0kH_yHZrcI8-GfcF4YOT3t4bSDpQ";

const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "gameId", "type": "uint256"}],
    "name": "getGame",
    "outputs": [
      {"internalType": "address", "name": "player1", "type": "address"},
      {"internalType": "address", "name": "player2", "type": "address"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "bool", "name": "player1Committed", "type": "bool"},
      {"internalType": "bool", "name": "player2Committed", "type": "bool"},
      {"internalType": "bool", "name": "resultsDecrypted", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gameCounter",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const STATUS_NAMES = [
  "WaitingForPlayers",
  "WaitingForMoves", 
  "MovesCommitted",
  "DecryptionInProgress",
  "ResultsDecrypted"
];

async function checkGameState(gameId: number) {
  console.log(`\n🔍 Checking game state for Game ID: ${gameId}`);
  console.log(`📍 Contract: ${CONTRACT_ADDRESS}`);
  console.log(`🌐 Network: Sepolia Testnet\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

  try {
    // Get game counter first
    const gameCounter = await contract.gameCounter();
    console.log(`📊 Total games created: ${gameCounter.toString()}\n`);

    if (BigInt(gameId) >= gameCounter) {
      console.log(`❌ Game ID ${gameId} does not exist yet (counter is at ${gameCounter})`);
      return;
    }

    // Get game state
    const game = await contract.getGame(gameId);
    const [player1, player2, status, p1Committed, p2Committed, resultsDecrypted] = game;

    console.log(`✅ Game ${gameId} exists:\n`);
    console.log(`👤 Player 1: ${player1}`);
    console.log(`👤 Player 2: ${player2 === ethers.ZeroAddress ? "❌ Not joined yet" : player2}`);
    console.log(`📊 Status: ${status} (${STATUS_NAMES[status]})`);
    console.log(`✅ Player 1 Committed: ${p1Committed}`);
    console.log(`✅ Player 2 Committed: ${p2Committed}`);
    console.log(`🔓 Results Decrypted: ${resultsDecrypted}\n`);

    // Validation checks
    console.log(`🔍 Validation Checks:`);
    
    if (player2 === ethers.ZeroAddress) {
      console.log(`⚠️  Game is waiting for Player 2 to join`);
    }
    
    if (status === 0) {
      console.log(`⚠️  Game status is WaitingForPlayers - moves cannot be submitted yet`);
    } else if (status === 1) {
      console.log(`✅ Game is ready for moves (WaitingForMoves)`);
    } else if (status === 2) {
      console.log(`✅ Both moves committed - ready for resolution`);
    } else if (status === 3) {
      console.log(`⏳ Decryption in progress`);
    } else if (status === 4) {
      console.log(`🏁 Game completed - results decrypted`);
    }

    if (p1Committed) {
      console.log(`✅ Player 1 has already submitted their move`);
    }
    
    if (p2Committed) {
      console.log(`✅ Player 2 has already submitted their move`);
    }

  } catch (error) {
    console.error(`❌ Error reading game state:`, error);
    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);
    }
  }
}

// Get game ID from command line args
const gameId = process.argv[2];

if (!gameId) {
  console.log(`Usage: npx ts-node scripts/checkGameState.ts <gameId>`);
  console.log(`Example: npx ts-node scripts/checkGameState.ts 0`);
  process.exit(1);
}

checkGameState(parseInt(gameId));

