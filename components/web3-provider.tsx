"use client"

import { ReactNode } from "react"
import { WagmiProvider } from "wagmi"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import { sepolia } from "wagmi/chains"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "@rainbow-me/rainbowkit/styles.css"

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
