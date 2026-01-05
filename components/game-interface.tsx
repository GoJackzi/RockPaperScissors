"use client"

import { useState, useEffect } from "react"
import { useAccount, useWriteContract, useReadContract, useConfig, usePublicClient, useWatchContractEvent } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Hand, Scissors, FileText, Wallet, Copy, CheckCircle } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { encryptMove, getGameResult, setDebugLogger } from "@/lib/fhevm-utils"
import { parseEther } from "viem"
import { DebugPanel, useDebugLogs } from "@/components/debug-panel"

type Move = "rock" | "paper" | "scissors" | null
type GameState = "disconnected" | "menu" | "creating" | "joining" | "waiting-for-opponent" | "waiting-for-move" | "submitting-move" | "waiting-for-result" | "completed"

interface Game {
  id: number | null
  player1: string | null
  player2: string | null
  player1Committed: boolean
  player2Committed: boolean
  finished: boolean
  status: number // 0=WaitingForPlayers, 1=WaitingForMoves, 2=MovesCommitted, 3=DecryptionInProgress, 4=ResultsDecrypted
  resultsDecrypted: boolean
}

// Contract configuration - FHEVM v0.9 Contract Address
// Use environment variable with hardcoded fallback for safety
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x9434AAd18aF442E560C01632798Cf5f8141b2212") as `0x${string}`

// DEBUG: Log the contract address being used
console.log("[DEBUG] Environment variable NEXT_PUBLIC_CONTRACT_ADDRESS:", process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);
console.log("[DEBUG] Final CONTRACT_ADDRESS being used:", CONTRACT_ADDRESS);
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "createGame",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "gameId", "type": "uint256" }],
    "name": "joinGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "gameId", "type": "uint256" },
      { "internalType": "externalEuint8", "name": "encryptedMove", "type": "bytes32" },
      { "internalType": "bytes", "name": "inputProof", "type": "bytes" }
    ],
    "name": "makeMove",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "InvalidProof",
    "type": "error"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "gameId", "type": "uint256" }],
    "name": "requestGameResolution",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "gameId", "type": "uint256" }],
    "name": "getGame",
    "outputs": [
      { "internalType": "address", "name": "player1", "type": "address" },
      { "internalType": "address", "name": "player2", "type": "address" },
      { "internalType": "uint8", "name": "status", "type": "uint8" },
      { "internalType": "bool", "name": "player1Committed", "type": "bool" },
      { "internalType": "bool", "name": "player2Committed", "type": "bool" },
      { "internalType": "bool", "name": "resultsDecrypted", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "gameId", "type": "uint256" }],
    "name": "getGameResults",
    "outputs": [
      { "internalType": "bool", "name": "isDraw", "type": "bool" },
      { "internalType": "bool", "name": "player1Wins", "type": "bool" },
      { "internalType": "address", "name": "winner", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "gameId", "type": "uint256" }],
    "name": "isGameReady",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gameCounter",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "gameId", "type": "uint256" }],
    "name": "getGameRequestId",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "gameId", "type": "uint256" },
      { "indexed": false, "internalType": "address", "name": "winner", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "isDraw", "type": "bool" }
    ],
    "name": "GameFinished",
    "type": "event"
  }
] as const

