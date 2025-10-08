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
 * Placeholder for fhEVM encryption
 * In production, this would use the fhEVM SDK to encrypt the move
 */
export async function encryptMove(move: Move, contractAddress: string, userAddress: string) {
  // This is a placeholder. In production, you would use:
  // const fhevmInstance = await createFhevmInstance({ contractAddress, userAddress })
  // const encryptedMove = await fhevmInstance.encrypt8(move)
  // return encryptedMove

  console.log(`[fhEVM] Encrypting move ${move} for contract ${contractAddress}`)

  return {
    handle: `0x${move.toString().padStart(64, "0")}`,
    proof: "0x" + "00".repeat(32), // Placeholder proof
  }
}
