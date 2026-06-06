# Plainfold Ecosystem Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract reusable infrastructure from budget-tracker into 11 independent repositories (8 npm packages, 1 shared dev config, 2 GitHub template repos) under the `encomp/` GitHub organization.

**Architecture:** Clean-room rebuild. Each subsystem is extracted from budget-tracker, stripped of domain logic, renamed (Bp → Pf), and verified independently. 6-phase execution follows the dependency graph, with human verification gates between phases. Per-phase workflow orchestration with parallel agents within phases.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Dexie 4, Vitest, Playwright, ESLint 10, Changesets, GitHub Actions

**Spec:** `docs/superpowers/specs/2026-06-06-plainfold-ecosystem-extraction-design.md`

---

## Phase Overview

```
Phase 1 (parallel — no deps):
  Agent A: @plainfold/dev-config    ← shared ESLint + TSConfig + Vite lib config
  Agent B: @plainfold/store         ← Dexie settings persistence + PfStoreReady

Phase 2 (depends on Phase 1):
  Agent C: @plainfold/design-tokens ← theme tokens, validation, provider, library

Phase 3 (parallel — depends on Phase 2):
  Agent D: @plainfold/ui            ← 20+ MD3 components, Storybook, screenshots
  Agent E: @plainfold/charts        ← 4 Nivo wrappers with abstracted API

Phase 4 (parallel — depends on Phase 3):
  Agent F: @plainfold/i18n          ← i18next wrapper, language switcher
  Agent G: @plainfold/backup        ← export/import, reminder system
  Agent H: @plainfold/preferences   ← settings page, theme gallery, danger zone

Phase 5 (depends on Phase 4):
  Agent I: @plainfold/onboarding    ← first-run wizard, completion tracking

Phase 6 (parallel — depends on all):
  Agent J: plainfold-scaffold-app       ← GitHub template, Items domain example
  Agent K: plainfold-scaffold-app-e2e   ← 5-tier E2E framework
```

### Verification Gates

After each phase, before proceeding:
1. All repos build successfully (`npm run build`)
2. All tests pass (`npm test`)
3. Package exports are installable by next-phase packages
4. Storybook renders (if applicable)
5. Screenshot baselines committed (if applicable)

### Plan Structure

This document contains:
- **Phase 1:** Full implementation details with complete code
- **Phases 2–6:** Task structure with files, API signatures, and key patterns. Detailed code for each phase is generated at phase execution time in a separate plan file.

---

## Phase 1A: @plainfold/dev-config

