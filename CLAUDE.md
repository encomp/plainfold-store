# @plainfold/store

Dexie-backed key-value settings store for the Plainfold ecosystem. Foundation package — all other Plainfold packages depend on this for persistence.

## Architecture

Position in dependency graph: **foundation layer**. No Plainfold dependencies. Everything above (design-tokens, ui, i18n, backup, onboarding, preferences) depends on this.

Persistence: IndexedDB via Dexie. Internal database named `PfSettingsDB` with a single `settings` table (primary key: `key`). Separate from the app's domain database.

## Public API

### PfStoreReady
Readiness gate. Renders `fallback` until Dexie is initialized, then renders `children`. All other Plainfold providers nest inside this.

```tsx
<PfStoreReady fallback={<SplashScreen />}>
  {/* Other providers + app */}
</PfStoreReady>
```

### useSettings()
Hook returning `{ get, set, remove }` for key-value persistence.

```typescript
const { get, set, remove } = useSettings()
await set('pf:theme:activeTheme', themeObj)
const theme = await get<PfTheme>('pf:theme:activeTheme')
await remove('pf:theme:activeTheme')
```

### clearAll()
Wipes the entire settings table. Used by PfDangerZone.

## Key Decisions

- **Dexie is a peer dependency** — the app provides it, preventing duplicate IndexedDB instances
- **Namespace convention:** packages use `pf:<package>:*` keys, apps use `app:*`
- **PfStoreReady must wrap all other providers** — ensures DB is ready before any reads
- **React >= 19 only** — no React 18 compatibility

## Development

```bash
npm install
npm test           # Vitest (fake-indexeddb for IndexedDB in jsdom)
npm run build      # ESM + CJS via Vite library mode
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Testing

Uses fake-indexeddb to provide IndexedDB in jsdom. Each test opens a fresh database and deletes it in afterEach.

## CI/CD

PR: lint → typecheck → test → build. Publishing via Changesets.
