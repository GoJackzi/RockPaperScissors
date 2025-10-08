<div align="center">

# 🪨📄✂️ Encrypted Rock Paper Scissors

**A privacy-preserving Rock Paper Scissors game powered by Zama's fhEVM technology**

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=for-the-badge&logo=vercel)](https://encrypted-rock-paper-scissors.vercel.app)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Powered by fhEVM](https://img.shields.io/badge/Powered%20by-fhEVM-FF6B6B?style=for-the-badge)](https://docs.zama.ai)
[![Sepolia Testnet](https://img.shields.io/badge/Network-Sepolia-627EEA?style=for-the-badge)](https://sepolia.etherscan.io/address/0x4D0043ee8B496cDB6e6A6CEEcDeb8f3c55708e01)

[🎮 **Play Now**](https://encrypted-rock-paper-scissors.vercel.app) • [📖 **Documentation**](#how-it-works) • [🚀 **Deploy**](#deployment)

</div>

---

## 🔐 What Makes This Special?

This isn't your ordinary Rock Paper Scissors game. Built with **Zama's Fully Homomorphic Encryption (FHE)**, this game ensures complete privacy and fairness:

- 🔒 **Your moves stay secret** until both players commit
- ⚡ **On-chain computation** without revealing private data
- 🛡️ **Zero-knowledge proofs** guarantee valid moves
- 🎯 **Provably fair** gameplay with cryptographic guarantees

## 👥 How to Play (Opponent System)

This game is designed for **two human players** to compete against each other:

### 🎮 **Game Flow:**
1. **Player 1** creates a new game and gets a **Game ID**
2. **Player 1** shares the Game ID with **Player 2** (friend, colleague, etc.)
3. **Player 2** joins the game using the Game ID
4. Both players **encrypt their moves** using FHE
5. **Smart contract** determines the winner using encrypted computation
6. **Results are revealed** to both players

### 🤝 **Finding Opponents:**
- **Friends & Family**: Share Game IDs with people you know
- **Colleagues**: Challenge coworkers during breaks
- **Social Media**: Post Game IDs on Twitter/Discord
- **Gaming Communities**: Join crypto gaming groups
- **Tournaments**: Organize competitions with Game ID sharing

## ✨ Features

<table>
<tr>
<td width="50%">

### 🔐 **Complete Privacy**
- Moves encrypted using FHE technology
- No premature reveals or cheating
- Cryptographic proof of fairness

### 🎮 **Modern UI**
- Built with Next.js 15 & React 19
- Beautiful Tailwind CSS design
- Responsive and mobile-friendly

</td>
<td width="50%">

### ⚡ **On-Chain Logic**
- All computation happens on-chain
- Transparent and verifiable
- No trusted intermediaries

### 🛡️ **Zero-Knowledge**
- Prove move validity without revealing
- Cryptographic input validation
- Trustless gameplay

</td>
</tr>
</table>

## 🎯 How It Works

```mermaid
sequenceDiagram
    participant P1 as Player 1
    participant P2 as Player 2
    participant SC as Smart Contract
    participant FHE as fhEVM

    P1->>SC: Create Game
    P2->>SC: Join Game
    P1->>FHE: Encrypt Move
    P1->>SC: Submit Encrypted Move
    P2->>FHE: Encrypt Move
    P2->>SC: Submit Encrypted Move
    SC->>FHE: Compute Winner (Encrypted)
    FHE->>SC: Return Result
    SC->>P1: Reveal Winner
    SC->>P2: Reveal Winner
```

### Step-by-Step Process:

1. **🎮 Game Creation**: Player 1 creates a new game on-chain
2. **🤝 Join Game**: Player 2 joins the existing game
3. **🔒 Encrypt Moves**: Both players encrypt their moves using FHE
4. **📤 Submit Moves**: Encrypted moves are submitted to the contract
5. **⚡ Compute Winner**: Contract determines winner using FHE operations
6. **🏆 Reveal Result**: Winner is revealed to both players

## 🛠️ Technology Stack

<table>
<tr>
<td align="center" width="25%">

### 🎨 **Frontend**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Radix UI

</td>
<td align="center" width="25%">

### ⛓️ **Blockchain**
- Solidity 0.8.24
- Hardhat
- Ethers.js
- Sepolia Testnet

</td>
<td align="center" width="25%">

### 🔐 **Encryption**
- Zama fhEVM
- Fully Homomorphic Encryption
- Zero-Knowledge Proofs
- Encrypted Types (euint8, ebool)

</td>
<td align="center" width="25%">

### 🚀 **Deployment**
- Vercel
- GitHub Actions
- Sepolia Network
- Public RPC

</td>
</tr>
</table>

## 🏗️ Smart Contract Architecture

The `RockPaperScissors.sol` contract leverages fhEVM's powerful encrypted computation:

```solidity
// Encrypted move types
euint8 encryptedMove1;  // Player 1's encrypted move
euint8 encryptedMove2;  // Player 2's encrypted move

// FHE operations for winner determination
ebool isDraw = FHE.eq(move1, move2);
ebool player1Wins = FHE.or(rockBeatsScissors, paperBeatsRock, scissorsBeatsPaper);
```

### Key Features:
- 🔢 **Encrypted Types**: `euint8` for moves, `ebool` for comparisons
- 🧮 **FHE Operations**: `FHE.eq`, `FHE.and`, `FHE.or` for computations
- 🛡️ **Input Validation**: Zero-knowledge proofs for move verification
- 🔐 **Access Control**: Permission-based encrypted data access

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS version)
- MetaMask or Web3 wallet
- Sepolia ETH ([Get from faucet](https://sepoliafaucet.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/GoJackzi/RockPaperScissors.git
cd RockPaperScissors

# Install dependencies
npm install --legacy-peer-deps

# Run development server
npm run dev
```

### Environment Setup

Create a `.env.local` file:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x4D0043ee8B496cDB6e6A6CEEcDeb8f3c55708e01
NEXT_PUBLIC_CHAIN_ID=11155111
```

## 🔗 Contract Information

| Property | Value |
|----------|-------|
| **Contract Address** | [`0x4D0043ee8B496cDB6e6A6CEEcDeb8f3c55708e01`](https://sepolia.etherscan.io/address/0x4D0043ee8B496cDB6e6A6CEEcDeb8f3c55708e01) |
| **Network** | Sepolia Testnet |
| **Chain ID** | 11155111 |
| **Compiler** | Solidity 0.8.24 |
| **EVM Version** | Cancun |

## 📚 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Smart Contracts
npm run compile      # Compile contracts
npm run deploy:contract  # Deploy to Sepolia

# Utilities
npm run lint         # Run ESLint
```

## 🌐 Live Demo

**[🎮 Play the game live!](https://encrypted-rock-paper-scissors.vercel.app)**

- Switch to Sepolia network in MetaMask
- Get Sepolia ETH from a faucet
- Create or join a game
- Experience privacy-preserving gameplay!

## 🔍 fhEVM Integration

This project showcases the power of Zama's fhEVM:

### Encrypted Types
```solidity
euint8 encryptedMove;     // Encrypted 8-bit integer
ebool comparison;         // Encrypted boolean
externalEuint8 input;     // External encrypted input
```

### FHE Operations
```solidity
// Equality check
ebool isEqual = FHE.eq(move1, move2);

// Logical operations
ebool result = FHE.and(condition1, condition2);
ebool winner = FHE.or(option1, option2);
```

### Access Control
```solidity
// Grant permission to view encrypted data
FHE.allowTransient(encryptedData, userAddress);
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📖 Learn More

- [Zama fhEVM Documentation](https://docs.zama.ai/fhevm)
- [Fully Homomorphic Encryption](https://en.wikipedia.org/wiki/Homomorphic_encryption)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Zama](https://zama.ai) for the amazing fhEVM technology
- [Vercel](https://vercel.com) for seamless deployment
- [Next.js](https://nextjs.org) team for the incredible framework
- [Tailwind CSS](https://tailwindcss.com) for beautiful styling

---

<div align="center">

**Built with Agape ❤️ for Zama**

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/GoJackzi/RockPaperScissors)
[![Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)]([https://twitter.com](https://x.com/tardhus))

</div>
