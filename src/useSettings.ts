import { useMemo } from 'react'
import { Settings } from './settings'

export function useSettings() {
  return useMemo(() => Settings, [])
}
