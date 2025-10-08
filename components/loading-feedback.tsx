"use client"

import { useState, useEffect } from "react"

interface LoadingFeedbackProps {
  isLoading: boolean
  stage: "initializing" | "encrypting" | "submitting"
}

export function LoadingFeedback({ isLoading, stage }: LoadingFeedbackProps) {
  const [dots, setDots] = useState("")

  useEffect(() => {
    if (!isLoading) return

    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".")
    }, 500)

    return () => clearInterval(interval)
  }, [isLoading])

  if (!isLoading) return null

  const messages = {
    initializing: "Initializing FHEVM SDK (this may take 10-30 seconds)",
    encrypting: "Encrypting your move with FHE",
    submitting: "Submitting to blockchain"
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <div>
            <p className="font-medium text-gray-900">{messages[stage]}</p>
            <p className="text-sm text-gray-600">{dots}</p>
          </div>
        </div>
        <div className="mt-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "60%" }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
