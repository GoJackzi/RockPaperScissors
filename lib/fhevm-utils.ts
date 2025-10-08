/**
 * Utility functions for interacting with fhEVM
 * This file contains helpers for encrypting inputs and interacting with the smart contract
 */

// Dynamic imports to avoid SSR issues

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
    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error("FHEVM encryption requires browser environment")
    }
    
    // Ensure global is defined for browser environment
    if (typeof global === 'undefined') {
      (window as any).global = window
    }
    
    console.log(`[fhEVM] Encrypting move ${move} for contract ${contractAddress}`)
    
    // Dynamic import to avoid SSR issues
    const { initSDK, createInstance } = await import("@zama-fhe/relayer-sdk/web")
    
    console.log(`[fhEVM] Initializing SDK...`)
    // CRITICAL: Initialize WASM modules first
    await initSDK()
    console.log(`[fhEVM] SDK initialized successfully`)
    
    console.log(`[fhEVM] Creating FHEVM instance...`)
    
    // Create FHEVM instance with custom configuration (no SepoliaConfig)
    const relayerUrl = process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || "https://relayer.testnet.zama.cloud"
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
    console.log(`[fhEVM] Environment check:`)
    console.log(`[fhEVM] - NEXT_PUBLIC_SEPOLIA_RPC_URL: ${process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL}`)
    console.log(`[fhEVM] - NEXT_PUBLIC_FHEVM_RELAYER_URL: ${process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL}`)
    console.log(`[fhEVM] Using relayer URL: ${relayerUrl}`)
    console.log(`[fhEVM] Using RPC URL: ${rpcUrl}`)
    
    // Create a completely custom config without SepoliaConfig
    const customConfig = {
      chainId: 11155111, // Sepolia chain ID
      rpcUrl: rpcUrl,
      relayerUrl: relayerUrl,
      gatewayUrl: relayerUrl,
      // Add wallet provider for EIP1193 compatibility
      provider: typeof window !== 'undefined' && (window as any).ethereum ? (window as any).ethereum : rpcUrl,
      // Sepolia-specific contract addresses (from SepoliaConfig)
      aclContractAddress: '0x687820221192C5B662b25367F70076A37bc79b6c',
      kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
      inputVerifierContractAddress: '0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4',
      verifyingContractAddressDecryption: '0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1',
      verifyingContractAddressInputVerification: '0x7048C39f048125eDa9d678AEbaDfB22F7900a29F',
      fhevmExecutorContractAddress: '0x848B0066793BcC60346Da1F49049357399B8D595',
      hcuLimitContractAddress: '0x594BB474275918AF9609814E68C61B1587c5F838',
      decryptionOracleContractAddress: '0xa02Cda4Ca3a71D7C46997716F4283aa851C28812'
    }
    
    console.log(`[fhEVM] Custom config:`, customConfig)
    
    const fhevmInstance = await createInstance(customConfig)
    
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
    // Ensure we're in browser environment
    if (typeof window === 'undefined') {
      throw new Error("FHEVM decryption requires browser environment")
    }
    
    // Ensure global is defined for browser environment
    if (typeof global === 'undefined') {
      (window as any).global = window
    }
    
    console.log(`[fhEVM] Decrypting result for contract ${contractAddress}`)
    
    // Dynamic import to avoid SSR issues
    const { initSDK, createInstance } = await import("@zama-fhe/relayer-sdk/web")
    
    // CRITICAL: Initialize WASM modules first
    await initSDK()
    
    // Create FHEVM instance with custom configuration (no SepoliaConfig)
    const relayerUrl = process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || "https://relayer.testnet.zama.cloud"
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
    
    // Create a completely custom config without SepoliaConfig
    const customConfig = {
      chainId: 11155111, // Sepolia chain ID
      rpcUrl: rpcUrl,
      relayerUrl: relayerUrl,
      gatewayUrl: relayerUrl,
      // Add wallet provider for EIP1193 compatibility
      provider: typeof window !== 'undefined' && (window as any).ethereum ? (window as any).ethereum : rpcUrl,
      // Sepolia-specific contract addresses (from SepoliaConfig)
      aclContractAddress: '0x687820221192C5B662b25367F70076A37bc79b6c',
      kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
      inputVerifierContractAddress: '0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4',
      verifyingContractAddressDecryption: '0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1',
      verifyingContractAddressInputVerification: '0x7048C39f048125eDa9d678AEbaDfB22F7900a29F',
      fhevmExecutorContractAddress: '0x848B0066793BcC60346Da1F49049357399B8D595',
      hcuLimitContractAddress: '0x594BB474275918AF9609814E68C61B1587c5F838',
      decryptionOracleContractAddress: '0xa02Cda4Ca3a71D7C46997716F4283aa851C28812'
    }
    
    const fhevmInstance = await createInstance(customConfig)
    
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