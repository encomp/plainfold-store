import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { pfDb } from '../db'

beforeEach(async () => {
  await pfDb.open()
})

afterEach(async () => {
  await pfDb.delete()
})

describe('Settings', () => {
  it('returns undefined for missing key', async () => {
    const { Settings } = await import('../settings')
    const result = await Settings.get('nonexistent')
    expect(result).toBeUndefined()
  })

  it('stores and retrieves a string', async () => {
    const { Settings } = await import('../settings')
    await Settings.set('name', 'Alice')
    const result = await Settings.get<string>('name')
    expect(result).toBe('Alice')
  })

  it('stores and retrieves a complex object', async () => {
    const { Settings } = await import('../settings')
    const obj = { nested: { value: 42 }, list: [1, 2, 3] }
    await Settings.set('complex', obj)
    const result = await Settings.get<typeof obj>('complex')
    expect(result).toEqual(obj)
  })

  it('overwrites existing values', async () => {
    const { Settings } = await import('../settings')
    await Settings.set('key', 'first')
    await Settings.set('key', 'second')
    const result = await Settings.get<string>('key')
    expect(result).toBe('second')
  })

  it('set returns the key', async () => {
    const { Settings } = await import('../settings')
    const returnedKey = await Settings.set('mykey', 123)
    expect(returnedKey).toBe('mykey')
  })

  it('removes a value', async () => {
    const { Settings } = await import('../settings')
    await Settings.set('key', 'value')
    await Settings.remove('key')
    const result = await Settings.get('key')
    expect(result).toBeUndefined()
  })

  it('remove is a no-op for missing keys', async () => {
    const { Settings } = await import('../settings')
    await expect(Settings.remove('nonexistent')).resolves.toBeUndefined()
  })
})

describe('clearAll', () => {
  it('removes all settings', async () => {
    const { Settings } = await import('../settings')
    const { clearAll } = await import('../settings')
    await Settings.set('a', 1)
    await Settings.set('b', 2)
    await Settings.set('c', 3)
    await clearAll()
    expect(await Settings.get('a')).toBeUndefined()
    expect(await Settings.get('b')).toBeUndefined()
    expect(await Settings.get('c')).toBeUndefined()
  })

  it('is safe to call on empty store', async () => {
    const { clearAll } = await import('../settings')
    await expect(clearAll()).resolves.toBeUndefined()
  })
})
