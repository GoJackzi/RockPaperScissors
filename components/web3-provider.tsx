"use client"

import { ReactNode } from "react"
import { WagmiProvider } from "wagmi"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import { defineChain } from "viem"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@rainbow-me/rainbowkit/styles.css"

// Define custom Sepolia chain with specific RPC
const sepolia = defineChain({
  id: 11155111,
  name: 'Sepolia',
  network: 'sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com'],
    },
  },
  blockExplorers: {
    default: { name: 'Etherscan', url: 'https://sepolia.etherscan.io' },
  },
  testnet: true,
})

const config = getDefaultConfig({
  appName: "Encrypted Rock Paper Scissors",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "d1c3e2e49706048e1359fb9c3c1f5474",
  chains: [sepolia],
  ssr: false,
  // Suppress WalletConnect warnings
  appInfo: {
    appName: "Encrypted Rock Paper Scissors",
    appDescription: "Privacy-preserving Rock Paper Scissors game",
    appUrl: "https://your-app-url.com",
    appIcon: "https://your-app-icon.com/icon.png",
  },
})

const queryClient = new QueryClient()

interface Web3ProviderProps {
  children: ReactNode
}

export function Web3Provider({ children }: Web3ProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
