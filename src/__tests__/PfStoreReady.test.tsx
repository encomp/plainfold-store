import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { pfDb } from '../db'

afterEach(async () => {
  await pfDb.delete()
})

describe('PfStoreReady', () => {
  it('shows fallback initially', async () => {
    const { PfStoreReady } = await import('../PfStoreReady')
    render(
      <PfStoreReady fallback={<div>Loading...</div>}>
        <div>Content</div>
      </PfStoreReady>
    )
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders children when database is ready', async () => {
    const { PfStoreReady } = await import('../PfStoreReady')
    render(
      <PfStoreReady fallback={<div>Loading...</div>}>
        <div>Content</div>
      </PfStoreReady>
    )
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  it('renders children without fallback prop', async () => {
    const { PfStoreReady } = await import('../PfStoreReady')
    render(
      <PfStoreReady>
        <div>Content</div>
      </PfStoreReady>
    )
    await waitFor(() => {
      expect(screen.getByText('Content')).toBeInTheDocument()
    })
  })

  it('renders nothing when no fallback and not ready', async () => {
    const { PfStoreReady } = await import('../PfStoreReady')
    const { container } = render(
      <PfStoreReady>
        <div>Content</div>
      </PfStoreReady>
    )
    expect(container.innerHTML).toBe('')
  })
})
