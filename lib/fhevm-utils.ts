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
 * Encrypt move using @zama-fhe/relayer-sdk
 */
export async function encryptMove(move: Move, contractAddress: string, userAddress: string) {
  try {
    // Import the relayer SDK dynamically to avoid issues during build
    const { Relayer } = await import("@zama-fhe/relayer-sdk")
    
    console.log(`[fhEVM] Encrypting move ${move} for contract ${contractAddress}`)
    
    // Initialize the relayer with proper configuration
    const relayer = new Relayer({
      contractAddress,
      userAddress,
      network: "sepolia",
      gatewayUrl: "https://api.zama.ai/fhevm/gateway/sepolia"
    })
    
    // Encrypt the move
    const encryptedMove = await relayer.encrypt8(move)
    
    console.log(`[fhEVM] Successfully encrypted move ${move}`)
    
    return {
      handle: encryptedMove.handle,
      proof: encryptedMove.proof,
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
    const { Relayer } = await import("@zama-fhe/relayer-sdk")
    
    console.log(`[fhEVM] Decrypting result for contract ${contractAddress}`)
    
    const relayer = new Relayer({
      contractAddress,
      userAddress,
      network: "sepolia",
      gatewayUrl: "https://api.zama.ai/fhevm/gateway/sepolia"
    })
    
    // Decrypt the encrypted boolean result
    const decryptedResult = await relayer.decryptBool(encryptedResult)
    
    console.log(`[fhEVM] Successfully decrypted result: ${decryptedResult}`)
    
    return decryptedResult
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
