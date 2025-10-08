"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Hand, Scissors, FileText } from "lucide-react"

type Move = "rock" | "paper" | "scissors" | null
type GameState = "waiting" | "player1-moved" | "both-moved" | "revealed"

export function GameInterface() {
  const [selectedMove, setSelectedMove] = useState<Move>(null)
  const [gameState, setGameState] = useState<GameState>("waiting")
  const [player1Move, setPlayer1Move] = useState<Move>(null)
  const [player2Move, setPlayer2Move] = useState<Move>(null)
  const [winner, setWinner] = useState<"player1" | "player2" | "draw" | null>(null)

  const moves = [
    { id: "rock", name: "Rock", icon: Hand, value: 0 },
    { id: "paper", name: "Paper", icon: FileText, value: 1 },
    { id: "scissors", name: "Scissors", icon: Scissors, value: 2 },
  ]

  const handleMoveSelect = (move: Move) => {
    setSelectedMove(move)
  }

  const handleSubmitMove = () => {
    if (!selectedMove) return

    if (gameState === "waiting") {
      setPlayer1Move(selectedMove)
      setGameState("player1-moved")
      setSelectedMove(null)
    } else if (gameState === "player1-moved") {
      setPlayer2Move(selectedMove)
      setGameState("both-moved")

      // Simulate game resolution
      setTimeout(() => {
        determineWinner(player1Move!, selectedMove)
        setGameState("revealed")
      }, 1500)
    }
  }

  const determineWinner = (p1: Move, p2: Move) => {
    if (p1 === p2) {
      setWinner("draw")
      return
    }

    const winConditions: Record<string, string> = {
      "rock-scissors": "player1",
      "scissors-paper": "player1",
      "paper-rock": "player1",
      "scissors-rock": "player2",
      "paper-scissors": "player2",
      "rock-paper": "player2",
    }

    const result = winConditions[`${p1}-${p2}`]
    setWinner(result as "player1" | "player2")
  }

  const resetGame = () => {
    setSelectedMove(null)
    setGameState("waiting")
    setPlayer1Move(null)
    setPlayer2Move(null)
    setWinner(null)
  }

  const getMoveIcon = (move: Move) => {
    const moveData = moves.find((m) => m.id === move)
    return moveData?.icon || Hand
  }

  return (
    <div className="space-y-6">
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Game Status</CardTitle>
              <CardDescription>
                {gameState === "waiting" && "Waiting for Player 1 to make a move"}
                {gameState === "player1-moved" && "Player 1 moved! Waiting for Player 2..."}
                {gameState === "both-moved" && "Both players moved! Revealing results..."}
                {gameState === "revealed" && "Game complete!"}
              </CardDescription>
            </div>
            <Badge variant={gameState === "revealed" ? "default" : "secondary"}>
              {gameState === "waiting" && "Ready"}
              {gameState === "player1-moved" && "In Progress"}
              {gameState === "both-moved" && "Computing..."}
              {gameState === "revealed" && "Complete"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Player 1</h3>
                {player1Move && gameState !== "revealed" && (
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
              {player1Move && gameState === "revealed" ? (
                <div className="flex flex-col items-center justify-center py-8">
                  {(() => {
                    const Icon = getMoveIcon(player1Move)
                    return <Icon className="w-16 h-16 text-primary mb-2" />
                  })()}
                  <p className="text-lg font-semibold capitalize">{player1Move}</p>
                </div>
              ) : player1Move ? (
                <div className="flex flex-col items-center justify-center py-8">
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
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">No move yet</p>
                </div>
              )}
            </div>

            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Player 2</h3>
                {player2Move && gameState !== "revealed" && (
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
              {player2Move && gameState === "revealed" ? (
                <div className="flex flex-col items-center justify-center py-8">
                  {(() => {
                    const Icon = getMoveIcon(player2Move)
                    return <Icon className="w-16 h-16 text-primary mb-2" />
                  })()}
                  <p className="text-lg font-semibold capitalize">{player2Move}</p>
                </div>
              ) : player2Move ? (
                <div className="flex flex-col items-center justify-center py-8">
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
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <p className="text-sm">No move yet</p>
                </div>
              )}
            </div>
          </div>

          {gameState === "revealed" && winner && (
            <div className="mt-6 p-6 bg-primary/10 border border-primary/20 rounded-lg text-center">
              <h3 className="text-2xl font-bold mb-2">
                {winner === "draw" ? "It's a Draw!" : `Player ${winner === "player1" ? "1" : "2"} Wins!`}
              </h3>
              <p className="text-muted-foreground mb-4">
                {winner === "draw"
                  ? "Both players chose the same move"
                  : `${player1Move} ${winner === "player1" ? "beats" : "loses to"} ${player2Move}`}
              </p>
              <Button onClick={resetGame} variant="default">
                Play Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {gameState !== "revealed" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {gameState === "waiting" ? "Player 1: Choose Your Move" : "Player 2: Choose Your Move"}
            </CardTitle>
            <CardDescription>Your move will be encrypted before submission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {moves.map((move) => {
                const Icon = move.icon
                return (
                  <button
                    key={move.id}
                    onClick={() => handleMoveSelect(move.id as Move)}
                    className={`
                      relative p-6 rounded-lg border-2 transition-all
                      ${
                        selectedMove === move.id
                          ? "border-primary bg-primary/10 shadow-lg scale-105"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }
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
              disabled={!selectedMove || gameState === "both-moved"}
              className="w-full"
              size="lg"
            >
              {gameState === "both-moved" ? "Computing Result..." : "Submit Encrypted Move"}
            </Button>

            {selectedMove && (
              <p className="text-sm text-muted-foreground text-center mt-4">
                Your move will be encrypted using FHE before being submitted to the blockchain
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
