"use client"

import { useState, useEffect } from "react"
import { useAccount, useConnect, useDisconnect, useContractWrite, useContractRead } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Hand, Scissors, FileText, Wallet, Copy, CheckCircle } from "lucide-react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { encryptMove, getGameResult } from "@/lib/fhevm-utils"
import { parseEther } from "viem"

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

// Contract configuration
const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0C2029036D53B763DFc9e7AADB2A43a911b7a7E5") as `0x${string}`
const CONTRACT_ABI = [
  {
    "inputs": [],
    "name": "createGame",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "gameId", "type": "uint256"}],
    "name": "joinGame",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "gameId", "type": "uint256"},
      {"internalType": "externalEuint8", "name": "encryptedMove", "type": "bytes32"},
      {"internalType": "bytes", "name": "inputProof", "type": "bytes"}
    ],
    "name": "makeMove",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "gameId", "type": "uint256"}],
    "name": "requestGameResolution",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "gameId", "type": "uint256"}],
    "name": "getGame",
    "outputs": [
      {"internalType": "address", "name": "player1", "type": "address"},
      {"internalType": "address", "name": "player2", "type": "address"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "bool", "name": "player1Committed", "type": "bool"},
      {"internalType": "bool", "name": "player2Committed", "type": "bool"},
      {"internalType": "bool", "name": "resultsDecrypted", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "gameId", "type": "uint256"}],
    "name": "getGameResults",
    "outputs": [
      {"internalType": "bool", "name": "isDraw", "type": "bool"},
      {"internalType": "bool", "name": "player1Wins", "type": "bool"},
      {"internalType": "address", "name": "winner", "type": "address"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "gameId", "type": "uint256"}],
    "name": "isGameReady",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "gameCounter",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "gameId", "type": "uint256"}],
    "name": "getGameRequestId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const

export function GameInterface() {
  const { address, isConnected } = useAccount()
  
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

  // Wagmi hooks for contract interactions
  const { writeContract: createGameWrite, isPending: isCreatingGame, error: createGameError } = useContractWrite({
    onSuccess: async (data) => {
      console.log('Game created successfully:', data)
      
      // Wait for transaction to be mined
      try {
        const receipt = await data.wait()
        console.log('Transaction confirmed:', receipt.transactionHash)
        
        // The polling logic will detect the new game via gameCounter
        setIsPlayer1(true)
        
      } catch (waitError) {
        console.error('Error waiting for transaction:', waitError)
        setGameState("menu")
        setWaitingForGameCreation(false)
      }
    },
    onError: (error) => {
      console.error('Failed to create game:', error)
      console.error('Create game error details:', createGameError)
      setGameState("menu")
      setWaitingForGameCreation(false)
    }
  })

  const { writeContract: joinGameWrite, isPending: isJoiningGame } = useContractWrite({
    onSuccess: (data) => {
      console.log('Joined game successfully:', data)
      // Don't set game state here - let the contract polling handle it
    },
    onError: (error) => {
      console.error('Failed to join game:', error)
      setGameState("menu")
    }
  })

  const { writeContract: makeMoveWrite, isPending: isSubmittingMove } = useContractWrite({
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
  })

  const { writeContract: requestGameResolutionWrite, isPending: isRequestingResolution } = useContractWrite({
    onSuccess: (data) => {
      console.log('Game resolution requested successfully:', data)
      setGameState("waiting-for-result")
    },
    onError: (error) => {
      console.error('Error requesting game resolution:', error)
    }
  })

  // Poll game state when we have a game ID
  const { data: gameData, refetch: refetchGame } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getGame',
    args: currentGame.id ? [BigInt(currentGame.id)] : undefined,
    enabled: !!currentGame.id,
    watch: true // Auto-refresh every block
  })

  // Handle game data updates without causing infinite loops
  useEffect(() => {
    if (gameData && currentGame.id) {
      const [player1, player2, status, player1Committed, player2Committed, resultsDecrypted] = gameData
      
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
  const { data: gameCounterData } = useContractRead({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'gameCounter',
    enabled: waitingForGameCreation,
    watch: true
  })

  // When we get the game counter, use it to find our game
  useEffect(() => {
    if (gameCounterData && waitingForGameCreation) {
      const currentCounter = Number(gameCounterData)
      
      // If counter increased, we found our new game
      if (lastGameCounter !== null && currentCounter > lastGameCounter) {
        const gameId = currentCounter - 1 // The game we just created
        console.log(`Found new game ID: ${gameId}`)
        
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
      }
    }
  }, [gameCounterData, waitingForGameCreation, lastGameCounter, address])

  const moves = [
    { id: "rock", name: "Rock", icon: Hand, value: 0 },
    { id: "paper", name: "Paper", icon: FileText, value: 1 },
    { id: "scissors", name: "Scissors", icon: Scissors, value: 2 },
  ]

  // Update game state when wallet connects/disconnects
  useEffect(() => {
    if (isConnected) {
      setGameState("menu")
    } else {
      setGameState("disconnected")
      setCurrentGame({
        id: null,
        player1: null,
        player2: null,
        player1Committed: false,
        player2Committed: false,
        finished: false
      })
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
    } catch (error) {
      console.error("Failed to create game:", error)
      setGameState("menu")
      setWaitingForGameCreation(false)
    }
  }

  const handleJoinGame = async () => {
    if (!address || !gameIdInput) return
    
    setGameState("joining")
    try {
      const gameId = parseInt(gameIdInput)
      
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
    } catch (error) {
      console.error("Failed to join game:", error)
      setGameState("menu")
    }
  }

  const handleSubmitMove = async () => {
    if (!selectedMove || !address || !currentGame.id) return
    
    setGameState("submitting-move")
    try {
      const moveValue = moves.find(m => m.id === selectedMove)?.value
      if (moveValue === undefined) return
      
      // Encrypt the move using FHE
      const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS!
      const encryptedMove = await encryptMove(moveValue as 0 | 1 | 2, contractAddress, address)
      
      // Call smart contract to submit encrypted move
      makeMoveWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'makeMove',
        args: [
          BigInt(currentGame.id),
          encryptedMove.handle as `0x${string}`,
          encryptedMove.proof
        ]
      })
      setSelectedMove(null)
    } catch (error) {
      console.error("Failed to submit move:", error)
      setGameState(isPlayer1 ? "waiting-for-opponent" : "waiting-for-move")
    }
  }

  const handleRequestGameResolution = async () => {
    if (!currentGame.id) return

    try {
      // Request game resolution (triggers FHE decryption)
      requestGameResolutionWrite({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'requestGameResolution',
        args: [BigInt(currentGame.id)]
      })
      
    } catch (error) {
      console.error('Error requesting game resolution:', error)
    }
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
      </div>
    )
  }

  // Show waiting for opponent screen
  if (gameState === "waiting-for-opponent") {
    return (
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
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
              </div>
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  ⏱️ <strong>Note:</strong> Game ID detection may take up to 1 minute. Please be patient while the blockchain processes your transaction.
                </p>
              </div>
            </div>
            
            <Button onClick={resetGame} variant="outline" className="w-full">
              Cancel Game
            </Button>
          </div>
        </CardContent>
      </Card>
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
            <Badge variant="secondary">
              {isPlayer1 ? "Player 1" : "Player 2"}
            </Badge>
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
                      ${
                        selectedMove === move.id
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
              ) : (
                // Still waiting for moves
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
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
    </div>
  )
}
