# FHE Rock Paper Scissors Demo

A demonstration of Zama's Fully Homomorphic Encryption (FHEVM) using a simple Rock Paper Scissors game. Watch your moves get encrypted, computed on-chain while still encrypted, and then decrypted to reveal the winner.

## What This Demonstrates

This project shows the complete FHE lifecycle:

1. **Client-side encryption** - Your move is encrypted in the browser before touching the blockchain
2. **On-chain encrypted computation** - The smart contract determines the winner without ever seeing the actual moves
3. **Async decryption** - Results are decrypted only after both players commit
4. **Live process tracking** - The Game Process Monitor shows every FHE operation in real-time

The game is simple on purpose - Rock Paper Scissors is just a vehicle to demonstrate how FHE works.

## Game Process Monitor

The most important feature is the live activity monitor at the bottom of the screen. It shows you:

- When moves are being encrypted
- When zero-knowledge proofs are generated
- When encrypted data is submitted to the blockchain
- When the contract requests decryption
- When results are revealed

This lets you see exactly what's happening with your encrypted data at each step.

## How FHE Works Here

**Encryption Phase:**
- You pick rock, paper, or scissors
- The move is encrypted in your browser using FHEVM
- A zero-knowledge proof is generated to verify the encrypted input is valid
- Both encrypted move and proof are sent to the smart contract

**Computation Phase:**
- Smart contract receives both encrypted moves
- Contract logic runs: `if (move1 beats move2)` - but on encrypted data
- Winner is determined without decrypting the moves
- Everything stays encrypted on-chain

**Decryption Phase:**
- Player requests game resolution
- Contract sends encrypted result to FHEVM oracle
- Oracle decrypts and returns result via callback
- Winner is revealed

The blockchain never sees your actual move until the decryption phase. That's FHE in action.

## Try It Yourself

```bash
git clone https://github.com/GoJackzi/RockPaperScissors.git
cd RockPaperScissors
npm install --legacy-peer-deps
npm run dev
```

You'll need:
- Node.js 18+
- MetaMask
- Sepolia testnet ETH

Create `.env.local`:
```env
NEXT_PUBLIC_FHEVM_RELAYER_URL=https://relayer.testnet.zama.cloud
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
NEXT_PUBLIC_CONTRACT_ADDRESS=0x19AC891d6d1c91fb835d87Aef919C2F199c0E469
NEXT_PUBLIC_CHAIN_ID=11155111
```

Play a game and watch the Game Process Monitor to see FHE in action.

## Contract Details

- **Network:** Sepolia Testnet
- **Address:** `0x19AC891d6d1c91fb835d87Aef919C2F199c0E469`
- **View on Etherscan:** [Contract Link](https://sepolia.etherscan.io/address/0x19AC891d6d1c91fb835d87Aef919C2F199c0E469)

The contract uses Zama's FHEVM library to perform computations on encrypted data (euint8 types for moves, ebool for comparisons).

## Tech Stack

- Frontend: Next.js 15, React 19, TypeScript
- Smart Contract: Solidity 0.8.24 with FHEVM
- Encryption: Zama FHEVM v0.8
- Network: Sepolia testnet
- Deployment: Vercel

## Learn More

- [Zama FHEVM Documentation](https://docs.zama.ai/fhevm)
- [What is Fully Homomorphic Encryption?](https://en.wikipedia.org/wiki/Homomorphic_encryption)

## License

MIT

---

Built to demonstrate Zama's FHEVM technology
