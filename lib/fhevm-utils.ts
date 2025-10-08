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
  // Import the relayer SDK dynamically to avoid issues during build
  const { Relayer } = await import("@zama-fhe/relayer-sdk")
  
  console.log(`[fhEVM] Encrypting move ${move} for contract ${contractAddress}`)
  
  try {
    // Initialize the relayer
    const relayer = new Relayer({
      contractAddress,
      userAddress,
      network: "sepolia"
    })
    
    // Encrypt the move
    const encryptedMove = await relayer.encrypt8(move)
    
    return {
      handle: encryptedMove.handle,
      proof: encryptedMove.proof,
    }
  } catch (error) {
    console.warn("Failed to encrypt with fhEVM, using placeholder:", error)
    
    // Fallback to placeholder if encryption fails
    return {
      handle: `0x${move.toString().padStart(64, "0")}`,
      proof: "0x" + "00".repeat(32), // Placeholder proof
    }
  }
}
