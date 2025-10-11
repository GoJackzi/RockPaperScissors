import { GameInterface } from "@/components/game-interface"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-balance">Rock-Paper-Scissors</h1>
            <p className="text-lg md:text-xl text-muted-foreground text-pretty">
              Play Rock Paper Scissors with complete privacy using Zama's FHEVM technology. Your moves stay encrypted
              on-chain until both players commit.
            </p>
          </div>

          <GameInterface />
        </div>
      </div>
    </main>
  )
}
