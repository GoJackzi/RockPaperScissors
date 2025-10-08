# Deployment Guide

## Prerequisites

Before deploying the RockPaperScissors contract to Sepolia, ensure you have:

1. **Sepolia ETH**: Get test ETH from a Sepolia faucet
   - [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
   - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)

2. **RPC URL**: The default Sepolia RPC is configured, but you can use your own:
   - Alchemy: `https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY`
   - Infura: `https://sepolia.infura.io/v3/YOUR-API-KEY`

## Deployment Steps

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Compile the Contract

\`\`\`bash
npm run compile
\`\`\`

This will compile the Solidity contract and generate the necessary artifacts.

### 3. Deploy to Sepolia

\`\`\`bash
npm run deploy:contract
\`\`\`

The deployment script will:
- Connect to Sepolia network
- Deploy the RockPaperScissors contract
- Display the contract address
- Show your deployer address and balance

### 4. Save Contract Address

After deployment, you'll see output like:

\`\`\`
Deploying RockPaperScissors contract to Sepolia...
Deploying with account: 0x...
Account balance: 0.5 ETH
RockPaperScissors deployed to: 0xABCDEF123456...

=== Deployment Complete ===
Contract Address: 0xABCDEF123456...
Network: Sepolia
Deployer: 0x...

Add this to your .env file:
NEXT_PUBLIC_CONTRACT_ADDRESS=0xABCDEF123456...
NEXT_PUBLIC_CHAIN_ID=11155111
\`\`\`

### 5. Update Environment Variables

Create a `.env.local` file in the root directory and add:

\`\`\`env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
NEXT_PUBLIC_CHAIN_ID=11155111
\`\`\`

### 6. Verify Contract (Optional)

To verify your contract on Etherscan:

\`\`\`bash
npx hardhat verify --network sepolia YOUR_CONTRACT_ADDRESS
\`\`\`

## Contract Configuration

The contract is configured for Sepolia network with:
- Solidity version: 0.8.24
- EVM version: Cancun
- Optimizer: Enabled (200 runs)
- Network: Sepolia (Chain ID: 11155111)

## Troubleshooting

### Insufficient Funds
If you see "insufficient funds for gas", get more Sepolia ETH from a faucet.

### RPC Connection Issues
If deployment fails, try using a different RPC URL in `hardhat.config.ts`:

\`\`\`typescript
sepolia: {
  url: "https://eth-sepolia.g.alchemy.com/v2/YOUR-API-KEY",
  // ... rest of config
}
\`\`\`

### Contract Verification
If verification fails, ensure you're using the correct compiler version and constructor arguments.

## Next Steps

After deployment:
1. Update the frontend with the contract address
2. Test the contract on Sepolia testnet
3. Integrate with FHEVM gateway for encrypted operations
4. Add wallet connection functionality
