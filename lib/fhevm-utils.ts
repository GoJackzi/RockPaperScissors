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

// Cache the FHEVM instance to avoid recreating it on every encryption
let cachedFhevmInstance: any = null;
let sdkInitialized = false;

/**
 * Initialize FHEVM SDK for v0.9
 * Creates and caches a single instance for encryption operations
 */
async function initializeFHEVM(): Promise<any> {
  try {
    // Return cached instance if available
    if (cachedFhevmInstance) {
      console.log("[FHEVM v0.9] Using cached instance");
      return cachedFhevmInstance;
    }

    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error("FHEVM requires browser environment");
    }

    log('info', 'fhevm', 'Initializing FHEVM SDK v0.9...');
    console.log("[FHEVM v0.9] Initializing SDK...");

    // Dynamic import to avoid SSR issues
    // Import from /web (not /bundle) for Next.js compatibility
    const { initSDK, createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");

    // CRITICAL: Must call initSDK() first to load WASM before creating instance
    // Reference: https://docs.zama.org/protocol/relayer-sdk-guides/v0.1/development-guide/webapp
    if (!sdkInitialized) {
      console.log("[FHEVM v0.9] Loading WASM with initSDK()...");
      await initSDK();
      sdkInitialized = true;
      console.log("[FHEVM v0.9] WASM loaded successfully");
    }

    // Use SepoliaConfig directly from the SDK (recommended approach)
    // Add network provider from window.ethereum
    const config = {
      ...SepoliaConfig,
      network: (window as any).ethereum
    };
    console.log("[FHEVM v0.9] Using SepoliaConfig from SDK");
    console.log("[DEBUG] Config:", config);

    // Create FHEVM instance with SepoliaConfig and cache it
    cachedFhevmInstance = await createInstance(config);
    log('success', 'fhevm', 'FHEVM v0.9 instance created with SepoliaConfig');
    console.log("[FHEVM v0.9] Instance created and cached successfully");

    return cachedFhevmInstance;
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
 * Decrypt result using @zama-fhe/relayer-sdk v0.3.x publicDecrypt (Self-Relaying)
 */
export async function getGameResult(
  gameId: number,
  contractAddress: string,
  userAddress: string,
  contractInstance: any
): Promise<{ isDraw: boolean; player1Wins: boolean; decryptionProof: string }> {
  try {
    console.log(`[FHEVM v0.10] Fetching encrypted results for game ${gameId}`);

    // Get FHEVM instance
    const instance = await initializeFHEVM();

    // Get encrypted handle(s) from contract
    // The contract returns (ebool, ebool) which are effectively handles (or uint256/bytes32)
    // We need them as hex strings or Uint8Arrays
    const [handle1, handle2] = await contractInstance.getEncryptedResult(gameId);

    console.log("[DEBUG] Raw handles from contract:", handle1, handle2);

    // handles are likely returned as BigInt or hex strings. SDK expects string (hex) or Uint8Array.
    // Ensure they are properly formatted. 
    // Usually contract calls via Viem/Wagmi return BigInt for uint256.
    // ebool is uint256 under the hood (or uint8/bool depending on packing).
    // FHEVM handles are generally uint256. 

    // Convert BigInt to 32-byte hex string
    const toHandle = (val: any) => {
      const hex = val.toString(16);
      return '0x' + hex.padStart(64, '0'); // Pad to 32 bytes (64 hex chars)
    };

    const h1 = toHandle(handle1);
    const h2 = toHandle(handle2);

    console.log("[DEBUG] Formatted handles:", h1, h2);

    // Call publicDecrypt from SDK
    // This will prompt the user to sign EIP-712 request if needed (or Relayer logic)
    // "publicDecrypt" is correct for "decrypt this for me" in the self-relaying model where the user provides the proof.
    const result = await instance.publicDecrypt([h1, h2]);

    console.log("[FHEVM v0.10] publicDecrypt result:", result);

    // result.clearValues is an object keyed by handle hex? No, generally an array?
    // SDK types said `ClearValues` but return type is `PublicDecryptResults`.
    // Let's assume result.clearValues is a map or simply result handles mapping.
    // Actually, looking at docs: `publicDecrypt` returns object with `clearValues` map? 
    // Or just array of values?
    // Current SDK v0.3.0-8 types: `publicDecrypt(handles: ...): Promise<PublicDecryptResults>`.
    // PublicDecryptResults = { clearValues: Record<string, ClearValueType>, decryptionProof: string, ... }

    // Extract values
    const isDrawVal = result.clearValues[h1];
    const player1WinsVal = result.clearValues[h2];

    // Values might be numbers/bigints/bools. 
    // For ebool, we expect boolean or 0/1.
    const isDraw = isDrawVal === true || isDrawVal === 1 || isDrawVal === 1n;
    const player1Wins = player1WinsVal === true || player1WinsVal === 1 || player1WinsVal === 1n;

    if (isDrawVal === undefined || player1WinsVal === undefined) {
      throw new Error("Failed to decrypt one or more handles");
    }

    return {
      isDraw,
      player1Wins,
      decryptionProof: result.decryptionProof // This is the proof we need to send to contract
    };
  } catch (error) {
    console.error("[FHEVM v0.10] Decryption failed:", error);
    throw new Error(`FHE decryption failed: ${error}`);
  }
}

// Remove the old simple decryptResult which is no longer sufficient
export async function decryptResult(
  encryptedResult: any,
  contractAddress: string,
  userAddress: string
): Promise<boolean> {
  throw new Error("Deprecated function: use getGameResult for self-relaying decryption");
}