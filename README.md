# Encrypted Rock Paper Scissors with fhEVM

A privacy-preserving Rock Paper Scissors game built with Zama's fhEVM (Fully Homomorphic Encryption Virtual Machine) technology.

## Features

- **Complete Privacy**: Player moves are encrypted using FHE and remain confidential until both players commit
- **Provably Fair**: Zero-knowledge proofs ensure moves are valid without revealing them early
- **On-Chain Logic**: All game logic runs on-chain with encrypted computation
- **Modern UI**: Clean, crypto-native interface built with Next.js and Tailwind CSS

## How It Works

1. **Player 1 Creates Game**: A new game is created on-chain
2. **Player 2 Joins**: Second player joins the game
3. **Encrypted Moves**: Both players submit their moves (rock/paper/scissors) encrypted using FHE
4. **On-Chain Computation**: The smart contract determines the winner using FHE operations without decrypting the moves
5. **Result Reveal**: Winner is determined and revealed to both players

## Technology Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Smart Contracts**: Solidity with fhEVM v0.8
- **Encryption**: Zama's Fully Homomorphic Encryption
- **Blockchain**: Ethereum (Sepolia testnet)

## Smart Contract

The `RockPaperScissors.sol` contract uses fhEVM's encrypted types:

- `euint8` for encrypted moves (0=rock, 1=paper, 2=scissors)
- `externalEuint8` for accepting encrypted inputs from users
- FHE operations (`FHE.eq`, `FHE.and`, `FHE.or`) for determining winners
- Zero-knowledge proofs for input validation

## Development

### Prerequisites

- Node.js 18+ (LTS version)
- Hardhat for smart contract development
- MetaMask or similar Web3 wallet

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Hardhat configuration variables (see fhEVM docs)
4. Deploy the smart contract to Sepolia testnet
5. Update contract address in the frontend
6. Run the development server: `npm run dev`

## fhEVM Integration

This project uses Zama's fhEVM library for Fully Homomorphic Encryption:

- Encrypted types: `euint8`, `ebool`
- FHE operations for private computation
- Access control for encrypted data
- Zero-knowledge proofs for input validation

For more information, visit [Zama's documentation](https://docs.zama.ai).

## License

MIT
