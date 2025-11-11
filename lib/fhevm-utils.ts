/**
 * Utility functions for interacting with fhEVM v0.9
 * This file contains helpers for encrypting inputs and interacting with the smart contract
 * Compliant with Zama FHEVM v0.9 documentation and best practices
 */

// Debug logging function - will be set by the main component
let debugLogger: ((level: 'info' | 'success' | 'warning' | 'error' | 'debug', category: 'fhevm' | 'game' | 'blockchain' | 'ui', message: string, data?: any) => void) | null = null

export function setDebugLogger(logger: typeof debugLogger) {
  debugLogger = logger
}

function log(level: 'info' | 'success' | 'warning' | 'error' | 'debug', category: 'fhevm' | 'game' | 'blockchain' | 'ui', message: string, data?: any) {
  if (debugLogger) {
    debugLogger(level, category, message, data)
  }
  // Only log important messages to console to reduce noise
  if (level === 'error' || level === 'success' || message.includes('encryption completed') || message.includes('Game state changed')) {
    console.log(`[${level.toUpperCase()}] [${category}] ${message}`, data || '')
  }
}

// Helper function to convert Uint8Array to hex string
function toHex(uint8Array: Uint8Array): string {
  return '0x' + Array.from(uint8Array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Environment configuration for FHEVM v0.9 - TEMPORARILY HARDCODED FOR TESTING
const FHEVM_CONFIG = {
  chainId: 11155111, // Sepolia
  relayerUrl: "https://relayer.testnet.zama.cloud",
  rpcUrl: "https://eth-sepolia.g.alchemy.com/v2/RSaO0kH_yHZrcI8-GfcF4YOT3t4bSDpQ",
  contractAddress: "0x9434AAd18aF442E560C01632798Cf5f8141b2212"
};

// DEBUG: Log the FHEVM configuration
console.log("[DEBUG] FHEVM Environment variables:");
console.log("  - NEXT_PUBLIC_CONTRACT_ADDRESS:", process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);
console.log("  - NEXT_PUBLIC_FHEVM_RELAYER_URL:", process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL);
console.log("  - NEXT_PUBLIC_SEPOLIA_RPC_URL:", process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL);
console.log("[DEBUG] FHEVM_CONFIG:", FHEVM_CONFIG);

// Global state for SDK initialization
let sdkInitialized = false;
// Removed global fhevmInstance - always create fresh instances

export type Move = 0 | 1 | 2 // 0 = Rock, 1 = Paper, 2 = Scissors

export const MOVE_NAMES: Record<Move, string> = {
  0: "Rock",
  1: "Paper",
  2: "Scissors",
}

/**
 * Determine the winner of a rock paper scissors game
 * @param move1 Player 1's move
 * @param move2 Player 2's move
 * @returns 'player1' | 'player2' | 'draw'
 */
export function determineWinner(move1: Move, move2: Move): "player1" | "player2" | "draw" {
  if (move1 === move2) return "draw"

  // Rock beats Scissors, Paper beats Rock, Scissors beats Paper
  if ((move1 === 0 && move2 === 2) || (move1 === 1 && move2 === 0) || (move1 === 2 && move2 === 1)) {
    return "player1"
  }

  return "player2"
}

/**
 * Convert move name to move value
 */
export function moveNameToValue(name: string): Move {
  const normalized = name.toLowerCase()
  if (normalized === "rock") return 0
  if (normalized === "paper") return 1
  if (normalized === "scissors") return 2
  throw new Error(`Invalid move name: ${name}`)
}

/**
 * Initialize FHEVM SDK for v0.9
 * Creates a fresh instance for encryption operations
 */
async function initializeFHEVM(): Promise<any> {
  try {
    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error("FHEVM requires browser environment");
    }

    log('info', 'fhevm', 'Initializing FHEVM SDK v0.9...');
    console.log("[FHEVM v0.9] Initializing SDK...");

    // Dynamic import to avoid SSR issues
    const { createInstance } = await import("@zama-fhe/relayer-sdk/web");

    // For v0.9, create configuration with required contract addresses
    // Property names from FhevmInstanceConfig type definition in @zama-fhe/relayer-sdk
    const config = {
      chainId: FHEVM_CONFIG.chainId,
      network: typeof window !== 'undefined' && (window as any).ethereum
        ? (window as any).ethereum
        : FHEVM_CONFIG.rpcUrl,
      relayerUrl: FHEVM_CONFIG.relayerUrl,
      // FHEVM v0.9 Sepolia contract addresses (from official Zama docs)
      kmsContractAddress: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC",
      aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
      inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
      verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
      verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
      gatewayChainId: FHEVM_CONFIG.chainId, // Same as chainId for Sepolia
    };

    console.log("[FHEVM v0.9] Configuration:", config);
    console.log("[DEBUG] Relayer endpoint:", FHEVM_CONFIG.relayerUrl);

    // Create fresh FHEVM instance with config
    const fhevmInstance = await createInstance(config);
    log('success', 'fhevm', 'FHEVM v0.9 instance created', { config: config.chainId, relayerUrl: config.relayerUrl });
    console.log("[FHEVM v0.9] Instance created successfully");

    return fhevmInstance;
  } catch (error) {
    console.error("[FHEVM v0.9] Initialization failed:", error);
    throw new Error(`FHEVM initialization failed: ${error}`);
  }
}

/**
 * Encrypt move using @zama-fhe/relayer-sdk v0.9
 */
export async function encryptMove(move: Move, contractAddress: string, userAddress: string) {
  try {
    log('info', 'fhevm', `Encrypting move ${move} (${MOVE_NAMES[move]})`, { move, contractAddress, userAddress });
    console.log(`[FHEVM v0.9] Encrypting move ${move} for contract ${contractAddress}`);
    console.log(`[DEBUG] User address: ${userAddress}`);
    console.log(`[DEBUG] Contract address: ${contractAddress}`);

    // Validate contract address format
    if (!contractAddress || !contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      throw new Error(`Invalid contract address format: ${contractAddress}`);
    }

    // Get fresh FHEVM instance
    const instance = await initializeFHEVM();
    log('success', 'fhevm', 'FHEVM instance created');
    console.log(`[DEBUG] FHEVM v0.9 instance created successfully`);

    // Create encrypted input for the move
    const encryptedInput = instance.createEncryptedInput(contractAddress, userAddress);
    log('info', 'fhevm', 'Encrypted input created');
    console.log(`[DEBUG] Encrypted input created`);

    // Add the move (0, 1, or 2) as an 8-bit encrypted value
    encryptedInput.add8(move);
    log('info', 'fhevm', `Move ${move} (${MOVE_NAMES[move]}) added to encrypted input`);
    console.log(`[DEBUG] Move ${move} added to encrypted input`);

    // Encrypt and get the result
    log('info', 'fhevm', 'Starting encryption process...');
    console.log(`[DEBUG] Starting encryption process...`);
    const encryptionResult = await encryptedInput.encrypt();
    log('success', 'fhevm', 'Encryption completed successfully');
    console.log(`[DEBUG] Encryption completed successfully`);

    // Enhanced debugging for ZK proof validation
    console.log(`[DEBUG] Proof generated:`, encryptionResult.inputProof ? "✅ Valid" : "❌ Missing");
    console.log(`[DEBUG] Handles count:`, encryptionResult.handles?.length || 0);

    // Validate proof exists (critical for relayer acceptance)
    if (!encryptionResult.inputProof) {
      throw new Error("ZK proof generation failed - proof is undefined");
    }

    if (!encryptionResult.handles || encryptionResult.handles.length === 0) {
      throw new Error("Encryption handles missing - encryption failed");
    }

    // Get first ciphertext handle and convert Uint8Array to hex string
    const handle = encryptionResult.handles[0];
    console.log(`[DEBUG] Handle type:`, typeof handle);
    console.log(`[DEBUG] Handle value:`, handle);

    // Convert Uint8Array to proper hex string for Viem
    const ciphertext = toHex(handle);

    log('success', 'fhevm', 'Ciphertext extracted successfully', { ciphertext: ciphertext.substring(0, 20) + '...' });
    console.log(`[DEBUG] Ciphertext extracted: ✅ Valid`);
    console.log(`[DEBUG] Ciphertext type:`, typeof ciphertext);
    console.log(`[DEBUG] Ciphertext hex:`, ciphertext);

    if (!ciphertext) {
      throw new Error("Ciphertext generation failed - no ciphertext produced");
    }

    // Convert proof from Uint8Array to hex string as well
    const proof = toHex(encryptionResult.inputProof);
    log('success', 'fhevm', 'Proof converted to hex', { proof: proof.substring(0, 20) + '...' });
    console.log(`[DEBUG] Proof converted to hex:`, proof);

    log('success', 'fhevm', `Move ${move} (${MOVE_NAMES[move]}) encrypted with valid ZK proof and ciphertext`);
    console.log(`[FHEVM v0.9] Successfully encrypted move ${move} with valid ZK proof and ciphertext`);

    // Return both ciphertext and proof for contract calls (both as hex strings)
    return {
      ciphertext: ciphertext,
      proof: proof
    };
  } catch (error) {
    log('error', 'fhevm', 'Encryption failed', { error: error instanceof Error ? error.message : String(error) });
    console.error("[FHEVM v0.9] Encryption failed:", error);
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error(`[DEBUG] Error message: ${error.message}`);
      console.error(`[DEBUG] Error stack: ${error.stack}`);
      
      // Check for specific relayer errors
      if (error.message.includes("Transaction rejected")) {
        log('error', 'fhevm', 'Relayer rejection detected - possible causes: contract compatibility, authorization, relayer issues, or network problems');
        console.error(`[DEBUG] Relayer rejection detected`);
        console.error(`[DEBUG] This could be due to:`);
        console.error(`[DEBUG] 1. Contract not compatible with current FHEVM version`);
        console.error(`[DEBUG] 2. User not authorized for this contract`);
        console.error(`[DEBUG] 3. Relayer service issues`);
        console.error(`[DEBUG] 4. Network/RPC connectivity problems`);
      }
    }
    
    throw new Error(`FHE encryption failed: ${error}`);
  }
}

