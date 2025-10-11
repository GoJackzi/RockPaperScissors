"use client"

import { Shield, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAccount, useDisconnect } from "wagmi"

export function Header() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">FHE Powered Game</span>
          </div>


          {isConnected && address ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => disconnect()}
              className="flex items-center gap-2"
            >
              <Wallet className="w-4 h-4" />
              {formatAddress(address)}
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  )
}
