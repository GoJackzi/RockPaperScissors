/**
 * Utility functions for interacting with fhEVM v0.8.1
 * This file contains helpers for encrypting inputs and interacting with the smart contract
 * Compliant with Zama FHEVM v0.8.1 documentation and best practices
 */

// Environment configuration for FHEVM v0.8.1
const FHEVM_CONFIG = {
  chainId: 11155111, // Sepolia
  relayerUrl: process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || "https://relayer.testnet.zama.cloud",
  rpcUrl: process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0C2029036D53B763DFc9e7AADB2A43a911b7a7E5"
};

// Global state for SDK initialization
let sdkInitialized = false;
let fhevmInstance: any = null;

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
 * Initialize FHEVM SDK for v0.8.1 compliance
 */
async function initializeFHEVM(): Promise<any> {
  if (fhevmInstance) return fhevmInstance;

  try {
    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error("FHEVM requires browser environment");
    }

    console.log("[FHEVM v0.8.1] Initializing SDK...");

    // Dynamic import to avoid SSR issues
    const { createInstance, initSDK, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");

    // Initialize SDK first (required for v0.8.1)
    if (!sdkInitialized) {
      await initSDK();
      sdkInitialized = true;
      console.log("[FHEVM v0.8.1] SDK initialized successfully");
    }

    // Try using SepoliaConfig if it's available, otherwise fall back to custom config
    let config;
    
    if (SepoliaConfig) {
      console.log("[FHEVM v0.8.1] Using SepoliaConfig");
      console.log("[DEBUG] SepoliaConfig contents:", SepoliaConfig);
      
      // SepoliaConfig is likely an object, not a constructor
      config = {
        ...SepoliaConfig,
        network: typeof window !== 'undefined' && (window as any).ethereum
          ? (window as any).ethereum
          : FHEVM_CONFIG.rpcUrl,
        relayerUrl: FHEVM_CONFIG.relayerUrl,
      };
      
      console.log("[DEBUG] Final config:", config);
    } else {
      console.log("[FHEVM v0.8.1] Using custom configuration");
      // Create custom configuration for v0.8.1 compliance with all required contract addresses
      config = {
        chainId: FHEVM_CONFIG.chainId,
        network: typeof window !== 'undefined' && (window as any).ethereum
          ? (window as any).ethereum
          : FHEVM_CONFIG.rpcUrl,
        relayerUrl: FHEVM_CONFIG.relayerUrl,
        gatewayUrl: FHEVM_CONFIG.relayerUrl,
        // FHEVM Sepolia contract addresses (from Zama docs) - try different parameter names
        fhevmExecutor: "0x848B0066793BcC60346Da1F49049357399B8D595",
        acl: "0x687820221192C5B662b25367F70076A37bc79b6c",
        hcuLimit: "0x594BB474275918AF9609814E68C61B1587c5F838",
        kms: "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC", // Try 'kms' instead of 'kmsVerifierContract'
        inputVerifier: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
        decryptionOracle: "0xa02Cda4Ca3a71D7C46997716F4283aa851C28812",
        decryptionAddress: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
        inputVerificationAddress: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
      };
    }

    // Create FHEVM instance with config
    fhevmInstance = await createInstance(config);
    console.log("[FHEVM v0.8.1] Instance created successfully");

    return fhevmInstance;
  } catch (error) {
    console.error("[FHEVM v0.8.1] Initialization failed:", error);
    throw new Error(`FHEVM initialization failed: ${error}`);
  }
}

/**
 * Encrypt move using @zama-fhe/relayer-sdk v0.8.1
 */
export async function encryptMove(move: Move, contractAddress: string, userAddress: string) {
  try {
    console.log(`[FHEVM v0.8.1] Encrypting move ${move} for contract ${contractAddress}`);
    console.log(`[DEBUG] User address: ${userAddress}`);
    console.log(`[DEBUG] Contract address: ${contractAddress}`);
    
    // Get FHEVM instance
    const instance = await initializeFHEVM();
    console.log(`[DEBUG] FHEVM instance created successfully`);
    
    // Create encrypted input for the move
    const encryptedInput = instance.createEncryptedInput(contractAddress, userAddress);
    console.log(`[DEBUG] Encrypted input created`);
    
    // Add the move (0, 1, or 2) as an 8-bit encrypted value
    encryptedInput.add8(move);
    console.log(`[DEBUG] Move ${move} added to encrypted input`);
    
    // Encrypt and get the result
    console.log(`[DEBUG] Starting encryption process...`);
    const encryptionResult = await encryptedInput.encrypt();
    console.log(`[DEBUG] Encryption completed successfully`);
    
    console.log(`[FHEVM v0.8.1] Successfully encrypted move ${move}`);
    
    // Return the expected format for v0.8.1
    return {
      handle: encryptionResult.handles[0],
      proof: encryptionResult.inputProof,
    };
  } catch (error) {
    console.error("[FHEVM v0.8.1] Encryption failed:", error);
    
    // Enhanced error logging for debugging
    if (error instanceof Error) {
      console.error(`[DEBUG] Error message: ${error.message}`);
      console.error(`[DEBUG] Error stack: ${error.stack}`);
      
      // Check for specific relayer errors
      if (error.message.includes("Transaction rejected")) {
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
 * Decrypt result using @zama-fhe/relayer-sdk v0.8.1
 */
export async function decryptResult(
  encryptedResult: any, 
  contractAddress: string, 
  userAddress: string
): Promise<boolean> {
  try {
    console.log(`[FHEVM v0.8.1] Decrypting result for contract ${contractAddress}`);
    
    // Get FHEVM instance
    const instance = await initializeFHEVM();
    
    // Create decryption request for v0.8.1
    const decryptionRequest = instance.createDecryptionRequest(contractAddress, userAddress);
    decryptionRequest.addBytes32(encryptedResult);
    
    // Decrypt the result
    const decryptedResults = await decryptionRequest.decrypt();
    
    // Extract the boolean result
    const resultValue = decryptedResults[0];
    
    console.log(`[FHEVM v0.8.1] Successfully decrypted result: ${resultValue}`);
    
    return resultValue === "true" || resultValue === true || resultValue === 1;
  } catch (error) {
    console.error("[FHEVM v0.8.1] Decryption failed:", error);
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