/**
 * Decrypt result using @zama-fhe/relayer-sdk v0.9
 */
export async function decryptResult(
  encryptedResult: any,
  contractAddress: string,
  userAddress: string
): Promise<boolean> {
  try {
    console.log(`[FHEVM v0.9] Decrypting result for contract ${contractAddress}`);

    // Get FHEVM instance
    const instance = await initializeFHEVM();

    // Create decryption request for v0.9
    const decryptionRequest = instance.createDecryptionRequest(contractAddress, userAddress);
    decryptionRequest.addBytes32(encryptedResult);

    // Decrypt the result
    const decryptedResults = await decryptionRequest.decrypt();

    // Extract the boolean result
    const resultValue = decryptedResults[0];

    console.log(`[FHEVM v0.9] Successfully decrypted result: ${resultValue}`);

    return resultValue === "true" || resultValue === true || resultValue === 1;
  } catch (error) {
    console.error("[FHEVM v0.9] Decryption failed:", error);
    throw new Error(`FHE decryption failed: ${error}`);
  }
}

/**
 * Get encrypted result from contract and decrypt it
 */
export async function getGameResult(
  gameId: number,
  contractAddress: string,
  userAddress: string,
  contractInstance: any
): Promise<{ isDraw: boolean; player1Wins: boolean }> {
  try {
    // Get encrypted results from contract
    const [isDrawEncrypted, player1WinsEncrypted] = await contractInstance.getEncryptedResult(gameId)
    
    // Decrypt both results
    const [isDraw, player1Wins] = await Promise.all([
      decryptResult(isDrawEncrypted, contractAddress, userAddress),
      decryptResult(player1WinsEncrypted, contractAddress, userAddress)
    ])
    
    return { isDraw, player1Wins }
  } catch (error) {
    console.error("Failed to get game result:", error)
    throw error
  }
}