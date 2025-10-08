# 🔐 FHEVM Rock-Paper-Scissors

A fully functional Rock-Paper-Scissors game built with **Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine)** technology. This project demonstrates encrypted computations on the blockchain, where player moves remain private until game completion.

## 🎮 Live Demo

- **Frontend**: [Deployed on Vercel](https://your-app.vercel.app) (Coming Soon)
- **Contract**: Sepolia Testnet (Deploy to get address)
- **Network**: Sepolia Testnet

## ✨ Features

- 🔐 **Fully Homomorphic Encryption**: Player moves are encrypted and computed on-chain
- 🎯 **Real-time Gameplay**: Create and join games instantly
- 🔒 **Privacy Preserving**: Moves remain hidden until game completion
- 🌐 **Web3 Integration**: MetaMask wallet connection
- 📱 **Responsive Design**: Works on desktop and mobile with Zama's yellow theme
- ⚡ **Sepolia Testnet**: Live on Ethereum testnet

## 🏗️ Architecture

### Smart Contract
- **Language**: Solidity 0.8.27
- **Framework**: Hardhat with FHEVM plugin
- **Network**: Sepolia Testnet
- **FHEVM Version**: v0.8
- **Encryption**: Zama's Fully Homomorphic Encryption

### Frontend
- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS v4 with Zama yellow theme
- **Web3**: fhevmjs, viem, wagmi
- **UI Components**: shadcn/ui
- **Deployment**: Vercel

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- MetaMask wallet
- Sepolia ETH (for gas fees)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone https://github.com/yourusername/fhevm-rock-paper-scissors.git
   cd fhevm-rock-paper-scissors
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Set up environment variables**
   \`\`\`bash
   # Create .env file
   cp .env.example .env
   
   # Add your Sepolia RPC URL
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   PRIVATE_KEY=your_private_key_here
   \`\`\`

4. **Deploy the smart contract**
   \`\`\`bash
   npm run deploy:contract
   \`\`\`

5. **Run the development server**
   \`\`\`bash
   npm run dev
   \`\`\`

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

\`\`\`bash
# Blockchain Configuration
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
PRIVATE_KEY=your_private_key_here

# Frontend Configuration (optional)
NEXT_PUBLIC_CONTRACT_ADDRESS=deployed_contract_address
NEXT_PUBLIC_NETWORK=sepolia
NEXT_PUBLIC_CHAIN_ID=11155111
\`\`\`

### Contract Configuration

After deployment, update the contract address in your frontend configuration.

## 🎯 How It Works

### Game Flow

1. **Create Game**: Player 1 creates a new game and receives a game ID
2. **Join Game**: Player 2 joins using the game ID
3. **Submit Encrypted Moves**: Both players submit their moves (rock/paper/scissors) encrypted using FHEVM
4. **Compute Result**: FHEVM computes the winner using homomorphic operations without revealing moves
5. **Reveal Result**: Game result is determined and displayed to both players

### FHEVM Integration

The game leverages Zama's FHEVM for privacy-preserving gameplay:

- **Encrypted Move Storage**: Player moves are stored as `euint8` (encrypted uint8)
  - 0 = Rock
  - 1 = Paper
  - 2 = Scissors
- **Homomorphic Operations**: Winner computation using `FHE.eq`, `FHE.and`, `FHE.or`, `FHE.select`
- **Privacy Preservation**: Moves remain encrypted throughout the game lifecycle
- **Zero-Knowledge Proofs**: Input validation without revealing the actual move

### Smart Contract Functions

```solidity
// Create a new game
function createGame() external returns (uint256 gameId)

// Join an existing game
function joinGame(uint256 gameId) external

// Submit encrypted move with ZK proof
function submitMove(
    uint256 gameId, 
    inEuint8 calldata encryptedMove
) external

// Determine winner (called after both moves submitted)
function determineWinner(uint256 gameId) external

// Get game state
function getGameState(uint256 gameId) external view returns (GameState)
