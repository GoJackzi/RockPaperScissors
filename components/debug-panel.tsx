"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronUp, Copy, Trash2, Eye, EyeOff } from "lucide-react"

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error' | 'debug'
  category: 'fhevm' | 'game' | 'blockchain' | 'ui'
  message: string
  data?: any
}

// Filter function to show the complete game process from start to finish
function isRelevantLog(log: LogEntry): boolean {
  // Show FHEVM operations (encryption/decryption)
  if (log.category === 'fhevm') {
    return log.message.includes('Encrypting move') || 
           log.message.includes('encryption completed') ||
           log.message.includes('Ciphertext extracted') ||
           log.message.includes('Proof converted') ||
           log.message.includes('FHEVM instance created') ||
           log.message.includes('SDK initialized') ||
           log.message.includes('Fresh FHEVM instance created')
  }
  
  // Show ALL game state changes (complete process)
  if (log.category === 'game') {
    return log.message.includes('Game state changed') ||
           log.message.includes('Submitting move') ||
           log.message.includes('Move encryption completed') ||
           log.message.includes('Status changed') ||
           log.message.includes('Game results fetched') ||
           log.message.includes('Failed to fetch game results') ||
           log.message.includes('Starting game creation') ||
           log.message.includes('Starting to join game') ||
           log.message.includes('Game created successfully') ||
           log.message.includes('Player 2 joined') ||
           log.message.includes('Both players have submitted') ||
           log.message.includes('Decryption started') ||
           log.message.includes('Decryption completed')
  }
  
  // Show ALL blockchain interactions (complete process)
  if (log.category === 'blockchain') {
    return log.message.includes('Creating new game') ||
           log.message.includes('Game creation transaction') ||
           log.message.includes('Requesting game resolution') ||
           log.message.includes('Game resolution request') ||
           log.message.includes('Move encryption completed, submitting') ||
           log.message.includes('Manual status check requested') ||
           log.message.includes('Failed to create game') ||
           log.message.includes('Failed to request game resolution') ||
           log.message.includes('Join game transaction') ||
           log.message.includes('Joining game')
  }
  
  // Show important UI state changes
  if (log.category === 'ui') {
    return log.message.includes('Game state saved') ||
           log.message.includes('Game state cleared') ||
           log.message.includes('Game state restored') ||
           log.message.includes('Game interface initialized') ||
           log.message.includes('Wallet connected') ||
           log.message.includes('Wallet disconnected') ||
           log.message.includes('Restoring game')
  }
  
  return false
}

interface DebugPanelProps {
  logs: LogEntry[]
  onClearLogs: () => void
}

export function DebugPanel({ logs, onClearLogs }: DebugPanelProps) {
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Filter logs to show only relevant ones (temporarily show all for debugging)
  const relevantLogs = logs.filter(isRelevantLog)
  
  // Debug: Show all logs if no relevant logs found
  const displayLogs = relevantLogs.length > 0 ? relevantLogs : logs.slice(-10) // Show last 10 logs if no relevant ones

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [relevantLogs, autoScroll])

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'success': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      case 'debug': return 'text-blue-400'
      default: return 'text-white'
    }
  }

  const getCategoryColor = (category: LogEntry['category']) => {
    switch (category) {
      case 'fhevm': return 'bg-purple-600'
      case 'game': return 'bg-blue-600'
      case 'blockchain': return 'bg-green-600'
      case 'ui': return 'bg-orange-600'
      default: return 'bg-gray-600'
    }
  }

  const copyLogs = () => {
    const logText = displayLogs.map(log => 
      `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.category}] ${log.message}${log.data ? '\n' + JSON.stringify(log.data, null, 2) : ''}`
    ).join('\n')
    navigator.clipboard.writeText(logText)
  }

  return (
    <Card className="w-full bg-gray-900/95 border-gray-700 text-white shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base font-mono flex items-center gap-2">
              <span className="text-green-400">●</span>
              Game Process Monitor
              <span className="text-xs text-gray-400 font-normal">(Live Activity)</span>
            </CardTitle>
            <p className="text-xs text-gray-400 italic">
              Please be patient as the network is slow & keep an eye on this log to understand how FHE is working
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              onClick={copyLogs}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              onClick={onClearLogs}
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{displayLogs.length} log entries {relevantLogs.length === 0 && logs.length > 0 ? '(showing recent)' : ''} (filtered from {logs.length} total)</span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="w-3 h-3"
                  />
                  Auto-scroll
                </label>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded p-3 h-64 overflow-y-auto font-mono text-xs border border-gray-600">
              {displayLogs.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  <div className="text-lg mb-2">🎮</div>
                  <div className="text-sm">Game Process Monitor</div>
                  <div className="text-xs mt-1 text-gray-500">Ready to track your game from start to finish</div>
                  <div className="text-xs mt-2 text-gray-600">Connect wallet and start a game to see live process logs</div>
                </div>
              ) : (
                displayLogs.map((log) => (
                  <div key={log.id} className="mb-2 border-l-2 border-gray-600 pl-3">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 text-xs whitespace-nowrap">
                        [{log.timestamp}]
                      </span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs px-1 py-0 ${getCategoryColor(log.category)} text-white`}
                      >
                        {log.category}
                      </Badge>
                      <span className={`text-xs ${getLevelColor(log.level)}`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-2 mt-1">
                      <div className="text-white">{log.message}</div>
                      {log.data && (
                        <div className="text-gray-400 mt-1 whitespace-pre-wrap text-xs">
                          {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook to manage debug logs
export function useDebugLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])

  const addLog = useCallback((level: LogEntry['level'], category: LogEntry['category'], message: string, data?: any) => {
    const timestamp = new Date().toLocaleTimeString()
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    setLogs(prev => [...prev, { id, timestamp, level, category, message, data }])
  }, [])

  const clearLogs = useCallback(() => {
    setLogs([])
  }, [])

  return {
    logs,
    addLog,
    clearLogs
  }
}