Shared development tooling. ESLint flat config, TypeScript base config, Vite library mode factory. Installed as a git-based devDependency by all packages.

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/eslint.config.js`, `tsconfig.app.json`, `vite.config.ts`

---

### Task 1: Initialize repository and package.json

**Files:**
- Create: `plainfold-dev-config/package.json`
- Create: `plainfold-dev-config/.gitignore`
- Create: `plainfold-dev-config/LICENSE`

- [ ] **Step 1: Create GitHub repo and clone**

```bash
gh repo create encomp/plainfold-dev-config --public --license mit --clone
cd plainfold-dev-config
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@plainfold/dev-config",
  "version": "0.1.0",
  "description": "Shared development configuration for the Plainfold ecosystem",
  "type": "module",
  "exports": {
    "./eslint": "./eslint.config.js",
    "./tsconfig.base.json": "./tsconfig.base.json",
    "./vite-lib": "./vite.lib.config.js"
  },
  "files": [
    "eslint.config.js",
    "tsconfig.base.json",
    "vite.lib.config.js",
    "vite.lib.config.d.ts"
  ],
  "dependencies": {
    "@eslint/js": "^10.0.0",
    "eslint-plugin-react-hooks": "^5.0.0",
    "eslint-plugin-react-refresh": "^0.5.0",
    "typescript-eslint": "^8.0.0",
    "globals": "^16.0.0"
  },
  "peerDependencies": {
    "eslint": ">=10.0.0",
    "typescript": ">=6.0.0",
    "vite": ">=8.0.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
*.tsbuildinfo
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

- [ ] **Step 5: Commit**

```bash
git add package.json .gitignore LICENSE
git commit -m "chore: initialize dev-config package"
```

---

### Task 2: Create ESLint shared config

**Files:**
- Create: `plainfold-dev-config/eslint.config.js`

**Source:** `/Users/edgarrico/budget-tracker/budgetpilot/eslint.config.js`

- [ ] **Step 1: Create ESLint flat config**

```javascript
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export const pfEslintConfig = {
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommended,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
  ],
  languageOptions: {
    globals: globals.browser,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
}

export default [pfEslintConfig]
```

- [ ] **Step 2: Verify ESLint config loads**

```bash
node -e "import('./eslint.config.js').then(m => console.log('OK:', typeof m.pfEslintConfig))"
```

Expected: `OK: object`

- [ ] **Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "feat: add shared ESLint flat config"
```

---

### Task 3: Create TypeScript base config

**Files:**
- Create: `plainfold-dev-config/tsconfig.base.json`

**Source:** `/Users/edgarrico/budget-tracker/budgetpilot/tsconfig.app.json`

- [ ] **Step 1: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "module": "esnext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "erasableSyntaxOnly": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 2: Validate JSON is parseable**

```bash
node -e "const c = require('./tsconfig.base.json'); console.log('target:', c.compilerOptions.target)"
```

Expected: `target: es2023`

- [ ] **Step 3: Commit**

```bash
git add tsconfig.base.json
git commit -m "feat: add shared TypeScript base config"
```

---

### Task 4: Create Vite library config factory

**Files:**
- Create: `plainfold-dev-config/vite.lib.config.js`
- Create: `plainfold-dev-config/vite.lib.config.d.ts`

- [ ] **Step 1: Create Vite library config factory**

```javascript
import { resolve } from 'path'

/**
 * @param {{ entry?: string, external?: string[], plugins?: import('vite').Plugin[] }} options
 * @returns {import('vite').UserConfig}
 */
export function createViteLibConfig({
  entry = 'src/index.ts',
  external = [],
  plugins = [],
} = {}) {
  return {
    plugins,
    build: {
      lib: {
        entry: resolve(process.cwd(), entry),
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
      },
      rollupOptions: {
        external: [
          'react',
          'react-dom',
          'react/jsx-runtime',
          ...external,
        ],
      },
    },
  }
}
```

- [ ] **Step 2: Create type declaration**

```typescript
import type { UserConfig, Plugin } from 'vite'

export function createViteLibConfig(options?: {
  entry?: string
  external?: string[]
  plugins?: Plugin[]
}): UserConfig
```

- [ ] **Step 3: Verify factory loads**

```bash
node -e "import('./vite.lib.config.js').then(m => { const c = m.createViteLibConfig({ external: ['dexie'] }); console.log('formats:', c.build.lib.formats) })"
```

Expected: `formats: [ 'es', 'cjs' ]`

- [ ] **Step 4: Commit**

```bash
git add vite.lib.config.js vite.lib.config.d.ts
git commit -m "feat: add Vite library mode config factory"
```

---

### Task 5: Create CLAUDE.md

**Files:**
- Create: `plainfold-dev-config/CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md**

```markdown
# @plainfold/dev-config

Shared development configuration for the Plainfold ecosystem. Not published to npm — installed as a git-based devDependency.

## Architecture

Foundation package. Every other Plainfold package depends on this as a devDependency. No runtime code — config files only.

## Exports

### ESLint (`@plainfold/dev-config/eslint`)
Flat config with TypeScript, React hooks, React refresh rules. Consumers spread it into their own config:

\`\`\`javascript
import { pfEslintConfig } from '@plainfold/dev-config/eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  pfEslintConfig,
])
\`\`\`

### TypeScript (`@plainfold/dev-config/tsconfig.base.json`)
Strict TypeScript config: ES2023 target, bundler resolution, React JSX.

\`\`\`json
{ "extends": "@plainfold/dev-config/tsconfig.base.json" }
\`\`\`

### Vite Library (`@plainfold/dev-config/vite-lib`)
Factory for Vite library mode builds (ESM + CJS output):

\`\`\`javascript
import { createViteLibConfig } from '@plainfold/dev-config/vite-lib'

export default createViteLibConfig({
  external: ['dexie'],
  plugins: [react(), dts({ rollupTypes: true })],
})
\`\`\`

## Development

\`\`\`bash
npm install
\`\`\`

No build step. Files are consumed directly.

## Key Decisions

- ESLint flat config only (no legacy `.eslintrc`)
- TypeScript strict mode enforced
- Vite library mode with ESM + CJS dual output
- React >= 19 only
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add CLAUDE.md for agent context"
```

---

### Task 6: CI workflow and Changesets

**Files:**
- Create: `plainfold-dev-config/.github/workflows/ci.yml`
- Create: `plainfold-dev-config/.changeset/config.json`

- [ ] **Step 1: Create CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - name: Validate ESLint config loads
        run: node -e "import('./eslint.config.js').then(() => console.log('ESLint config OK'))"
      - name: Validate tsconfig is valid JSON
        run: node -e "require('./tsconfig.base.json'); console.log('tsconfig OK')"
      - name: Validate Vite config factory
        run: node -e "import('./vite.lib.config.js').then(m => { m.createViteLibConfig(); console.log('Vite config OK') })"
```

- [ ] **Step 2: Create Changesets config**

```bash
mkdir -p .changeset
```

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml .changeset/config.json
git commit -m "ci: add validation workflow and changesets config"
```

---

### Task 7: Push to remote

- [ ] **Step 1: Push all commits**

```bash
git push -u origin main
```

- [ ] **Step 2: Verify CI passes**

Check: `gh run list --limit 1`

---

## Phase 1B: @plainfold/store

Foundation persistence layer. Key-value settings store backed by Dexie (IndexedDB). Provides `PfStoreReady`, `useSettings`, and `clearAll`.

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/src/lib/settings.ts`, `/Users/edgarrico/budget-tracker/budgetpilot/src/lib/db.ts`

---

### Task 8: Initialize repository and package.json

**Files:**
- Create: `plainfold-store/package.json`
- Create: `plainfold-store/tsconfig.json`
- Create: `plainfold-store/.gitignore`
- Create: `plainfold-store/LICENSE`

- [ ] **Step 1: Create GitHub repo and clone**

```bash
gh repo create encomp/plainfold-store --public --license mit --clone
cd plainfold-store
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@plainfold/store",
  "version": "0.1.0",
  "description": "Dexie-backed key-value settings store for Plainfold apps",
  "type": "module",
  "main": "dist/index.cjs",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "dexie": ">=4.0.0",
    "react": ">=19.0.0"
  },
  "devDependencies": {
    "@plainfold/dev-config": "github:encomp/plainfold-dev-config",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "dexie": "^4.0.0",
    "eslint": "^10.0.0",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^6.0.0",
    "vite": "^8.0.0",
    "vite-plugin-dts": "^4.0.0",
    "vitest": "^4.0.0"
  },
  "license": "MIT"
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "extends": "@plainfold/dev-config/tsconfig.base.json",
  "compilerOptions": {
    "baseUrl": ".",
    "outDir": "dist"
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
*.tsbuildinfo
```

- [ ] **Step 5: Install dependencies**

```bash
npm install
```

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .gitignore LICENSE
git commit -m "chore: initialize store package"
```

---

### Task 9: Create types and Dexie database

**Files:**
- Create: `plainfold-store/src/types.ts`
- Create: `plainfold-store/src/db.ts`

- [ ] **Step 1: Create PfSetting type**

```typescript
export interface PfSetting {
  key: string
  value: unknown
}
```

- [ ] **Step 2: Create Dexie database**

```typescript
import Dexie from 'dexie'
import type { PfSetting } from './types'

class PfSettingsDB extends Dexie {
  settings!: Dexie.Table<PfSetting, string>

  constructor() {
    super('PfSettingsDB')
    this.version(1).stores({
      settings: 'key',
    })
  }
}

export const pfDb = new PfSettingsDB()
```

- [ ] **Step 3: Commit**

```bash
git add src/types.ts src/db.ts
git commit -m "feat: add PfSetting type and Dexie database"
```

---

### Task 10: TDD Settings get/set/remove

**Files:**
- Create: `plainfold-store/src/test-setup.ts`
- Create: `plainfold-store/src/__tests__/settings.test.ts`
- Create: `plainfold-store/src/settings.ts`

- [ ] **Step 1: Create test setup**

```typescript
import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 2: Create vite.config.ts with test config**

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), dts({ rollupTypes: true })],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'dexie'],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
})
```

- [ ] **Step 3: Write failing tests for Settings**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/settings.test.ts
```

Expected: FAIL — `../settings` module not found

- [ ] **Step 5: Implement Settings**

```typescript
import { pfDb } from './db'

export const Settings = {
  get: <T>(key: string): Promise<T | undefined> =>
    pfDb.settings.get(key).then((r) => r?.value as T | undefined),

  set: (key: string, value: unknown): Promise<string> =>
    pfDb.settings.put({ key, value }),

  remove: (key: string): Promise<void> =>
    pfDb.settings.delete(key),
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/settings.test.ts
```

Expected: all 7 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/test-setup.ts src/__tests__/settings.test.ts src/settings.ts vite.config.ts
git commit -m "feat: implement Settings CRUD with tests"
```

---

### Task 11: TDD clearAll

**Files:**
- Modify: `plainfold-store/src/__tests__/settings.test.ts`
- Modify: `plainfold-store/src/settings.ts`

- [ ] **Step 1: Write failing tests for clearAll**

Add to `src/__tests__/settings.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify clearAll tests fail**

```bash
npx vitest run src/__tests__/settings.test.ts
```

Expected: FAIL — `clearAll` is not exported

- [ ] **Step 3: Implement clearAll**

Add to `src/settings.ts`:

```typescript
export async function clearAll(): Promise<void> {
  await pfDb.settings.clear()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/settings.test.ts
```

Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/settings.test.ts src/settings.ts
git commit -m "feat: implement clearAll for wiping settings store"
```

---

### Task 12: TDD PfStoreReady component

**Files:**
- Create: `plainfold-store/src/__tests__/PfStoreReady.test.tsx`
- Create: `plainfold-store/src/PfStoreReady.tsx`

- [ ] **Step 1: Write failing tests for PfStoreReady**

```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/PfStoreReady.test.tsx
```

Expected: FAIL — `../PfStoreReady` not found

- [ ] **Step 3: Implement PfStoreReady**

```tsx
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/PfStoreReady.test.tsx
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/PfStoreReady.test.tsx src/PfStoreReady.tsx
git commit -m "feat: implement PfStoreReady readiness gate component"
```

---

### Task 13: TDD useSettings hook

**Files:**
- Create: `plainfold-store/src/__tests__/useSettings.test.tsx`
- Create: `plainfold-store/src/useSettings.ts`

- [ ] **Step 1: Write failing tests for useSettings**

```tsx
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/__tests__/useSettings.test.tsx
```

Expected: FAIL — `../useSettings` not found

- [ ] **Step 3: Implement useSettings**

```typescript
import { useMemo } from 'react'
import { Settings } from './settings'

export function useSettings() {
  return useMemo(() => Settings, [])
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/useSettings.test.tsx
```

Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/useSettings.test.tsx src/useSettings.ts
git commit -m "feat: implement useSettings hook"
```

---

### Task 14: Barrel export and build verification

**Files:**
- Create: `plainfold-store/src/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
export { PfStoreReady } from './PfStoreReady'
export { useSettings } from './useSettings'
export { clearAll } from './settings'
export type { PfSetting } from './types'
```

- [ ] **Step 2: Run all tests**

```bash
npx vitest run
```

Expected: all 17 tests PASS

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts` created

- [ ] **Step 4: Verify exports**

```bash
node -e "import('./dist/index.mjs').then(m => console.log(Object.keys(m)))"
```

Expected: `[ 'PfStoreReady', 'useSettings', 'clearAll' ]`

- [ ] **Step 5: Commit**

```bash
git add src/index.ts
git commit -m "feat: add barrel export for public API"
```

---

### Task 15: ESLint config and linting

**Files:**
- Create: `plainfold-store/eslint.config.js`

- [ ] **Step 1: Create ESLint config extending dev-config**

```javascript
import { pfEslintConfig } from '@plainfold/dev-config/eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  pfEslintConfig,
])
```

- [ ] **Step 2: Run linting**

```bash
npx eslint .
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add eslint.config.js
git commit -m "chore: add ESLint config extending dev-config"
```

---

### Task 16: CI workflow, CLAUDE.md, and Changesets

**Files:**
- Create: `plainfold-store/.github/workflows/ci.yml`
- Create: `plainfold-store/.changeset/config.json`
- Create: `plainfold-store/CLAUDE.md`

- [ ] **Step 1: Create CI workflow**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 2: Create Changesets config**

```bash
mkdir -p .changeset
```

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.1.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

- [ ] **Step 3: Write CLAUDE.md**

```markdown
# @plainfold/store

Dexie-backed key-value settings store for the Plainfold ecosystem. Foundation package — all other Plainfold packages depend on this for persistence.

## Architecture

Position in dependency graph: **foundation layer**. No Plainfold dependencies. Everything above (design-tokens, ui, i18n, backup, onboarding, preferences) depends on this.

Persistence: IndexedDB via Dexie. Internal database named `PfSettingsDB` with a single `settings` table (primary key: `key`). Separate from the app's domain database.

## Public API

### PfStoreReady
Readiness gate. Renders `fallback` until Dexie is initialized, then renders `children`. All other Plainfold providers nest inside this.

\`\`\`tsx
<PfStoreReady fallback={<SplashScreen />}>
  {/* Other providers + app */}
</PfStoreReady>
\`\`\`

### useSettings()
Hook returning `{ get, set, remove }` for key-value persistence.

\`\`\`typescript
const { get, set, remove } = useSettings()
await set('pf:theme:activeTheme', themeObj)
const theme = await get<PfTheme>('pf:theme:activeTheme')
await remove('pf:theme:activeTheme')
\`\`\`

### clearAll()
Wipes the entire settings table. Used by PfDangerZone.

## Key Decisions

- **Dexie is a peer dependency** — the app provides it, preventing duplicate IndexedDB instances
- **Namespace convention:** packages use `pf:<package>:*` keys, apps use `app:*`
- **PfStoreReady must wrap all other providers** — ensures DB is ready before any reads
- **React >= 19 only** — no React 18 compatibility

## Development

\`\`\`bash
npm install
npm test           # Vitest (fake-indexeddb for IndexedDB in jsdom)
npm run build      # ESM + CJS via Vite library mode
npm run lint       # ESLint
npm run typecheck  # TypeScript
\`\`\`

## Testing

Uses fake-indexeddb to provide IndexedDB in jsdom. Each test opens a fresh database and deletes it in afterEach.

## CI/CD

PR: lint → typecheck → test → build. Publishing via Changesets.
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml .changeset/config.json CLAUDE.md
git commit -m "ci: add CI workflow, changesets config, and CLAUDE.md"
```

---

### Task 17: Push to remote

- [ ] **Step 1: Push all commits**

```bash
git push -u origin main
```

- [ ] **Step 2: Verify CI passes**

Check: `gh run list --limit 1`

---

## Phase 1 Verification Gate

Before proceeding to Phase 2, verify:

- [ ] `@plainfold/dev-config` repo exists at `encomp/plainfold-dev-config`, CI green
- [ ] `@plainfold/store` repo exists at `encomp/plainfold-store`, CI green
- [ ] `@plainfold/store` builds produce `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts`
- [ ] `@plainfold/store` exports: `PfStoreReady`, `useSettings`, `clearAll`, `PfSetting` (type)
- [ ] A test consumer can install both: `npm install github:encomp/plainfold-dev-config github:encomp/plainfold-store`

---

## Phase 2: @plainfold/design-tokens

> Detailed plan with full code will be generated at Phase 2 execution time. Below is the task structure.

**Depends on:** @plainfold/store (Phase 1)

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/src/lib/theme.ts`, `themes/`, `contrast.ts`, `index.css` (CSS variables)

### Task 18: Initialize repository

**Files:**
- Create: `plainfold-design-tokens/package.json` — deps: `@plainfold/store`, `dompurify`; peerDeps: `react>=19`, `zod>=4`
- Create: `plainfold-design-tokens/tsconfig.json` — extends dev-config
- Create: `plainfold-design-tokens/vite.config.ts`

### Task 19: Define token types and PfTheme interface

**Files:**
- Create: `src/types.ts` — `PfTheme`, `PfThemeTokens`, `ContrastResult` interfaces
- Create: `src/tokens.ts` — `REQUIRED_TOKENS`, `OPTIONAL_TOKENS` arrays with CSS variable names

**Key API:**
```typescript
export interface PfTheme {
  id: string
  name: string
  description: string
  version: string
  tokens: Record<string, string>
  icons?: Record<string, string>
}
```

### Task 20: TDD token defaults CSS and applyTheme

**Files:**
- Create: `src/__tests__/apply-theme.test.ts`
- Create: `src/tokens.css` — all `--pf-*` CSS variable defaults (from budget-tracker's `index.css`, renamed `--bp-*` → `--pf-*`)
- Create: `src/apply-theme.ts` — `applyTheme(theme)`, `resetTheme()`

### Task 21: TDD theme validation (Zod schema + contrast)

**Files:**
- Create: `src/__tests__/validate-theme.test.ts`
- Create: `src/validate-theme.ts` — `pfThemeSchema`, `validateThemeContrast()`
- Create: `src/contrast.ts` — `hexToRgb()`, `getRelativeLuminance()`, `getContrastRatio()`

**Source:** Extract from `budget-tracker/budgetpilot/src/lib/theme.ts` + `contrast.ts`

### Task 22: TDD icon sanitization

**Files:**
- Create: `src/__tests__/sanitize-icon.test.ts`
- Create: `src/sanitize-icon.ts` — `sanitizeSvgIcon()` using DOMPurify

### Task 23: TDD ThemeLibrary and PfDesignTokensProvider

**Files:**
- Create: `src/__tests__/theme-library.test.ts`
- Create: `src/theme-library.ts` — `ThemeLibrary.getAll/add/remove()` via `@plainfold/store`
- Create: `src/__tests__/PfDesignTokensProvider.test.tsx`
- Create: `src/PfDesignTokensProvider.tsx` — reads active theme from store, applies on mount

### Task 24: Create bundled themes

**Files:**
- Create: `src/themes/linen.ts` — warm cream light theme (from budget-tracker, `--bp-*` → `--pf-*`)
- Create: `src/themes/midnight.ts` — dark theme
- Create: `src/themes/focus.ts` — reduced motion theme
- Create: `src/themes/index.ts` — `BUNDLED_THEMES`, `BUNDLED_THEME_IDS`

### Task 25: Barrel export, Storybook, CI, CLAUDE.md

**Files:**
- Create: `src/index.ts` — exports: `PfDesignTokensProvider`, `applyTheme`, `resetTheme`, `pfThemeSchema`, `validateThemeContrast`, `ThemeLibrary`, `BUNDLED_THEMES`, `BUNDLED_THEME_IDS`, `sanitizeSvgIcon`, `pfTokenDefaults` (CSS)
- Create: `.storybook/main.ts`, `.storybook/preview.ts`
- Create: `src/stories/Tokens.stories.tsx` — visual token swatch display
- Create: `.github/workflows/ci.yml`
- Create: `CLAUDE.md`
- Create: `.changeset/config.json`

### Phase 2 Verification Gate

- [ ] Build produces ESM + CJS + types
- [ ] All tests pass (token validation, contrast, sanitization, library CRUD, provider)
- [ ] CSS file importable: `import '@plainfold/design-tokens/tokens.css'`
- [ ] Can install as dependency of Phase 3 packages

---

## Phase 3A: @plainfold/ui

> Detailed plan with full code will be generated at Phase 3 execution time.

**Depends on:** @plainfold/design-tokens (Phase 2)

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/src/components/ui/`, `/Users/edgarrico/budget-tracker/budgetpilot/src/hooks/useBreakpoint.ts`

### Task 26: Initialize repository

**Files:**
- Create: `plainfold-ui/package.json` — deps: `@plainfold/design-tokens`, Radix packages, `motion`, `clsx`; peerDeps: `react>=19`, `react-dom>=19`, `react-hook-form>=7`, `@hookform/resolvers>=5`, `zod>=4`, `lucide-react>=1.0`
- Create: `plainfold-ui/tsconfig.json`, `vite.config.ts`, `eslint.config.js`

### Task 27: Utilities — useBreakpoint, cn, getMotionConfig

**Files:**
- Create: `src/utils/useBreakpoint.ts` — returns `'mobile' | 'tablet' | 'desktop'`, exports `BREAKPOINTS`
- Create: `src/utils/cn.ts` — clsx wrapper
- Create: `src/utils/getMotionConfig.ts` — Motion props respecting `prefers-reduced-motion` + `--pf-motion-intensity`

### Task 28: TDD core components — PfButton, PfCard, PfBadge

**Files:**
- Create: `src/components/PfButton.tsx` + stories + tests
- Create: `src/components/PfCard.tsx` + stories + tests
- Create: `src/components/PfBadge.tsx` + stories + tests

**API principles:**
- Variants via JS objects (not CVA/Tailwind)
- CSS custom properties for theming
- No className merging utilities that depend on Tailwind

### Task 29: TDD feedback components — PfLinearProgress, PfEmptyState, PfSnackbar, PfTooltip

**Files:**
- Create: `src/components/PfLinearProgress.tsx` + stories
- Create: `src/components/PfEmptyState.tsx` + stories
- Create: `src/components/PfSnackbar.tsx` + stories
- Create: `src/components/PfTooltip.tsx` + stories (Radix wrapper, `onClose` not `onOpenChange`)

### Task 30: TDD overlay components — PfDialog, PfConfirmDialog, PfBottomSheet

**Files:**
- Create: `src/components/PfDialog.tsx` + stories — modal on desktop, bottom sheet on mobile via `useBreakpoint()`
- Create: `src/components/PfConfirmDialog.tsx` + stories
- Create: `src/components/PfBottomSheet.tsx` + stories

**API:** Props `open` + `onClose` (not Radix's `onOpenChange`)

### Task 31: TDD form components — PfForm, PfFormTextField, PfFormSelect, PfFormSlider, PfFormSwitch

**Files:**
- Create: `src/components/PfForm.tsx` — FormProvider wrapper with Zod resolver
- Create: `src/components/PfFormTextField.tsx` — connected to RHF Controller
- Create: `src/components/PfFormSelect.tsx` — `options={[{label, value}]}`, `onChange`
- Create: `src/components/PfFormSlider.tsx` — `value`, `onChange`, `min`, `max`, `step`
- Create: `src/components/PfFormSwitch.tsx`
- Tests and stories for each

**API:** Standard React conventions. No Radix props exposed.

### Task 32: TDD navigation components — PfAppScaffold, PfNavDrawer, PfNavBar

**Files:**
- Create: `src/components/PfAppScaffold.tsx` — root layout, orchestrates nav by breakpoint
- Create: `src/components/PfNavDrawer.tsx` — desktop expanded / tablet rail. Props: `items`, `onNavigate`, `isActive`
- Create: `src/components/PfNavBar.tsx` — mobile bottom navigation
- Stories for each

**API:** Router-agnostic via `onNavigate(path)` callback + `isActive` boolean per item

### Task 33: TDD data display components — PfSegmentedButton, PfDataList

**Files:**
- Create: `src/components/PfSegmentedButton.tsx` + stories
- Create: `src/components/PfDataList.tsx` + stories — table on desktop, `renderCard` on mobile

### Task 34: TDD PfErrorBoundary and ThemeIcon

**Files:**
- Create: `src/components/PfErrorBoundary.tsx` + tests — class component error boundary
- Create: `src/components/ThemeIcon.tsx` + stories — renders theme SVG icons with Lucide fallback

### Task 35: Storybook setup and screenshot baselines

**Files:**
- Create: `.storybook/main.ts`, `.storybook/preview.ts`
- Create: `tests/screenshots/` — Playwright screenshot baselines
- Create: `tests/visual.spec.ts` — Playwright tests visiting each story

### Task 36: Barrel export, CI, CLAUDE.md

**Files:**
- Create: `src/index.ts` — all component + utility exports
- Create: `.github/workflows/ci.yml` — build, test, Storybook, screenshots
- Create: `CLAUDE.md`
- Create: `.changeset/config.json`

---

## Phase 3B: @plainfold/charts

> Detailed plan with full code will be generated at Phase 3 execution time.

**Depends on:** @plainfold/design-tokens (Phase 2)

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/src/components/ui/NivoTheme.ts`, chart usage in views

### Task 37: Initialize repository

**Files:**
- Create: `plainfold-charts/package.json` — deps: `@plainfold/design-tokens`, `@nivo/bar`, `@nivo/line`, `@nivo/pie`, `@nivo/heatmap`; peerDeps: `react>=19`, `react-dom>=19`

### Task 38: TDD usePfChartTheme hook

**Files:**
- Create: `src/usePfChartTheme.ts` — reads CSS variables, builds internal Nivo theme object
- Create: `src/__tests__/usePfChartTheme.test.tsx`

### Task 39: TDD chart components — PfBarChart, PfLineChart, PfPieChart, PfHeatmap

**Files:**
- Create: `src/components/PfBarChart.tsx` — `xField`, `yField`, `orientation`, `stacked` props (maps to Nivo internals)
- Create: `src/components/PfLineChart.tsx` — `series`, `curved` props
- Create: `src/components/PfPieChart.tsx` — `labelField`, `valueField`, `donut` props
- Create: `src/components/PfHeatmap.tsx` — uses `--pf-heat-*` tokens
- Stories + tests for each

**API:** No Nivo props exposed. Clean abstraction layer.

### Task 40: Storybook, CI, CLAUDE.md

**Files:**
- Create: `.storybook/main.ts`, `.storybook/preview.ts`
- Create: `src/index.ts` — exports all chart components + `usePfChartTheme`
- Create: `.github/workflows/ci.yml`
- Create: `CLAUDE.md`

### Phase 3 Verification Gate

- [ ] `@plainfold/ui` builds, all tests pass, Storybook renders, screenshots committed
- [ ] `@plainfold/charts` builds, all tests pass, Storybook renders
- [ ] Both installable as dependencies by Phase 4 packages
- [ ] No Radix/Nivo/Motion APIs leak through public API

---

## Phase 4A: @plainfold/i18n

> Detailed plan with full code will be generated at Phase 4 execution time.

**Depends on:** @plainfold/ui + @plainfold/store (Phases 1, 3)

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/src/lib/i18n.ts`

### Task 41: Initialize repository

**Files:**
- Create: `plainfold-i18n/package.json` — deps: `@plainfold/store`, `@plainfold/ui`, `i18next`, `react-i18next`, `i18next-browser-languagedetector`

### Task 42: TDD PfI18nProvider

**Files:**
- Create: `src/PfI18nProvider.tsx` — accepts `languages[]` + `fallback`, initializes i18next, persists locale to store
- Create: `src/__tests__/PfI18nProvider.test.tsx`

**Key:** Language detection order: querystring → navigator → htmlTag. Variant mapping (`es-419` → `es`) via `load: 'languageOnly'`.

### Task 43: TDD useLocale hook and PfLanguageSwitcher

**Files:**
- Create: `src/useLocale.ts` — `locale`, `setLocale()`, `languages[]`
- Create: `src/PfLanguageSwitcher.tsx` — drop-in PfFormSelect for settings
- Tests for each

### Task 44: Barrel export, CI, CLAUDE.md

**Files:**
- Create: `src/index.ts` — re-exports `useTranslation` from `react-i18next`
- Create: `.github/workflows/ci.yml`, `CLAUDE.md`, `.changeset/config.json`

---

## Phase 4B: @plainfold/backup

> Detailed plan with full code will be generated at Phase 4 execution time.

**Depends on:** @plainfold/ui + @plainfold/store (Phases 1, 3)

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/src/lib/backup.ts`, `/Users/edgarrico/budget-tracker/budgetpilot/src/views/ExportImport.tsx`

### Task 45: Initialize repository

**Files:**
- Create: `plainfold-backup/package.json` — deps: `@plainfold/store`, `@plainfold/ui`, `dexie-export-import`; peerDeps: `dexie>=4`, `react>=19`

### Task 46: TDD PfBackupProvider with reminder system

**Files:**
- Create: `src/PfBackupProvider.tsx` — accepts `db`, `appName`, `reminderRules`. Auto-increments open count, evaluates reminders.
- Create: `src/__tests__/PfBackupProvider.test.tsx`

**Store keys:** `pf:backup:openCount`, `pf:backup:lastExport`, `pf:backup:lastReminder`

### Task 47: TDD useBackup hook

**Files:**
- Create: `src/useBackup.ts` — `exportBackup()`, `importBackup(file)`, `lastExportDate`
- Create: `src/__tests__/useBackup.test.ts`

**Export filename:** `{appName}-backup-YYYY-MM-DD.json`

### Task 48: TDD PfBackupSnackbar, PfAutoBackupDialog, PfExportImportView

**Files:**
- Create: `src/PfBackupSnackbar.tsx` — fires when last export > reminderIntervalDays ago
- Create: `src/PfAutoBackupDialog.tsx` — appears on Nth app open
- Create: `src/PfExportImportView.tsx` — drop-in settings section with export button, import dropzone

### Task 49: Barrel export, CI, CLAUDE.md

---

## Phase 4C: @plainfold/preferences

> Detailed plan with full code will be generated at Phase 4 execution time.

**Depends on:** @plainfold/ui + @plainfold/store + @plainfold/design-tokens (Phases 1, 2, 3)

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/src/views/Settings.tsx`

### Task 50: Initialize repository

**Files:**
- Create: `plainfold-preferences/package.json` — deps: `@plainfold/store`, `@plainfold/ui`, `@plainfold/design-tokens`

### Task 51: TDD PfSettingsPage and PfSettingsSection

**Files:**
- Create: `src/PfSettingsPage.tsx` — renders children as stacked sections
- Create: `src/PfSettingsSection.tsx` — PfCard wrapper with title, icon, collapsible
- Tests for each

### Task 52: TDD PfDangerZone and PfAppInfo

**Files:**
- Create: `src/PfDangerZone.tsx` — red-bordered section, PfConfirmDialog per action
- Create: `src/PfAppInfo.tsx` — version + build metadata display
- Tests for each

### Task 53: TDD PfThemeGallery

**Files:**
- Create: `src/PfThemeGallery.tsx` — browse bundled themes, upload JSON, preview, apply, save, remove
- Create: `src/__tests__/PfThemeGallery.test.tsx`

**Note:** Lives here (not in design-tokens) to avoid circular dep with ui.

### Task 54: Barrel export, CI, CLAUDE.md

### Phase 4 Verification Gate

- [ ] All 3 packages build and pass tests
- [ ] `@plainfold/i18n` PfI18nProvider initializes i18next and persists locale
- [ ] `@plainfold/backup` PfBackupProvider tracks open count and triggers reminders
- [ ] `@plainfold/preferences` PfThemeGallery can browse, upload, preview, apply themes
- [ ] All installable as dependencies of Phase 5

---

## Phase 5: @plainfold/onboarding

> Detailed plan with full code will be generated at Phase 5 execution time.

**Depends on:** @plainfold/ui + @plainfold/store + @plainfold/i18n (Phases 1, 3, 4)

**Source reference:** `/Users/edgarrico/budget-tracker/budgetpilot/src/views/Onboarding.tsx`

### Task 55: Initialize repository

**Files:**
- Create: `plainfold-onboarding/package.json` — deps: `@plainfold/store`, `@plainfold/ui`, `@plainfold/i18n`

### Task 56: TDD PfOnboardingProvider

**Files:**
- Create: `src/PfOnboardingProvider.tsx` — reads completion state from store
- Create: `src/__tests__/PfOnboardingProvider.test.tsx`

**Store key:** `pf:onboarding:completed`

### Task 57: TDD PfOnboardingWizard and useOnboarding

**Files:**
- Create: `src/PfOnboardingWizard.tsx` — progress indicator, back/next, responsive layout, step content as render props
- Create: `src/useOnboarding.ts` — `isCompleted`, `reset()`, `currentStep`
- Tests for each

### Task 58: Barrel export, CI, CLAUDE.md

### Phase 5 Verification Gate

- [ ] Package builds and tests pass
- [ ] Wizard renders steps, tracks progress, persists completion
- [ ] `reset()` clears completion state
- [ ] Installable as dependency of Phase 6

---

## Phase 6A: plainfold-scaffold-app

> Detailed plan with full code will be generated at Phase 6 execution time.

**Depends on:** All 8 packages

**Source reference:** Full budget-tracker app structure

### Task 59: Create GitHub template repository

**Files:**
- Create: GitHub repo with template flag enabled
- Create: `package.json` — all @plainfold packages as dependencies

### Task 60: Provider nesting and App shell

**Files:**
- Create: `src/app/App.tsx` — PfStoreReady → PfDesignTokensProvider → PfI18nProvider → PfBackupProvider → PfOnboardingProvider → PfAppScaffold
- Create: `src/app/routes.tsx`
- Create: `src/app/nav-items.ts`

### Task 61: Sample domain — Items entity

**Files:**
- Create: `src/domain/items/types.ts` — PfItem interface
- Create: `src/domain/items/schema.ts` — Zod validation
- Create: `src/domain/items/store.ts` — Zustand + Dexie hydration pattern
- Create: `src/domain/items/ItemList.tsx` — PfDataList usage
- Create: `src/domain/items/ItemDetail.tsx`
- Create: `src/domain/items/ItemForm.tsx` — PfForm + PfFormTextField

### Task 62: Views — Dashboard and Settings

**Files:**
- Create: `src/views/DashboardView.tsx` — PfBarChart sample
- Create: `src/views/SettingsView.tsx` — PfLanguageSwitcher, PfThemeGallery, PfExportImportView, PfDangerZone, PfAppInfo

### Task 63: Database, locales, assets

**Files:**
- Create: `src/lib/db.ts` — Dexie database with items table
- Create: `src/lib/constants.ts`
- Create: `src/locales/en.json`, `es.json`, `fr.json`
- Create: `src/index.css` — imports `@plainfold/design-tokens/tokens.css`
- Create: `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (placeholders)

### Task 64: Vite config, PWA, offline build

**Files:**
- Create: `vite.config.ts` — dev + PWA build with commented local-dev aliases
- Create: `vite.offline.config.ts` — IIFE build for distribution
- Create: `scripts/package-dist.mjs`

### Task 65: CI workflows

**Files:**
- Create: `.github/workflows/build.yml` — build + typecheck on PR
- Create: `.github/workflows/trigger-e2e.yml` — dispatch to scaffold-app-e2e after build
- Create: `.github/workflows/deploy-cloudflare.yml` (commented out)
- Create: `.github/workflows/deploy-vercel.yml` (commented out)
- Create: `.github/workflows/deploy-gh-pages.yml` (commented out)

### Task 66: CLAUDE.md and new-app skill

**Files:**
- Create: `CLAUDE.md` — provider nesting order, domain folder convention, local-dev aliases
- Create: `.claude/skills/new-app.md` — `plainfold:new-app` skill

### Task 67: Verify app boots

```bash
npm run dev   # App runs
npm run build # Production build succeeds
```

---

## Phase 6B: plainfold-scaffold-app-e2e

> Detailed plan with full code will be generated at Phase 6 execution time.

**Depends on:** scaffold-app (Phase 6A)

**Source reference:** Full budget-tracker-e2e repo structure

### Task 68: Create GitHub template repository

**Files:**
- Create: GitHub repo with template flag enabled
- Create: `package.json` — `@playwright/test`, `wait-on`, `tsx`
- Create: `playwright.config.ts` — 10 projects (6 Tier 1 browsers: chromium, firefox, webkit, mobile-chrome, mobile-safari, tablet + 4 tier-specific: chromium-tier2 through chromium-tier5)

### Task 69: Test infrastructure — fixtures, helpers, page objects

**Files:**
- Create: `tests/e2e/fixtures.ts` — custom Playwright fixtures
- Create: `tests/e2e/helpers/db.ts` — `resetDB()`, `seedSettings()`, `seedOnboardedState()`
- Create: `tests/e2e/helpers/nav.ts` — `clickNavItem()` with mobile overflow handling
- Create: `tests/e2e/helpers/seed.ts` — `setupOnboarded()`
- Create: `tests/e2e/fixtures/themes.ts` — valid, with-icons, invalid theme fixtures
- Create: `tests/e2e/pages/` — ThemeGalleryPage, BackupSnackbarPage, AutoBackupDialogPage, PreferencesPage, OnboardingPage (reusable) + ItemListPage, ItemFormPage (example)

### Task 70: Tier 1 — Functional tests (multi-browser)

**Files:**
- Create: `tests/e2e/tier1/smoke-theme.spec.ts`
- Create: `tests/e2e/tier1/smoke-i18n.spec.ts`
- Create: `tests/e2e/tier1/smoke-backup.spec.ts`
- Create: `tests/e2e/tier1/smoke-onboarding.spec.ts`
- Create: `tests/e2e/tier1/smoke-nav.spec.ts`
- Create: `tests/e2e/tier1/smoke-pwa.spec.ts`
- Create: `tests/e2e/tier1/items-crud.spec.ts` (example)
- Create: `tests/e2e/tier1/items-search.spec.ts` (example)

### Task 71: Tier 2 — Responsive tests

**Files:**
- Create: `tests/e2e/tier2/nav-responsive.spec.ts`
- Create: `tests/e2e/tier2/dialog-responsive.spec.ts`
- Create: `tests/e2e/tier2/items-list-responsive.spec.ts` (example)
- Create: `tests/e2e/tier2/items-form-responsive.spec.ts` (example)

### Task 72: Tier 3-5 — i18n, Resilience, Accessibility tests

**Files:**
- Create: `tests/e2e/tier3/locale-switching.spec.ts`, `locale-formatting.spec.ts`, `items-i18n.spec.ts`
- Create: `tests/e2e/tier4/theme-invalid.spec.ts`, `clear-data.spec.ts`, `items-validation.spec.ts`, `items-empty-state.spec.ts`
- Create: `tests/e2e/tier5/nav-keyboard.spec.ts`, `dialog-focus-trap.spec.ts`, `reduced-motion.spec.ts`, `items-form-a11y.spec.ts`, `items-list-a11y.spec.ts`

### Task 73: CI pipeline

**Files:**
- Create: `.github/workflows/e2e.yml` — repository_dispatch + workflow_dispatch + push triggers. Tier 1 (5 parallel browsers) → Tiers 2-5 sequential, e2e-complete status check.

### Task 74: CLAUDE.md and new-app-e2e skill

**Files:**
- Create: `CLAUDE.md` — 5-tier framework, where to add tests, page object conventions
- Create: `.claude/skills/new-app-e2e.md` — `plainfold:new-app-e2e` skill

### Task 75: READMEs per tier

**Files:**
- Create: `tests/e2e/tier1/README.md` — "Functional: golden path flows"
- Create: `tests/e2e/tier2/README.md` — "Responsive: layout at every breakpoint"
- Create: `tests/e2e/tier3/README.md` — "i18n: every string in every language"
- Create: `tests/e2e/tier4/README.md` — "Resilience: what happens with bad input"
- Create: `tests/e2e/tier5/README.md` — "Accessibility: can everyone use this app"

### Phase 6 Verification Gate (Final)

- [ ] Scaffold app boots with all providers (`npm run dev`)
- [ ] Scaffold app production build succeeds (`npm run build`)
- [ ] Items CRUD works end-to-end
- [ ] Settings page shows all sections (theme gallery, language, backup, danger zone)
- [ ] E2E smoke tests pass against scaffold app
- [ ] Both repos have template flag enabled on GitHub
- [ ] Both CLAUDE.md files and skills are in place
- [ ] `gh repo create test-app --template encomp/plainfold-scaffold-app` workflow works

---

## Generating Phase-Specific Plans

When starting each phase (2-6), generate a detailed plan with full code by:

1. Reading this master plan for task structure and file lists
2. Reading the spec at `docs/superpowers/specs/2026-06-06-plainfold-ecosystem-extraction-design.md` for API details
3. Reading the source budget-tracker repo for extraction patterns
4. Writing to `docs/superpowers/plans/2026-06-06-plainfold-phase-N-<name>.md`

Each phase plan follows the same format as Phase 1: bite-sized tasks with complete code, TDD, exact commands, and expected output.
