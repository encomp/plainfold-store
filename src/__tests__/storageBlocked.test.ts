import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())

// Dexie reads `indexedDB` when it loads, so load the store after each stub.
describe.each([
  ['throws', { open: () => { throw new Error('SecurityError') } }],
  ['is undefined', undefined],
])('Settings when indexedDB %s', (_n, idb) => {
  async function load() {
    vi.resetModules()
    vi.stubGlobal('indexedDB', idb)
    return (await import('../settings')).Settings
  }
  const settle = (p: Promise<unknown>) => Promise.race([p.then(() => 'resolved', () => 'rejected'), new Promise((r) => setTimeout(() => r('pending'), 500))])

  it('get settles', async () => {
    expect(await settle((await load()).get('k'))).not.toBe('pending')
  })
  it('set settles', async () => {
    expect(await settle((await load()).set('k', 1))).not.toBe('pending')
  })
})
