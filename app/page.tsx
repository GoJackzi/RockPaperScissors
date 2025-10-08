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

          <div id="about" className="mt-16 bg-card border border-border rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-6">About FHEVM</h2>
            <div className="space-y-4 text-muted-foreground">
              <p>
                <strong className="text-foreground">FHEVM (Fully Homomorphic Encryption Virtual Machine)</strong> is a
                groundbreaking technology developed by Zama that enables confidential smart contracts on the blockchain.
                Unlike traditional smart contracts where all data is publicly visible, FHEVM allows computations to be
                performed on encrypted data without ever decrypting it.
              </p>
              <p>
                This revolutionary approach solves one of blockchain's biggest challenges: privacy. With FHEVM, you can
                build applications where sensitive information remains encrypted throughout the entire computation
                process, yet the smart contract can still perform complex operations and produce correct results.
              </p>
              <p>
                FHEVM uses advanced cryptographic techniques including Fully Homomorphic Encryption (FHE) and
                Zero-Knowledge Proofs (ZKP) to ensure that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Data remains encrypted on-chain at all times</li>
                <li>Computations are performed on encrypted values without revealing them</li>
                <li>Results are verifiable and trustworthy</li>
                <li>Privacy is maintained without sacrificing transparency or security</li>
              </ul>
              <p>
                This makes FHEVM perfect for applications like private voting, confidential auctions, sealed-bid games,
                private DeFi, and any scenario where you need both blockchain's transparency and data confidentiality.
              </p>
            </div>
          </div>

          <div id="how-it-works" className="mt-16 bg-card border border-border rounded-lg p-8">
            <h2 className="text-3xl font-bold mb-6">How It Works</h2>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    1
                  </span>
                  Game Creation
                </h3>
                <p className="text-muted-foreground ml-10">
                  Player 1 creates a new game by calling the smart contract and depositing a wager. The contract
                  generates a unique game ID and waits for Player 2 to join.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    2
                  </span>
                  Encrypted Move Submission
                </h3>
                <p className="text-muted-foreground ml-10">
                  Both players submit their moves (0=Rock, 1=Paper, 2=Scissors) as encrypted values using FHEVM's{" "}
                  <code className="bg-muted px-1 py-0.5 rounded text-sm">euint8</code> type. The moves are encrypted
                  client-side with a Zero-Knowledge Proof (ZKP) that proves the value is valid (0, 1, or 2) without
                  revealing what it is. These encrypted moves are stored on-chain, completely hidden from everyone
                  including the other player, miners, and validators.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    3
                  </span>
                  Encrypted Winner Determination
                </h3>
                <p className="text-muted-foreground ml-10">
                  Once both moves are submitted, the smart contract determines the winner using FHE operations directly
                  on the encrypted values. The contract computes:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-14 mt-2 text-muted-foreground text-sm">
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">FHE.eq(move1, move2)</code> - checks if moves are
                    equal (tie)
                  </li>
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">FHE.eq(move1, 0)</code> and{" "}
                    <code className="bg-muted px-1 py-0.5 rounded">FHE.eq(move2, 1)</code> - checks if Player 1 played
                    Rock and Player 2 played Paper
                  </li>
                  <li>Similar comparisons for all winning combinations</li>
                  <li>
                    <code className="bg-muted px-1 py-0.5 rounded">FHE.select()</code> - conditionally selects the
                    winner based on encrypted boolean results
                  </li>
                </ul>
                <p className="text-muted-foreground ml-10 mt-2">
                  All these operations happen on encrypted data - the actual moves are never decrypted, yet the contract
                  correctly determines the winner!
                </p>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    4
                  </span>
                  Result & Payout
                </h3>
                <p className="text-muted-foreground ml-10">
                  The encrypted result is decrypted only for authorized parties (the players) using FHEVM's access
                  control system (<code className="bg-muted px-1 py-0.5 rounded">FHE.allow()</code>). The winner
                  receives the total wager, and players can view their opponent's move after the game concludes. The
                  entire game history remains verifiable on-chain while maintaining privacy during gameplay.
                </p>
              </div>

              <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Key Innovation:</strong> Traditional blockchain games require
                  commit-reveal schemes with multiple transactions and waiting periods. FHEVM eliminates this complexity
                  by computing directly on encrypted data, making the game instant, fair, and truly private.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Fully Encrypted</h3>
              <p className="text-sm text-muted-foreground">
                Your moves are encrypted using FHE, ensuring complete privacy throughout the game.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Provably Fair</h3>
              <p className="text-sm text-muted-foreground">
                Zero-knowledge proofs ensure moves are valid without revealing them early.
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">On-Chain Logic</h3>
              <p className="text-sm text-muted-foreground">
                Game logic runs entirely on-chain with encrypted computation via FHEVM.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
