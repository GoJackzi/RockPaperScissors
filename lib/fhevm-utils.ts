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
    const { Relayer } = await import("@zama-fhe/relayer-sdk/web")
    
    console.log(`[fhEVM] Encrypting move ${move} for contract ${contractAddress}`)
    
    // Initialize the relayer with proper Sepolia configuration
    const relayer = new Relayer({
      contractAddress,
      userAddress,
      network: "sepolia",
      relayerUrl: process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || "https://relayer.testnet.zama.cloud",
      // Complete FHEVM v0.8 Sepolia contract addresses
      aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
      kmsContractAddress: "0x848B0066793BcC60346Da1F49049357399B8D595",
      inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
      verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
      verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
      // Additional required addresses
      hcuLimitContractAddress: "0x594BB474275918AF9609814E68C61B1587c5F838",
      decryptionOracleContractAddress: "0xa02Cda4Ca3a71D7C46997716F4283aa851C28812"
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
    const { Relayer } = await import("@zama-fhe/relayer-sdk/web")
    
    console.log(`[fhEVM] Decrypting result for contract ${contractAddress}`)
    
    const relayer = new Relayer({
      contractAddress,
      userAddress,
      network: "sepolia",
      relayerUrl: process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || "https://relayer.testnet.zama.cloud",
      // Complete FHEVM v0.8 Sepolia contract addresses
      aclContractAddress: "0x687820221192C5B662b25367F70076A37bc79b6c",
      kmsContractAddress: "0x848B0066793BcC60346Da1F49049357399B8D595",
      inputVerifierContractAddress: "0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4",
      verifyingContractAddressDecryption: "0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1",
      verifyingContractAddressInputVerification: "0x7048C39f048125eDa9d678AEbaDfB22F7900a29F",
      // Additional required addresses
      hcuLimitContractAddress: "0x594BB474275918AF9609814E68C61B1587c5F838",
      decryptionOracleContractAddress: "0xa02Cda4Ca3a71D7C46997716F4283aa851C28812"
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
