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
    
    // Monitor network activity during initialization
    const networkMonitor = {
      requests: [] as Array<{url: string, startTime: number, endTime?: number, status?: string, error?: string}>,
      startTime: Date.now()
    }
    
    // Monitor WASM loading
    const wasmMonitor = {
      loaded: [] as string[],
      failed: [] as string[]
    }
    
    // Hook into WebAssembly loading
    const originalWebAssembly = window.WebAssembly
    if (originalWebAssembly && originalWebAssembly.instantiate) {
      const originalInstantiate = originalWebAssembly.instantiate
      window.WebAssembly.instantiate = function(bufferSource, importObject) {
        console.log(`[fhEVM] WASM instantiate called with buffer size: ${bufferSource.byteLength} bytes`)
        return originalInstantiate.call(this, bufferSource, importObject)
          .then(result => {
            console.log(`[fhEVM] WASM instantiate successful`)
            return result
          })
          .catch(error => {
            console.error(`[fhEVM] WASM instantiate failed:`, error)
            wasmMonitor.failed.push(`instantiate: ${error.message}`)
            throw error
          })
      }
    }
    
    // Hook into fetch to monitor network requests
    const originalFetch = window.fetch
    window.fetch = function(...args) {
      const startTime = Date.now()
      const url = typeof args[0] === 'string' ? args[0] : args[0].url
      console.log(`[fhEVM] Network request started: ${url}`)
      
      const request = {
        url,
        startTime,
        endTime: undefined,
        status: undefined,
        error: undefined
      }
      networkMonitor.requests.push(request)
      
      return originalFetch.apply(this, args)
        .then(response => {
          request.endTime = Date.now()
          request.status = response.status.toString()
          console.log(`[fhEVM] Network request completed: ${url} - Status: ${response.status} (${request.endTime - startTime}ms)`)
          return response
        })
        .catch(error => {
          request.endTime = Date.now()
          request.error = error.message
          console.error(`[fhEVM] Network request failed: ${url} - Error: ${error.message} (${request.endTime - startTime}ms)`)
          throw error
        })
    }
    
    // Try multiple initialization strategies
    let initSuccess = false
    let lastError: Error | null = null
    
    // Strategy 1: Normal initialization with timeout
    try {
      console.log(`[fhEVM] Attempting normal initialization...`)
      const initStartTime = Date.now()
      
      // Start periodic status updates
      const statusInterval = setInterval(() => {
        const elapsed = Date.now() - initStartTime
        const networkCount = networkMonitor.requests.length
        const wasmCount = wasmMonitor.loaded.length + wasmMonitor.failed.length
        console.log(`[fhEVM] Status update after ${elapsed}ms: ${networkCount} network requests, ${wasmCount} WASM operations`)
      }, 3000) // Every 3 seconds
      
      const initPromise = initSDK()
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          clearInterval(statusInterval)
          const elapsed = Date.now() - initStartTime
          console.log(`[fhEVM] Init timeout after ${elapsed}ms. Network requests made:`, networkMonitor.requests.length)
          reject(new Error("SDK initialization timeout after 15 seconds"))
        }, 15000)
      )
      
      await Promise.race([initPromise, timeoutPromise])
      clearInterval(statusInterval)
      initSuccess = true
      console.log(`[fhEVM] SDK initialized successfully with normal method`)
    } catch (error) {
      lastError = error as Error
      console.warn(`[fhEVM] Normal initialization failed:`, error)
    }
    
    // Strategy 2: Retry with longer timeout if first attempt failed
    if (!initSuccess) {
      try {
        console.log(`[fhEVM] Attempting initialization with longer timeout...`)
        const initPromise = initSDK()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("SDK initialization timeout after 30 seconds")), 30000)
        )
        await Promise.race([initPromise, timeoutPromise])
        initSuccess = true
        console.log(`[fhEVM] SDK initialized successfully with retry method`)
      } catch (error) {
        lastError = error as Error
        console.warn(`[fhEVM] Retry initialization failed:`, error)
      }
    }
    
    if (!initSuccess) {
      // Restore original fetch
      window.fetch = originalFetch
      
      // Log comprehensive network summary
      const totalTime = Date.now() - networkMonitor.startTime
      console.error(`[fhEVM] SDK initialization failed after ${totalTime}ms`)
      console.error(`[fhEVM] Network activity summary:`)
      console.error(`[fhEVM] - Total requests made: ${networkMonitor.requests.length}`)
      console.error(`[fhEVM] - Successful requests: ${networkMonitor.requests.filter(r => r.status && !r.error).length}`)
      console.error(`[fhEVM] - Failed requests: ${networkMonitor.requests.filter(r => r.error).length}`)
      console.error(`[fhEVM] - Pending requests: ${networkMonitor.requests.filter(r => !r.endTime).length}`)
      
      if (networkMonitor.requests.length > 0) {
        console.error(`[fhEVM] Request details:`)
        networkMonitor.requests.forEach((req, index) => {
          const duration = req.endTime ? req.endTime - req.startTime : Date.now() - req.startTime
          const status = req.status || req.error || 'PENDING'
          console.error(`[fhEVM]   ${index + 1}. ${req.url} - ${status} (${duration}ms)`)
        })
      } else {
        console.error(`[fhEVM] No network requests were made during initialization - likely WASM loading issue`)
      }
      
      // Log WASM activity
      console.error(`[fhEVM] WASM activity:`)
      console.error(`[fhEVM] - WASM instantiate calls: ${wasmMonitor.loaded.length + wasmMonitor.failed.length}`)
      console.error(`[fhEVM] - Successful: ${wasmMonitor.loaded.length}`)
      console.error(`[fhEVM] - Failed: ${wasmMonitor.failed.length}`)
      if (wasmMonitor.failed.length > 0) {
        console.error(`[fhEVM] WASM failures:`, wasmMonitor.failed)
      }
      
      throw new Error(`FHEVM SDK initialization failed after multiple attempts: ${lastError?.message}`)
    }
    
    // Restore original fetch
    window.fetch = originalFetch
    
    // Log successful network summary
    const totalTime = Date.now() - networkMonitor.startTime
    console.log(`[fhEVM] SDK initialization successful after ${totalTime}ms`)
    console.log(`[fhEVM] Network requests made: ${networkMonitor.requests.length}`)
    if (networkMonitor.requests.length > 0) {
      console.log(`[fhEVM] Request summary:`)
      networkMonitor.requests.forEach((req, index) => {
        const duration = req.endTime ? req.endTime - req.startTime : 'PENDING'
        const status = req.status || req.error || 'PENDING'
        console.log(`[fhEVM]   ${index + 1}. ${req.url} - ${status} (${duration}ms)`)
      })
    }
    
    console.log(`[fhEVM] Creating FHEVM instance...`)
    
    // Create FHEVM instance with custom configuration (no SepoliaConfig)
    let relayerUrl = process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL || "https://relayer.testnet.zama.cloud"
    const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com"
    console.log(`[fhEVM] Environment check:`)
    console.log(`[fhEVM] - NEXT_PUBLIC_SEPOLIA_RPC_URL: ${process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL}`)
    console.log(`[fhEVM] - NEXT_PUBLIC_FHEVM_RELAYER_URL: ${process.env.NEXT_PUBLIC_FHEVM_RELAYER_URL}`)
    console.log(`[fhEVM] Using relayer URL: ${relayerUrl}`)
    console.log(`[fhEVM] Using RPC URL: ${rpcUrl}`)
    
    // Test relayer connectivity first
    console.log(`[fhEVM] Testing relayer connectivity...`)
    let relayerConnected = false
    try {
      const response = await fetch(relayerUrl, { 
        method: 'GET',
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
      console.log(`[fhEVM] Relayer response status: ${response.status}`)
      relayerConnected = response.ok
    } catch (error) {
      console.warn(`[fhEVM] Relayer connectivity failed:`, error)
      // Note: Zama doesn't have mainnet yet, so we only use testnet relayers
      console.log(`[fhEVM] No alternative relayer available (Zama mainnet not launched yet)`)
    }
    
    if (!relayerConnected) {
      console.warn(`[fhEVM] Warning: Primary relayer connectivity failed, but proceeding with FHEVM initialization anyway`)
      console.warn(`[fhEVM] Note: This may cause slower initialization or failures if relayer is unreachable`)
    }
    
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
    
    // Create FHEVM instance with retry logic
    let fhevmInstance = null
    let createSuccess = false
    let createError: Error | null = null
    
    // Try creating instance with different timeouts
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[fhEVM] Creating FHEVM instance (attempt ${attempt}/3)...`)
        const timeoutDuration = attempt === 1 ? 15000 : attempt === 2 ? 25000 : 35000
        const createPromise = createInstance(customConfig)
        const createTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`FHEVM instance creation timeout after ${timeoutDuration/1000} seconds`)), timeoutDuration)
        )
        fhevmInstance = await Promise.race([createPromise, createTimeoutPromise])
        createSuccess = true
        console.log(`[fhEVM] FHEVM instance created successfully on attempt ${attempt}`)
        break
      } catch (error) {
        createError = error as Error
        console.warn(`[fhEVM] Instance creation attempt ${attempt} failed:`, error)
        if (attempt < 3) {
          console.log(`[fhEVM] Retrying instance creation...`)
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds before retry
        }
      }
    }
    
    if (!createSuccess || !fhevmInstance) {
      throw new Error(`FHEVM instance creation failed after multiple attempts: ${createError?.message}`)
    }
    
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