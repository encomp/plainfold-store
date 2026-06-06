import { useState, useEffect, type ReactNode } from 'react'
import { pfDb } from './db'

interface PfStoreReadyProps {
  children: ReactNode
  fallback?: ReactNode
}

export function PfStoreReady({ children, fallback }: PfStoreReadyProps) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    pfDb.open()
      .then(() => setReady(true))
      .catch((err) => setError(err))
  }, [])

  if (error) throw error

  if (!ready) return fallback ? <>{fallback}</> : null

  return <>{children}</>
}
