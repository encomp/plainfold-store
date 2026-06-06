import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { pfDb } from '../db'

beforeEach(async () => {
  await pfDb.open()
})

afterEach(async () => {
  await pfDb.delete()
})

describe('useSettings', () => {
  it('returns get, set, remove functions', async () => {
    const { useSettings } = await import('../useSettings')
    const { result } = renderHook(() => useSettings())
    expect(typeof result.current.get).toBe('function')
    expect(typeof result.current.set).toBe('function')
    expect(typeof result.current.remove).toBe('function')
  })

  it('get/set roundtrip works', async () => {
    const { useSettings } = await import('../useSettings')
    const { result } = renderHook(() => useSettings())

    await act(async () => {
      await result.current.set('test-key', { data: 'hello' })
    })

    const value = await result.current.get<{ data: string }>('test-key')
    expect(value).toEqual({ data: 'hello' })
  })

  it('remove works', async () => {
    const { useSettings } = await import('../useSettings')
    const { result } = renderHook(() => useSettings())

    await act(async () => {
      await result.current.set('remove-me', 'value')
    })

    await act(async () => {
      await result.current.remove('remove-me')
    })

    const value = await result.current.get('remove-me')
    expect(value).toBeUndefined()
  })

  it('returns stable reference across renders', async () => {
    const { useSettings } = await import('../useSettings')
    const { result, rerender } = renderHook(() => useSettings())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