export function GameInterface() {
  const { address, isConnected } = useAccount()

  // Debug logging
  const { logs, addLog, clearLogs } = useDebugLogs()

  // Set up debug logger for FHEVM utils
  useEffect(() => {
    setDebugLogger(addLog)
    // Add initial log to show the system is working
    addLog('info', 'ui', 'Game interface initialized', { timestamp: new Date().toISOString() })
  }, [])

  // Wagmi hooks for simulation
  const publicClient = usePublicClient()

  // Game state
  const [gameState, setGameState] = useState<GameState>("disconnected")
  const [currentGame, setCurrentGame] = useState<Game>({
    id: null,
    player1: null,
    player2: null,
    player1Committed: false,
    player2Committed: false,
    finished: false
  })

  // UI state
  const [selectedMove, setSelectedMove] = useState<Move>(null)
  const [gameIdInput, setGameIdInput] = useState("")
  const [gameIdToShare, setGameIdToShare] = useState<string>("")
  const [isPlayer1, setIsPlayer1] = useState(false)
  const [copied, setCopied] = useState(false)

  // Wagmi hooks for contract interactions (v2)
  const { writeContract: createGameWrite, isPending: isCreatingGame, error: createGameError } = useWriteContract({
    mutation: {
      onSuccess: async (data) => {
        console.log('Game created successfully:', data)
        setIsPlayer1(true)
        setWaitingForGameCreation(true)
      },
      onError: (error) => {
        console.error('Failed to create game:', error)
        setGameState("menu")
        setWaitingForGameCreation(false)
      }
    }
  })

  const { writeContract: joinGameWrite, isPending: isJoiningGame } = useWriteContract({
    mutation: {
      onSuccess: (data) => {
        console.log('Joined game successfully:', data)
      },
      onError: (error) => {
        console.error('Failed to join game:', error)
        setGameState("menu")
      }
    }
  })

  const { writeContract: makeMoveWrite, isPending: isSubmittingMove } = useWriteContract({
    mutation: {
      onSuccess: (data) => {
        console.log('Move submitted successfully:', data)
        if (isPlayer1) {
          setCurrentGame(prev => ({ ...prev, player1Committed: true }))
        } else {
          setCurrentGame(prev => ({ ...prev, player2Committed: true }))
        }
        setGameState("waiting-for-result")
      },
      onError: (error) => {
        console.error('Failed to submit move:', error)
        setGameState("waiting-for-move")
      }
    }
  })

  const { writeContract: requestGameResolutionWrite, isPending: isRequestingResolution } = useWriteContract({
    mutation: {
      onSuccess: (data) => {
        console.log('Game resolution requested successfully:', data)
        setGameState("waiting-for-result")
        // Force a refetch to update the game status
        refetchGame()
      },
      onError: (error) => {
        console.error('Error requesting game resolution:', error)
        // If resolution was already requested, that's actually fine
        if (error.message?.includes('Resolution already requested') ||
          error.message?.includes('already requested')) {
          console.log('Resolution already requested by another player, updating UI...')
          setGameState("waiting-for-result")
          refetchGame()
        }
      }
    }
  })

  // Poll game state when we have a game ID
  const { data: gameData, refetch: refetchGame } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getGame',
    args: currentGame.id !== null && currentGame.id !== undefined ? [BigInt(currentGame.id)] : undefined,
    query: {
      enabled: currentGame.id !== null && currentGame.id !== undefined,
      refetchInterval: (data) => {
        // Poll very frequently when waiting for resolution
        if (data && data[2] >= 2) { // status >= 2 (MovesCommitted or higher)
          return 1000 // 1 second for resolution states
        }
        return 5000 // 5 seconds for normal states
      }
    }
  })

  // Fetch game results when game is completed
  const { data: gameResults, error: gameResultsError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getGameResults',
    args: currentGame.id !== null && currentGame.id !== undefined ? [BigInt(currentGame.id)] : undefined,
    query: {
      enabled: (currentGame.id !== null && currentGame.id !== undefined) && currentGame.status === 4, // Only fetch when results are decrypted
      refetchInterval: 3000 // Check every 3 seconds
    }
  })

  // Listen for GameFinished event to immediately detect when decryption completes
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'GameFinished',
    onLogs(logs) {
      logs.forEach((log) => {
        const gameId = Number(log.args.gameId)
        const winner = log.args.winner
        const isDraw = log.args.isDraw

        console.log(`[EVENT] GameFinished event received for game ${gameId}`, { winner, isDraw })
        addLog('success', 'blockchain', `🎉 Game ${gameId} finished!`, {
          gameId,
          winner,
          isDraw,
          transactionHash: log.transactionHash
        })

        // If this is our current game, trigger a refetch
        if (currentGame.id === gameId) {
          console.log(`[EVENT] This is our game! Refetching game state...`)
          refetchGame()
        }
      })
    }
  })

  // Debug: Log game results
  useEffect(() => {
    if (currentGame.status === 4 && (currentGame.id !== null && currentGame.id !== undefined)) {
      console.log(`[DEBUG] Game ${currentGame.id} results:`, gameResults)
      console.log(`[DEBUG] Game results error:`, gameResultsError)
      if (gameResults) {
        addLog('success', 'game', `Game results fetched: ${JSON.stringify(gameResults)}`, {
          gameId: currentGame.id,
          results: gameResults
        })
      } else if (gameResultsError) {
        addLog('error', 'game', `Failed to fetch game results: ${gameResultsError.message}`, {
          gameId: currentGame.id,
          error: gameResultsError
        })
      }
    }
  }, [currentGame.status, currentGame.id, gameResults, gameResultsError])

  // Helper function to get status text
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'WaitingForPlayers'
      case 1: return 'WaitingForMoves'
      case 2: return 'MovesCommitted'
      case 3: return 'DecryptionInProgress'
      case 4: return 'ResultsDecrypted'
      default: return `Unknown(${status})`
    }
  }

  // Handle game data updates without causing infinite loops
  useEffect(() => {
    if (gameData && (currentGame.id !== null && currentGame.id !== undefined)) {
      const [player1, player2, status, player1Committed, player2Committed, resultsDecrypted] = gameData

      // Debug: Log status changes
      if (status !== currentGame.status) {
        console.log(`[DEBUG] Game ${currentGame.id} status changed: ${currentGame.status} -> ${status} (${getStatusText(status)})`)
        addLog('info', 'game', `Status changed: ${getStatusText(currentGame.status)} -> ${getStatusText(status)}`, {
          gameId: currentGame.id,
          oldStatus: currentGame.status,
          newStatus: status
        })

        // Add specific messages for important status changes
        if (status === 1 && currentGame.status === 0) {
          addLog('success', 'game', `Player 2 joined game ${currentGame.id}!`, { gameId: currentGame.id, player2: player2 })
        } else if (status === 2 && currentGame.status === 1) {
          addLog('info', 'game', `Both players have submitted moves for game ${currentGame.id}`, { gameId: currentGame.id })
        } else if (status === 3 && currentGame.status === 2) {
          addLog('info', 'game', `Decryption started for game ${currentGame.id}`, { gameId: currentGame.id })
        } else if (status === 4 && currentGame.status === 3) {
          addLog('success', 'game', `Decryption completed for game ${currentGame.id}! Results available.`, { gameId: currentGame.id })
        }
      }

      // Only update if data has actually changed
      const hasChanged = (
        currentGame.player1 !== player1 ||
        currentGame.player2 !== player2 ||
        currentGame.player1Committed !== player1Committed ||
        currentGame.player2Committed !== player2Committed ||
        currentGame.status !== status ||
        currentGame.resultsDecrypted !== resultsDecrypted
      )

      if (hasChanged) {
        setCurrentGame(prev => ({
          ...prev,
          player1: player1,
          player2: player2,
          player1Committed,
          player2Committed,
          status,
          resultsDecrypted,
          finished: status === 4 // ResultsDecrypted
        }))

        // Update game state based on contract status
        switch (status) {
          case 0: // WaitingForPlayers
            setGameState("waiting-for-opponent")
            // If we're player1 and waiting for opponent, set the game ID to share
            if (address === player1 && !gameIdToShare) {
              setGameIdToShare(currentGame.id.toString())
            }
            break
          case 1: // WaitingForMoves
            setGameState("waiting-for-move")
            break
          case 2: // MovesCommitted
            setGameState("waiting-for-result")
            break
          case 3: // DecryptionInProgress
            setGameState("waiting-for-result")
            break
          case 4: // ResultsDecrypted
            setGameState("completed")
            break
          default:
            setGameState("waiting-for-opponent")
        }
      }
    }
  }, [gameData, currentGame.id, address, gameIdToShare])

  // Track if we're waiting for a game to be created
  const [waitingForGameCreation, setWaitingForGameCreation] = useState(false)
  const [lastGameCounter, setLastGameCounter] = useState<number | null>(null)

  // Get the current game counter to find our game ID
  const { data: gameCounterData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'gameCounter',
    query: {
      enabled: waitingForGameCreation,
      refetchInterval: 2000 // Check every 2 seconds when waiting
    }
  })

  // When we get the game counter, use it to find our game
  useEffect(() => {
    if (gameCounterData && waitingForGameCreation) {
      const currentCounter = Number(gameCounterData)

      // If counter increased, we found our new game
      if (lastGameCounter !== null && currentCounter > lastGameCounter) {
        const gameId = currentCounter - 1 // The game we just created
        console.log(`Found new game ID: ${gameId}`)

        addLog('success', 'game', `Game created successfully! Game ID: ${gameId}`, { gameId, counter: currentCounter })
        addLog('info', 'game', `Waiting for opponent to join game ${gameId}...`)

        setCurrentGame({
          id: gameId,
          player1: address,
          player2: null,
          player1Committed: false,
          player2Committed: false,
          status: 0,
          resultsDecrypted: false,
          finished: false
        })
        setGameState("waiting-for-opponent")
        setGameIdToShare(gameId.toString())
        setWaitingForGameCreation(false)
        setLastGameCounter(null)
      } else if (lastGameCounter === null) {
        // First time, just record the current counter
        setLastGameCounter(currentCounter)
        addLog('info', 'game', `Monitoring game counter: ${currentCounter}`, { counter: currentCounter })
      }
    }
  }, [gameCounterData, waitingForGameCreation, lastGameCounter, address])

  const moves = [
    { id: "rock", name: "Rock", icon: Hand, value: 0 },
    { id: "paper", name: "Paper", icon: FileText, value: 1 },
    { id: "scissors", name: "Scissors", icon: Scissors, value: 2 },
  ]

  // Load game state from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && isConnected) {
      const savedGameId = localStorage.getItem('currentGameId')
      const savedGameState = localStorage.getItem('gameState')

      if (savedGameId) {
        console.log(`[DEBUG] Restoring game ${savedGameId} with state ${savedGameState}`)
        addLog('info', 'ui', `Restoring game ${savedGameId} from localStorage`, {
          gameId: parseInt(savedGameId),
          state: savedGameState
        })
        setCurrentGame(prev => ({ ...prev, id: parseInt(savedGameId) }))
        setGameState(savedGameState as GameState || "waiting-for-result")

        // Force immediate refetch and then periodic refetches
        refetchGame()
        const interval = setInterval(() => {
          refetchGame()
        }, 2000) // Check every 2 seconds

        // Clear interval after 5 minutes (300 seconds) to allow for slow testnet decryption
        setTimeout(() => clearInterval(interval), 300000)
      }
    }
  }, [isConnected])

  // Save game state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && (currentGame.id !== null && currentGame.id !== undefined)) {
      localStorage.setItem('currentGameId', currentGame.id.toString())
      localStorage.setItem('gameState', gameState)
      // Only log when entering waiting-for-result state
      if (gameState === 'waiting-for-result') {
        addLog('info', 'ui', `Game state saved to localStorage`, { gameId: currentGame.id, state: gameState })
      }
    } else if (typeof window !== 'undefined' && gameState === 'menu') {
      // Clear saved state when returning to menu
      localStorage.removeItem('currentGameId')
      localStorage.removeItem('gameState')
    }
  }, [currentGame.id, gameState])

  // Log game state changes
  useEffect(() => {
    addLog('info', 'game', `Game state changed to: ${gameState}`, {
      gameId: currentGame.id,
      player1: currentGame.player1,
      player2: currentGame.player2,
      status: currentGame.status
    })
  }, [gameState, currentGame.id, currentGame.player1, currentGame.player2, currentGame.status])

  // Update game state when wallet connects/disconnects
  useEffect(() => {
    if (isConnected) {
      // Only set to menu if no saved game state
      const savedGameId = localStorage.getItem('currentGameId')
      if (!savedGameId) {
        setGameState("menu")
      }
    } else {
      setGameState("disconnected")
      setCurrentGame({
        id: null,
        player1: null,
        player2: null,
        player1Committed: false,
        player2Committed: false,
        finished: false,
        status: 0,
        resultsDecrypted: false
      })
      // Clear localStorage when disconnecting
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentGameId')
        localStorage.removeItem('gameState')
      }
    }
  }, [isConnected])

  const handleCreateGame = async () => {
    if (!address) {
      alert('No wallet address found. Please connect your wallet.')
      return
    }

    // Check if we already have a game in progress
    if (currentGame.id !== null && gameState !== "menu") {
      console.log("Game already in progress, showing existing game")
      return
    }

    addLog('info', 'game', 'Starting game creation process...', { userAddress: address })
    addLog('info', 'blockchain', 'Creating new game...', { userAddress: address })
    setGameState("creating")
    setWaitingForGameCreation(true)
    setLastGameCounter(null)

    try {
      // Call smart contract to create game
      createGameWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createGame'
      })
      addLog('success', 'blockchain', 'Game creation transaction submitted')
      addLog('info', 'game', 'Waiting for game creation confirmation...')
    } catch (error) {
      addLog('error', 'blockchain', 'Failed to create game', { error: error instanceof Error ? error.message : String(error) })
      addLog('error', 'game', 'Game creation failed, returning to menu')
      console.error("Failed to create game:", error)
      setGameState("menu")
      setWaitingForGameCreation(false)
    }
  }

  const handleJoinGame = async () => {
    if (!address || !gameIdInput) return

    const gameId = parseInt(gameIdInput)
    addLog('info', 'game', `Starting to join game ${gameId}...`, { gameId, userAddress: address })
    addLog('info', 'blockchain', `Joining game ${gameId}...`, { gameId, userAddress: address })

    setGameState("joining")
    try {
      // Set up game state first
      setCurrentGame({
        id: gameId,
        player1: null, // Will be fetched from contract
        player2: address,
        player1Committed: false,
        player2Committed: false,
        status: 0,
        resultsDecrypted: false,
        finished: false
      })

      setIsPlayer1(false)

      // Call smart contract to join game
      joinGameWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'joinGame',
        args: [BigInt(gameId)]
      })
      addLog('success', 'blockchain', `Join game transaction submitted for game ${gameId}`)
      addLog('info', 'game', `Waiting for join confirmation...`)
    } catch (error) {
      addLog('error', 'blockchain', `Failed to join game ${gameId}`, { error: error instanceof Error ? error.message : String(error) })
      addLog('error', 'game', 'Join game failed, returning to menu')
      console.error("Failed to join game:", error)
      setGameState("menu")
    }
  }

  const handleSubmitMove = async () => {
    if (!selectedMove || !address || currentGame.id === null || currentGame.id === undefined) return

    const moveValue = moves.find(m => m.id === selectedMove)?.value
    if (moveValue === undefined) return

    addLog('info', 'game', `Submitting move: ${selectedMove} (${moveValue})`, {
      gameId: currentGame.id,
      move: selectedMove,
      value: moveValue,
      userAddress: address
    })

    setGameState("submitting-move")
    try {
      // CRITICAL: Preflight validation - fetch latest on-chain game state to prevent revert
      // This is MANDATORY - we must verify game state before submitting
      let latest;
      try {
        latest = await refetchGame();
      } catch (e) {
        addLog('error', 'blockchain', '❌ Failed to fetch game state - cannot submit move safely', {
          error: e instanceof Error ? e.message : String(e)
        });
        setGameState('waiting-for-move');
        return; // ABORT - don't proceed if we can't verify game state
      }

      const result: any[] | undefined = (latest as any)?.data as any[] | undefined;
      if (!result || result.length < 6) {
        addLog('error', 'blockchain', '❌ Invalid game state response - cannot submit move safely', { result });
        setGameState('waiting-for-move');
        return; // ABORT - invalid response
      }

      const [onPlayer1, onPlayer2, onStatus, onP1Committed, onP2Committed] = result as any;
      addLog('info', 'blockchain', 'Preflight check', {
        gameId: currentGame.id,
        onPlayer1,
        onPlayer2,
        onStatus,
        onP1Committed,
        onP2Committed,
        sender: address,
      });

      // GUARD 1: Player 2 must have joined
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      if (String(onPlayer2).toLowerCase() === zeroAddress.toLowerCase()) {
        addLog('error', 'game', '❌ Player 2 has not joined yet - cannot submit moves', {
          player1: onPlayer1,
          player2: onPlayer2
        });
        setGameState('waiting-for-opponent');
        return;
      }

      // GUARD 2: Only players can submit moves
      if (address?.toLowerCase() !== String(onPlayer1).toLowerCase() &&
        address?.toLowerCase() !== String(onPlayer2).toLowerCase()) {
        addLog('error', 'game', '❌ Only players can submit moves', {
          address,
          onPlayer1,
          onPlayer2
        });
        setGameState('waiting-for-opponent');
        return;
      }

      // GUARD 3: Game status must be WaitingForMoves (1)
      if (Number(onStatus) !== 1) {
        const statusNames = ['WaitingForPlayers', 'WaitingForMoves', 'MovesCommitted', 'DecryptionInProgress', 'ResultsDecrypted'];
        addLog('error', 'game', `❌ Game not accepting moves - status is ${statusNames[Number(onStatus)]}`, {
          status: Number(onStatus),
          statusName: statusNames[Number(onStatus)]
        });
        setGameState(Number(onStatus) === 0 ? 'waiting-for-opponent' : 'waiting-for-result');
        return;
      }

      // GUARD 4: Player must not have already committed
      const isSenderP1 = address?.toLowerCase() === String(onPlayer1).toLowerCase();
      if (isSenderP1 && Boolean(onP1Committed)) {
        addLog('error', 'game', '❌ You have already submitted your move', { player: 'Player 1' });
        setGameState('waiting-for-opponent');
        return;
      }
      if (!isSenderP1 && Boolean(onP2Committed)) {
        addLog('error', 'game', '❌ You have already submitted your move', { player: 'Player 2' });
        setGameState('waiting-for-opponent');
        return;
      }

      addLog('success', 'blockchain', '✅ All preflight checks passed - proceeding with encryption', {
        gameId: currentGame.id,
        player: isSenderP1 ? 'Player 1' : 'Player 2'
      });

      // Encrypt the move using FHE
      // Encrypt the move using FHE
      const contractAddress = CONTRACT_ADDRESS
      console.log(`[Game] Using contract address: ${contractAddress}`)
      const encryptedMove = await encryptMove(moveValue as 0 | 1 | 2, contractAddress, address)

      addLog('success', 'blockchain', 'Move encryption completed, submitting to contract', {
        gameId: currentGame.id,
        ciphertext: encryptedMove.ciphertext.substring(0, 20) + '...'
      })

      // Sanity-check ciphertext/proof
      const ctLen = encryptedMove.ciphertext.length; // should be 66 (0x + 64)
      const proofLen = encryptedMove.proof.length;
      addLog('info', 'fhevm', 'Ciphertext/proof lengths', { ctLen, proofLen });
      if (ctLen !== 66) {
        addLog('error', 'fhevm', 'Ciphertext length is not 32 bytes (bytes32)', { ctLen, ciphertext: encryptedMove.ciphertext });
        setGameState('waiting-for-move');
        return;
      }

      // SIMULATION: Test the transaction before sending to catch revert reasons
      addLog('info', 'blockchain', '🔍 Simulating transaction before sending...');
      if (publicClient) {
        try {
          const simulationResult = await publicClient.simulateContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'makeMove',
            args: [
              BigInt(currentGame.id),
              encryptedMove.ciphertext as `0x${string}`,
              encryptedMove.proof
            ],
            account: address,
            gas: BigInt(15000000)
          });
          addLog('success', 'blockchain', '✅ Simulation passed - transaction will succeed', {
            result: simulationResult.result
          });
        } catch (simError: any) {
          // Check if it's the InvalidProof error (0xbf18af43)
          const errorSig = simError.data?.errorName || simError.cause?.data?.errorName;
          const isInvalidProof = simError.message?.includes('0xbf18af43') || errorSig === 'InvalidProof';

          if (isInvalidProof) {
            addLog('error', 'fhevm', '❌ Invalid ZK Proof - The encrypted input proof verification failed', {
              error: 'InvalidProof (0xbf18af43)',
              reason: 'The zero-knowledge proof generated for your encrypted move is invalid or incompatible with the contract',
              suggestion: 'This is likely a bug in the FHEVM SDK integration. Please report this issue.'
            });
          } else {
            addLog('error', 'blockchain', '❌ Simulation failed - transaction would revert', {
              error: simError.message || String(simError),
              shortMessage: simError.shortMessage,
              details: simError.details,
              cause: simError.cause?.reason || simError.cause?.message,
              errorSignature: simError.message?.match(/0x[a-fA-F0-9]{8}/)?.[0]
            });
          }
          console.error('Simulation error:', simError);
          setGameState('waiting-for-move');
          return; // ABORT - don't send a transaction that will fail
        }
      } else {
        addLog('warning', 'blockchain', '⚠️ Public client not available - skipping simulation');
      }

      // Call smart contract to submit encrypted move
      // Set explicit gas limit for FHE operations (v0.9 requires more gas)
      // Sepolia cap is 16,777,216, using 15M to be safe
      addLog('info', 'blockchain', '📤 Sending transaction to blockchain...');
      makeMoveWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'makeMove',
        args: [
          BigInt(currentGame.id),
          encryptedMove.ciphertext as `0x${string}`,
          encryptedMove.proof
        ],
        gas: BigInt(15000000) // 15M gas - FHE.fromExternal needs significant gas
      })
      setSelectedMove(null)
    } catch (error) {
      addLog('error', 'game', 'Failed to submit move', {
        error: error instanceof Error ? error.message : String(error),
        gameId: currentGame.id,
        move: selectedMove
      })
      console.error("Failed to submit move:", error)
      setGameState(isPlayer1 ? "waiting-for-opponent" : "waiting-for-move")
    }
  }

  const handleResolveGame = async () => {
    if (currentGame.id === null || currentGame.id === undefined) return
    if (!address) return

    addLog('info', 'game', `Starting decryption process for game ${currentGame.id}...`)

    try {
      // 1. Get decrypted results + proof using SDK
      // We need the contract instance to read handles
      // We can use the generic contract read via wagmi or direct call via utils if we pass the contract instance
      // But getGameResult expects a contract instance with getEncryptedResult method.
      // We can create a simple wrapper or use readContract?
      // Actually, getGameResult in fhevm-utils takes `contractInstance`.
      // We need a proper ethers/viem contract instance.
      // Since we are using Wagmi, we should use useContractRead or getContract?

      // Let's assume we can use a temporary ethers provider or similar?
      // Or simpler: Update getGameResult to take the encrypted handles if passed directly?
      // But handles must be fetched from contract.

      // We can use `publicClient` to read contract? 
      // Or refactor getGameResult to accept `publicClient`.

      // For now, let's assume `getGameResult` can instantiate a readonly contract if we pass provider?
      // Or we pass `readContract` result?

      // Wait, easiest way: 
      // 1. Fetch handles using `readContract` (Wagmi).
      // 2. Call `fhevm.instance.publicDecrypt`.
      // 3. Call `resolveGameWrite`.

      // I will implement logic here directly or use helper?
      // I'll use helper `getGameResult` but I need to pass a "contract-like" object that has `getEncryptedResult`.
      const contractStub = {
        getEncryptedResult: async (id: number) => {
          if (!publicClient) throw new Error("No public client");
          return await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'getEncryptedResult',
            args: [BigInt(id)]
          }) as [any, any];
        }
      };

      const { isDraw, player1Wins, decryptionProof } = await getGameResult(
        currentGame.id,
        CONTRACT_ADDRESS,
        address,
        contractStub
      );

      addLog('success', 'fhevm', 'Decryption successful!', { isDraw, player1Wins });

      // 2. Submit proof to contract
      resolveGameWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'resolveGame',
        args: [
          BigInt(currentGame.id),
          isDraw,
          player1Wins,
          decryptionProof as `0x${string}`
        ]
      });

    } catch (error) {
      addLog('error', 'game', 'Failed to resolve game', { error: error instanceof Error ? error.message : String(error) });
      console.error("Resolution failed:", error);
    }
  }

  // Helper function to get status text
  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return 'WaitingForPlayers'
      case 1: return 'WaitingForMoves'
      case 2: return 'MovesCommitted'
      case 3: return 'DecryptionPending' // Updated name
      case 4: return 'ResultsDecrypted'
      default: return `Unknown(${status})`
    }
  }

  // ... (rest of helper functions)

  // ... (inside render)
  {
    gameState === "waiting-for-result" && (
      <Card>
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            {currentGame.status === 2 ? (
              // Both moves committed - show resolution button (request)
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <p className="text-green-600 font-semibold">Both moves submitted!</p>

                <p className="text-muted-foreground">
                  Ready to compute winner? (Step 1/2)
                </p>

                <Button
                  onClick={handleRequestGameResolution}
                  size="lg"
                  className="w-full md:w-auto"
                >
                  Request Game Resolution
                </Button>
              </div>
            ) : currentGame.status === 3 ? (
              // Decryption Pending - show resolve button (decrypt)
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                </div>
                <p className="text-blue-600 font-semibold">Decryption Ready</p>

                <p className="text-muted-foreground">
                  Please decrypt the results and publish the winner (Step 2/2)
                </p>

                <Button
                  onClick={handleResolveGame}
                  size="lg"
                  className="w-full md:w-auto"
                  variant="secondary"
                >
                  Decrypt & Reveal Winner
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-lg font-medium">Waiting for opponent...</p>
                <p className="text-sm text-muted-foreground">
                  Game Status: {getStatusText(currentGame.status)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const copyGameId = () => {
    navigator.clipboard.writeText(gameIdToShare)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resetGame = () => {
    setGameState("menu")
    setCurrentGame({
      id: null,
      player1: null,
      player2: null,
      player1Committed: false,
      player2Committed: false,
      status: 0,
      resultsDecrypted: false,
      finished: false
    })
    setGameIdToShare("")
    setGameIdInput("")
    setSelectedMove(null)
    setIsPlayer1(false)
    setWaitingForGameCreation(false)
    setLastGameCounter(null)
  }

  const getMoveIcon = (move: Move) => {
    const moveData = moves.find((m) => m.id === move)
    return moveData?.icon || Hand
  }

  // Show wallet connection if not connected
  if (gameState === "disconnected") {
    return (
      <div className="space-y-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Connect Your Wallet
            </CardTitle>
            <CardDescription>
              Connect your wallet to start playing encrypted Rock Paper Scissors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 py-8">
              <ConnectButton />
              <p className="text-sm text-muted-foreground text-center">
                Make sure you're connected to the Sepolia network and have some test ETH
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Game Process Monitor - Always visible */}
        <div className="mt-6">
          <DebugPanel logs={logs} onClearLogs={clearLogs} />
        </div>
      </div>
    )
  }

  // Show main menu
  if (gameState === "menu") {
    return (
      <div className="space-y-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Welcome to Encrypted Rock Paper Scissors!</CardTitle>
            <CardDescription>
              Choose to create a new game or join an existing one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Create New Game</h3>
                <p className="text-sm text-muted-foreground">
                  Start a new game and share the Game ID with your opponent
                </p>
                <Button
                  onClick={handleCreateGame}
                  className="w-full"
                  size="lg"
                  disabled={isCreatingGame}
                >
                  {isCreatingGame ? "Creating Game..." : "Create Game"}
                </Button>
                {createGameError && (
                  <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
                    Error: {createGameError.message}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Join Existing Game</h3>
                <p className="text-sm text-muted-foreground">
                  Enter a Game ID to join someone else's game
                </p>
                <div className="space-y-2">
                  <Label htmlFor="gameId">Game ID</Label>
                  <Input
                    id="gameId"
                    type="number"
                    placeholder="Enter Game ID"
                    value={gameIdInput}
                    onChange={(e) => setGameIdInput(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleJoinGame}
                  className="w-full"
                  size="lg"
                  disabled={!gameIdInput || isJoiningGame}
                >
                  {isJoiningGame ? "Joining Game..." : "Join Game"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Process Monitor - Always visible */}
        <div className="mt-6">
          <DebugPanel logs={logs} onClearLogs={clearLogs} />
        </div>
      </div>
    )
  }

  // Show waiting for opponent screen
  if (gameState === "waiting-for-opponent") {
    return (
      <div className="space-y-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Game Created! 🎮</CardTitle>
            <CardDescription>
              Share this Game ID with your opponent to start playing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4 p-6 bg-primary/10 rounded-lg border border-primary/20">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Your Game ID</p>
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold text-primary">#{gameIdToShare}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyGameId}
                      className="flex items-center gap-1"
                    >
                      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Waiting for your opponent to join...
                </p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>

              <Button onClick={resetGame} variant="outline" className="w-full">
                Cancel Game
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Game Process Monitor - Always visible */}
        <div className="mt-6">
          <DebugPanel logs={logs} onClearLogs={clearLogs} />
        </div>
      </div>
    )
  }

  // Show creating state with notification
  if (gameState === "creating") {
    return (
      <div className="space-y-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Creating Game...</CardTitle>
            <CardDescription>
              Please wait while we create your game on the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  ⏱️ <strong>Note:</strong> Game ID detection may take up to 1 minute. Please be patient while the blockchain processes your transaction.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Game Process Monitor - Always visible */}
        <div className="mt-6">
          <DebugPanel logs={logs} onClearLogs={clearLogs} />
        </div>
      </div>
    )
  }

  // Show game in progress
  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Game #{currentGame.id}</CardTitle>
              <CardDescription>
                {gameState === "waiting-for-move" && "Choose your move (encrypted with FHE)"}
                {gameState === "submitting-move" && "Submitting your encrypted move..."}
                {gameState === "waiting-for-result" && "Waiting for opponent's move..."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Player 1</h3>
                {currentGame.player1Committed && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Encrypted
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-center py-8">
                {currentGame.player1Committed ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">Move encrypted</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No move yet</p>
                )}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Player 2</h3>
                {currentGame.player2Committed && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Encrypted
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-center py-8">
                {currentGame.player2Committed ? (
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-2">
                      <svg className="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-sm text-muted-foreground">Move encrypted</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No move yet</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {(gameState === "waiting-for-move" || gameState === "submitting-move") && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Move</CardTitle>
            <CardDescription>Your move will be encrypted using FHE before submission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {moves.map((move) => {
                const Icon = move.icon
                return (
                  <button
                    key={move.id}
                    onClick={() => setSelectedMove(move.id as Move)}
                    disabled={gameState === "submitting-move"}
                    className={`
                      relative p-6 rounded-lg border-2 transition-all
                      ${selectedMove === move.id
                        ? "border-primary bg-primary/10 shadow-lg scale-105"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }
                      ${gameState === "submitting-move" ? "opacity-50 cursor-not-allowed" : ""}
                    `}
                  >
                    <div className="flex flex-col items-center gap-3">
                      <Icon
                        className={`w-12 h-12 ${selectedMove === move.id ? "text-primary" : "text-muted-foreground"}`}
                      />
                      <span
                        className={`font-semibold ${selectedMove === move.id ? "text-primary" : "text-foreground"}`}
                      >
                        {move.name}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>

            <Button
              onClick={handleSubmitMove}
              disabled={!selectedMove || isSubmittingMove}
              className="w-full"
              size="lg"
            >
              {isSubmittingMove ? "Submitting..." : "Submit Encrypted Move"}
            </Button>

            {selectedMove && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Your move will be encrypted using FHE before being submitted to the blockchain
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {gameState === "waiting-for-result" && (
        <Card>
          <CardContent className="text-center py-8">
            <div className="space-y-4">
              {currentGame.status === 2 ? (
                // Both moves committed - show resolution button
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <p className="text-green-600 font-semibold">Both moves submitted!</p>
                  <p className="text-sm text-muted-foreground">
                    Click below to resolve the game using FHE decryption
                  </p>
                  <Button
                    onClick={handleRequestGameResolution}
                    disabled={isRequestingResolution}
                    className="w-full"
                    size="lg"
                  >
                    {isRequestingResolution ? "Requesting Resolution..." : "Resolve Game"}
                  </Button>
                </div>
              ) : currentGame.status === 3 ? (
                // Decryption in progress
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  </div>
                  <p className="text-yellow-600 font-semibold">Decryption in progress...</p>
                  <p className="text-sm text-muted-foreground">
                    FHEVM is decrypting the results. This may take a few moments.
                  </p>
                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={() => {
                        console.log(`[DEBUG] Manual status check for game ${currentGame.id}`)
                        addLog('info', 'blockchain', 'Manual status check requested', { gameId: currentGame.id })
                        refetchGame()
                      }}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      Check Status
                    </Button>
                    <div className="text-xs text-muted-foreground text-center space-y-1">
                      <p>If stuck for more than 2 minutes, try checking status manually</p>
                      <p className="text-yellow-500">⚠️ FHEVM decryption may be slow or failing</p>
                      <p>Status: {currentGame.status} (DecryptionInProgress)</p>
                    </div>
                  </div>
                </div>
              ) : currentGame.status === 4 ? (
                // Results decrypted - show game results
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <CheckCircle className="w-6 h-6 text-green-500" />
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="text-green-600 font-semibold text-lg">Game Complete!</p>
                  {gameResults && (
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${gameResults[0] ? 'text-yellow-600' :
                          gameResults[1] ? 'text-blue-600' : 'text-red-600'
                        }`}>
                        {gameResults[0] ? '🎯 IT\'S A DRAW!' :
                          gameResults[1] ? '🏆 PLAYER 1 WINS!' : '🏆 PLAYER 2 WINS!'}
                      </div>
                    </div>
                  )}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Results have been decrypted:</p>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Player 1:</span>
                      <span className="text-primary">Move submitted</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Player 2:</span>
                      <span className="text-primary">Move submitted</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      {gameResults ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Result:</span>
                            <span className={`font-bold text-lg ${gameResults[0] ? 'text-yellow-600' :
                                gameResults[1] ? 'text-blue-600' : 'text-red-600'
                              }`}>
                              {gameResults[0] ? '🎯 DRAW!' :
                                gameResults[1] ? '🏆 PLAYER 1 WINS!' : '🏆 PLAYER 2 WINS!'}
                            </span>
                          </div>
                          {!gameResults[0] && gameResults[2] && gameResults[2] !== '0x0000000000000000000000000000000000000000' && (
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Winner:</span>
                              <span className="text-primary font-mono text-sm">
                                {gameResults[2] === currentGame.player1 ? 'Player 1' : 'Player 2'}
                              </span>
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            <p>Game ID: {currentGame.id}</p>
                            <p>Status: {currentGame.status} (ResultsDecrypted)</p>
                            <p>Raw Results: isDraw={String(gameResults[0])}, player1Wins={String(gameResults[1])}, winner={gameResults[2]}</p>
                            <p className="text-green-400">
                              {gameResults[0] ? 'Result: Draw (both players chose the same move)' :
                                gameResults[1] ? 'Result: Player 1 won the game' : 'Result: Player 2 won the game'}
                            </p>
                          </div>
                        </div>
                      ) : gameResultsError ? (
                        <div className="text-center py-2">
                          <p className="text-red-500 text-sm">Error loading results</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {gameResultsError.message}
                          </p>
                          <Button
                            onClick={() => refetchGame()}
                            size="sm"
                            variant="outline"
                            className="mt-2"
                          >
                            Retry
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold">Result:</span>
                            <span className="text-green-600 font-semibold">
                              Loading results...
                            </span>
                          </div>
                          <Button
                            onClick={() => refetchGame()}
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            Refresh Results
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      addLog('info', 'ui', 'User clicked Play Again', { gameId: currentGame.id })
                      setGameState("menu")
                      setCurrentGame({
                        id: null,
                        player1: null,
                        player2: null,
                        player1Committed: false,
                        player2Committed: false,
                        finished: false,
                        status: 0,
                        resultsDecrypted: false
                      })
                      // Clear localStorage when starting new game
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('currentGameId')
                        localStorage.removeItem('gameState')
                      }
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    🎮 Play Again
                  </Button>
                </div>
              ) : (
                // Still waiting for moves
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <p className="text-muted-foreground">Waiting for opponent's move...</p>
                  <p className="text-sm text-muted-foreground">
                    Once both moves are submitted, you can resolve the game using encrypted computation
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Process Logs - Always visible below game interface */}
      <div className="mt-6">
        <DebugPanel logs={logs} onClearLogs={clearLogs} />
      </div>

    </div>
  )
}

