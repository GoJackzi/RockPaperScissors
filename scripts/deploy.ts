import { ethers } from "hardhat"

async function main() {
  console.log("Deploying RockPaperScissors contract to Sepolia...")

  const [deployer] = await ethers.getSigners()
  console.log("Deploying with account:", deployer.address)

  const balance = await ethers.provider.getBalance(deployer.address)
  console.log("Account balance:", ethers.formatEther(balance), "ETH")

  // Deploy the contract
  const RockPaperScissors = await ethers.getContractFactory("RockPaperScissors")
  const rps = await RockPaperScissors.deploy()

  await rps.waitForDeployment()

  const contractAddress = await rps.getAddress()
  console.log("RockPaperScissors deployed to:", contractAddress)

  // Save deployment info
  console.log("\n=== Deployment Complete ===")
  console.log("Contract Address:", contractAddress)
  console.log("Network: Sepolia")
  console.log("Deployer:", deployer.address)
  console.log("\nAdd this to your .env file:")
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${contractAddress}`)
  console.log(`NEXT_PUBLIC_CHAIN_ID=11155111`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
