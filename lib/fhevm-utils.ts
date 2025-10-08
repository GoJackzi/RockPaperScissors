/**
 * Utility functions for interacting with fhEVM
 * This file contains helpers for encrypting inputs and interacting with the smart contract
 */

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
 * Encrypt move using @zama-fhe/relayer-sdk with browser compatibility
 */
export async function encryptMove(move: Move, contractAddress: string, userAddress: string) {
  try {
    // Ensure global is defined for browser environment
    if (typeof window !== 'undefined' && typeof global === 'undefined') {
      (window as any).global = window
    }
    
    console.log(`[fhEVM] Encrypting move ${move} for contract ${contractAddress}`)
    
    // Import the correct SDK functions
    const { createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web")
    
    // Create FHEVM instance with Sepolia configuration
    const fhevmInstance = await createInstance({
      ...SepoliaConfig,
      relayerUrl: process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || "https://relayer.testnet.zama.cloud"
    })
    
    // Create encrypted input for the move
    const encryptedInput = fhevmInstance.createEncryptedInput(contractAddress, userAddress)
    
    // Add the move (0, 1, or 2) as an 8-bit encrypted value
    encryptedInput.add8(move)
    
    // Encrypt and get the result
    const encryptionResult = await encryptedInput.encrypt()
    
    console.log(`[fhEVM] Successfully encrypted move ${move}`)
    
    // Return the first handle and proof (since we only encrypted one value)
    return {
      handle: encryptionResult.handles[0],
      proof: encryptionResult.inputProof,
    }
  } catch (error) {
    console.error("Failed to encrypt with fhEVM:", error)
    throw new Error(`FHE encryption failed: ${error}`)
  }
}

/**
 * Decrypt result using @zama-fhe/relayer-sdk
 */
export async function decryptResult(
  encryptedResult: any, 
  contractAddress: string, 
  userAddress: string
): Promise<boolean> {
  try {
    // Ensure global is defined for browser environment
    if (typeof window !== 'undefined' && typeof global === 'undefined') {
      (window as any).global = window
    }
    
    console.log(`[fhEVM] Decrypting result for contract ${contractAddress}`)
    
    // Import the correct SDK functions
    const { createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web")
    
    // Create FHEVM instance with Sepolia configuration
    const fhevmInstance = await createInstance({
      ...SepoliaConfig,
      relayerUrl: process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || "https://relayer.testnet.zama.cloud"
    })
    
    // Use public decrypt for game results (no user signature needed for public results)
    const decryptedResults = await fhevmInstance.publicDecrypt([encryptedResult])
    
    // Extract the boolean result (assuming it's the first and only result)
    const resultValue = Object.values(decryptedResults)[0]
    
    console.log(`[fhEVM] Successfully decrypted result: ${resultValue}`)
    
    return resultValue === "true" || resultValue === true || resultValue === 1
  } catch (error) {
    console.error("Failed to decrypt with fhEVM:", error)
    throw new Error(`FHE decryption failed: ${error}`)
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
