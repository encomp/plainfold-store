# Plainfold Ecosystem Extraction Design

## Overview

Extract reusable infrastructure from budget-tracker and budget-tracker-e2e into a modular package ecosystem and two GitHub template repos. The goal: clone a template, replace the sample domain entity, and have a fully working PWA with theming, i18n, backup/restore, onboarding, responsive navigation, accessible components, and a tiered E2E testing framework.

## Approach

Clean-room rebuild. Each subsystem is pulled from budget-tracker, stripped of domain logic, renamed (Bp -> Pf prefix), and verified independently. No fork-and-strip, no monorepo.

## Repository Structure

11 repositories total: 8 npm packages, 1 shared dev config, 2 GitHub template repos.

```
encomp/plainfold-dev-config        ->  @plainfold/dev-config (shared tooling, internal)
encomp/plainfold-store             ->  @plainfold/store
encomp/plainfold-design-tokens     ->  @plainfold/design-tokens
encomp/plainfold-ui                ->  @plainfold/ui
encomp/plainfold-preferences       ->  @plainfold/preferences
encomp/plainfold-charts            ->  @plainfold/charts
encomp/plainfold-i18n              ->  @plainfold/i18n
encomp/plainfold-backup            ->  @plainfold/backup
encomp/plainfold-onboarding        ->  @plainfold/onboarding
encomp/plainfold-scaffold-app      ->  GitHub template repo
encomp/plainfold-scaffold-app-e2e  ->  GitHub template repo
```

### Dependency Graph

```
@plainfold/dev-config          <- devDependency of all packages (no runtime dep)
@plainfold/store               <- foundation (peerDep: dexie)
@plainfold/design-tokens       <- depends on store
@plainfold/ui                  <- depends on design-tokens
@plainfold/charts              <- depends on design-tokens
@plainfold/i18n                <- depends on ui + store
@plainfold/backup              <- depends on ui + store
@plainfold/onboarding          <- depends on ui + store + i18n
@plainfold/preferences         <- depends on ui + store + design-tokens
```

No circular dependencies. All packages use `@plainfold/store` as the shared persistence layer with namespaced keys (e.g., `pf:theme:activeTheme`, `pf:i18n:locale`).

---

## Package Designs

### @plainfold/dev-config

Shared development tooling. Not published to npm — used as a devDependency via git or npm workspace.

Contents:
- `eslint.config.js` — ESLint flat config with TypeScript, React hooks, React refresh rules
- `tsconfig.base.json` — TypeScript strict mode, ES2023 target, ESNext modules, bundler resolution, path aliases
- `vite.lib.config.ts` — Vite library mode config for building packages (ESM + CJS output)

Each package extends these:
```json
{ "extends": "@plainfold/dev-config/tsconfig.base.json" }
```

### @plainfold/store

Foundation persistence layer. Key-value store backed by Dexie (IndexedDB).

**Public API:**

```typescript
export function PfStoreReady({ children, fallback }): JSX.Element
export function useSettings(): {
  get: <T>(key: string) => Promise<T | undefined>
  set: (key: string, value: unknown) => Promise<string>
  remove: (key: string) => Promise<void>
}
export function clearAll(): Promise<void>
```

Key design decisions:
- Dexie is a peer dependency (the app provides it, preventing duplicate instances)
- `PfStoreReady` component waits for Dexie initialization before rendering children — other providers nest inside it
- Namespaced keys prevent collisions: packages use `pf:<package>:*`, apps use `app:*`
- `clearAll()` wipes the entire settings table — used by PfDangerZone

**Dependencies:**
```
peerDependencies:
  dexie >= 4
  react >= 19
```

### @plainfold/design-tokens

Theme token contract, validation, application, and library management.

**Public API:**

```typescript
// Types
export interface PfTheme { id, name, description, version, tokens, icons? }
export interface PfThemeTokens { /* all --pf-* variable names */ }

// Provider
export function PfDesignTokensProvider({ children }): JSX.Element

// Application
export function applyTheme(theme: PfTheme): void
export function resetTheme(): void

// Validation
export const pfThemeSchema: ZodSchema<PfTheme>
export function validateThemeContrast(theme: PfTheme): ContrastResult[]

// Library management
export const ThemeLibrary: {
  getAll(): Promise<PfTheme[]>
  add(theme: PfTheme): Promise<void>
  remove(id: string): Promise<void>
}

// Bundled themes
export const BUNDLED_THEMES: PfTheme[]
export const BUNDLED_THEME_IDS: Set<string>

// CSS variable defaults (importable stylesheet)
export { default as pfTokenDefaults } from './tokens.css'

// Icon sanitization
export function sanitizeSvgIcon(raw: string): string
```

Token architecture — two-tier system for backward compatibility:
- Required tokens: removing these is a major version bump. All themes must include them.
- Optional tokens: new tokens start here with CSS fallback defaults (`var(--pf-bg-elevated, var(--pf-bg-surface))`). Promoting optional to required is a major version bump.

Theme validation warns on missing optional tokens, errors on missing required tokens. Bundled themes always include all tokens as the reference implementation.

Token categories:
- Colors: `--pf-bg-base`, `--pf-bg-surface`, `--pf-accent`, `--pf-positive`, `--pf-danger`, `--pf-text-primary`, `--pf-border`
- Typography: `--pf-font-ui`, `--pf-font-mono`
- Spacing/Sizing: `--pf-radius-sm`, `--pf-radius-md`, `--pf-icon-size-sm/md/lg`
- Animation: `--pf-duration-fast`, `--pf-duration-normal`, `--pf-easing-default`, `--pf-easing-spring`, `--pf-motion-intensity`
- Heatmap: `--pf-heat-none`, `--pf-heat-low`, `--pf-heat-mid`, `--pf-heat-high`

Bundled themes: linen (warm cream, light), focus (reduced motion), midnight (dark).

Persistence: reads/writes active theme and installed themes via `@plainfold/store` with keys `pf:theme:activeTheme` and `pf:theme:installedThemes`.

Zod is a peer dependency.

**Dependencies:**
```
dependencies:
  @plainfold/store
  dompurify

peerDependencies:
  react >= 19
  zod >= 4
```

### @plainfold/ui

Reusable React component library. All components follow Material Design 3 naming conventions, consume theme tokens via CSS variables, and never leak implementation details (Radix, Motion) in their public API.

**Component inventory:**

Core:
- `PfButton` — primary/secondary/ghost/danger variants, size variants, loading state
- `PfCard` — surface container with theme-aware background/border
- `PfBadge` — status badge with color variants
- `PfLinearProgress` — linear progress indicator
- `PfEmptyState` — empty state placeholder with icon + message + CTA
- `PfErrorBoundary` — React error boundary with fallback UI. Prevents a crashed child (chart, icon, etc.) from taking down the whole app
- `ThemeIcon` — renders theme-defined SVG icons with Lucide fallback

Feedback:
- `PfSnackbar` — notification toast with auto-dismiss
- `PfTooltip` — tooltip via Radix

Overlay:
- `PfDialog` — modal on desktop, bottom sheet on mobile. Props: `open`, `onClose` (not Radix's `onOpenChange`)
- `PfConfirmDialog` — confirmation dialog with cancel/confirm actions
- `PfBottomSheet` — general-purpose bottom sheet

Form (connected to React Hook Form):
- `PfForm` — form wrapper with Zod schema validation via FormProvider
- `PfFormTextField` — text input connected to RHF Controller. Auto-handles register, error display, label, required indicator
- `PfFormSelect` — dropdown select. Props: `options={[{label, value}]}`, `onChange` (not Radix's `onValueChange`)
- `PfFormSlider` — range slider. Props: `value`, `onChange`, `min`, `max`, `step`
- `PfFormSwitch` — toggle switch

Navigation:
- `PfAppScaffold` — root layout, orchestrates nav components based on breakpoint
- `PfNavDrawer` — desktop (expanded with labels) / tablet (collapsed as rail). Router-agnostic via `onNavigate` callback
- `PfNavBar` — mobile bottom navigation (MD3: Navigation bar)

Note: `PfBottomSheet` (listed under Overlay) is reused by PfAppScaffold for navigation overflow on mobile. Single component, two use cases.

Data display:
- `PfSegmentedButton` — button group for view switching
- `PfDataList` — responsive list/table switcher. Renders `columns` as table on desktop, `renderCard` on mobile

Exported utilities:
- `useBreakpoint()` — returns `'mobile' | 'tablet' | 'desktop'`
- `BREAKPOINTS` — `{ mobile: 0, tablet: 768, desktop: 1024 }`

Internal utilities (not exported):
- `getMotionConfig()` — Motion props respecting `prefers-reduced-motion` + `--pf-motion-intensity`
- `cn()` — clsx className utility

**API design principle:** No leaking of underlying library APIs. Standard React conventions throughout:
- Closing: `onClose` (not Radix's `onOpenChange(false)`)
- Value changes: `onChange` (not Radix's `onValueChange`)
- Options: `options={[{label, value}]}` (not Radix's children pattern)
- Open state: `open` + `onClose`

If Radix were swapped for Ark UI, zero consumer code changes.

**CSS strategy:** CSS custom properties + inline React styles. No Tailwind CSS. Component variants use JavaScript objects (`variantStyles`, `sizeStyles`). `class-variance-authority` and `tailwind-merge` are removed. `clsx` retained for conditional classNames.

**Navigation router integration:** Router-agnostic. PfAppScaffold receives nav items with `isActive` boolean and `onNavigate` callback. The template wires these to React Router. Consumers can swap for any router.

```typescript
<PfAppScaffold
  navItems={[{ icon: Home, label: 'Dashboard', path: '/', isActive: pathname === '/' }]}
  onNavigate={(path) => navigate(path)}
>
  {children}
</PfAppScaffold>
```

**Dependencies:**
```
dependencies:
  @plainfold/design-tokens
  @radix-ui/react-dialog
  @radix-ui/react-select
  @radix-ui/react-slider
  @radix-ui/react-switch
  @radix-ui/react-tooltip
  motion
  clsx

peerDependencies:
  react >= 19
  react-dom >= 19
  react-hook-form >= 7
  @hookform/resolvers >= 5
  zod >= 4
  lucide-react >= 1.0
```

Lucide is a peer dependency for tree-shaking — only icons actually used by components ship in the app bundle.

Build output: ESM + CJS via Vite library mode with CSS bundled.

Storybook: each component ships with `.stories.tsx` files. Storybook runs in this repo independently.

### @plainfold/charts

Theme-aware chart components wrapping Nivo (D3-based). Optional package.

**Component inventory:**

| Component | Wraps |
|-----------|-------|
| `PfBarChart` | `@nivo/bar` |
| `PfLineChart` | `@nivo/line` |
| `PfPieChart` | `@nivo/pie` |
| `PfHeatmap` | `@nivo/heatmap` |

Each component provides:
1. Auto-theming via `usePfChartTheme()` — reads CSS variables, builds internal theme object
2. Heatmap token scale — `--pf-heat-none/low/mid/high`
3. Responsive defaults — chart dimensions, font sizes, legend placement adapt via `useBreakpoint()`
4. Accessibility — ARIA labels, reduced-motion disables chart animations
5. Consistent formatting — axis ticks, tooltip styling, legend placement

**API design — no Nivo leaking:**

```typescript
// Clean API
<PfBarChart
  data={[{ category: 'Food', value: 250 }]}
  xField="category"
  yField="value"
  orientation="vertical"
  height={300}
/>
```

Prop mapping:

| Our API | Maps to Nivo |
|---------|-------------|
| `xField`, `yField` | `indexBy`, `keys` |
| `orientation` | `layout` |
| `stacked` | `groupMode` |
| `series` | Nivo data series format |
| `curved` | `curve` |
| `donut` | `innerRadius` |
| `labelField`, `valueField` | `id`, `value` |

No pass-through of Nivo props. Escape hatch via `renderCustom` callback for advanced cases.

`usePfChartTheme()` is exported for consumers who need to theme additional chart types from any charting library.

**Dependencies:**
```
dependencies:
  @plainfold/design-tokens
  @nivo/bar
  @nivo/line
  @nivo/pie
  @nivo/heatmap

peerDependencies:
  react >= 19
  react-dom >= 19
```

Storybook: ships with stories for each chart type with sample data.

### @plainfold/i18n

Internationalization framework with language detection, persistence, and pre-built UI.

**Public API:**

```typescript
export function PfI18nProvider({
  languages: [{ code: string, label: string, translations: object }],
  fallback: string,
  children
}): JSX.Element

export function PfLanguageSwitcher(): JSX.Element

export function useLocale(): {
  locale: string
  setLocale: (code: string) => Promise<void>
  languages: { code: string, label: string }[]
}

export { useTranslation } from 'react-i18next'
```

Features:
- Language detection priority: query string -> navigator -> HTML tag
- Language variant mapping (`es-419` -> `es`) via `load: 'languageOnly'`
- Persistence via `@plainfold/store` (key: `pf:i18n:locale`)
- `PfLanguageSwitcher` is a drop-in PfFormSelect for the settings page
- `useTranslation` re-exported so consumers don't install i18next directly

**Dependencies:**
```
dependencies:
  @plainfold/store
  @plainfold/ui
  i18next
  react-i18next
  i18next-browser-languagedetector

peerDependencies:
  react >= 19
```

### @plainfold/backup

Export/import and backup reminder system. Plug-and-play.

**Public API:**

```typescript
export function PfBackupProvider({
  db: Dexie,
  appName: string,
  reminderRules?: {
    firstReminderAfterOpens?: number,  // default: 3
    reminderIntervalDays?: number,     // default: 7
    cooldownDays?: number,             // default: 1
  },
  children
}): JSX.Element

export function useBackup(): {
  exportBackup: () => Promise<void>
  importBackup: (file: File) => Promise<void>
  lastExportDate: string | null
}

export function PfBackupSnackbar(): JSX.Element    // auto-rendered by provider
export function PfAutoBackupDialog(): JSX.Element  // auto-rendered by provider
export function PfExportImportView(): JSX.Element  // drop-in settings section
```

Features:
- Provider auto-increments open count and evaluates reminder rules on mount
- Export filename: `{appName}-backup-YYYY-MM-DD.json`
- Uses Dexie's `dexie-export-import` plugin for full database export/import
- Reminder state managed via `@plainfold/store` (keys: `pf:backup:openCount`, `pf:backup:lastExport`, `pf:backup:lastReminder`)
- PfBackupSnackbar fires when last export > reminderIntervalDays ago
- PfAutoBackupDialog appears on Nth app open (configurable)
- PfExportImportView is a drop-in section for the settings page with export button, import dropzone, last export date

**Dependencies:**
```
dependencies:
  @plainfold/store
  @plainfold/ui
  dexie-export-import

peerDependencies:
  dexie >= 4
  react >= 19
```

### @plainfold/onboarding

First-run wizard with completion tracking.

**Public API:**

```typescript
export function PfOnboardingProvider({ children }): JSX.Element

export function PfOnboardingWizard({
  steps: [{ title: string, content: ReactNode }],
  onComplete: () => void,
}): JSX.Element

export function useOnboarding(): {
  isCompleted: boolean
  reset: () => Promise<void>
  currentStep: number
}
```

Features:
- Completion state persisted via `@plainfold/store` (key: `pf:onboarding:completed`)
- Wizard with progress indicator, back/next navigation, responsive layout
- Step content is app-defined (render props pattern)
- `reset()` clears completion state — useful for PfDangerZone "Reset onboarding" action

**Dependencies:**
```
dependencies:
  @plainfold/store
  @plainfold/ui
  @plainfold/i18n

peerDependencies:
  react >= 19
```

### @plainfold/preferences

Settings page framework. Composes sections from packages and app-specific content.

**Public API:**

```typescript
export function PfSettingsPage({ children }): JSX.Element
export function PfSettingsSection({ title, icon?, description?, collapsible?, children }): JSX.Element
export function PfDangerZone({
  actions: [{ label: string, onConfirm: () => Promise<void>, confirmText: string }]
}): JSX.Element
export function PfAppInfo({ version: string, buildDate?: string }): JSX.Element
export function PfThemeGallery(): JSX.Element
```

Features:
- PfSettingsPage renders children as stacked sections with consistent spacing
- PfSettingsSection is a PfCard wrapper with title, icon, optional description, collapsible
- PfDangerZone renders red-bordered section with PfConfirmDialog for each destructive action
- PfAppInfo displays version and build metadata
- PfThemeGallery is the full theme management UI: browse bundled themes, upload JSON, preview, apply, save to library, remove

Theme gallery lives here (not in design-tokens) to avoid circular dependency with ui.

**Dependencies:**
```
dependencies:
  @plainfold/store
  @plainfold/ui
  @plainfold/design-tokens

peerDependencies:
  react >= 19
```

---

## Template App: plainfold-scaffold-app

GitHub template repo. Clone, replace sample entity, run.

### App boot / hydration order

Providers nest to establish initialization order:

```typescript
<PfStoreReady fallback={<SplashScreen />}>
  <PfDesignTokensProvider>
    <PfI18nProvider languages={[...]} fallback="en">
      <PfBackupProvider db={db} appName="my-app">
        <PfOnboardingProvider>
          <App />
        </PfOnboardingProvider>
      </PfBackupProvider>
    </PfI18nProvider>
  </PfDesignTokensProvider>
</PfStoreReady>
```

Order matters:
1. Store ready (Dexie initialized)
2. Design tokens (theme applied before first paint — no flash)
3. i18n (locale loaded — first render in correct language)
4. Backup (open count tracked, reminders evaluated)
5. Onboarding (completion state checked, redirect if needed)

### Sample domain: Items entity

Demonstrates every infrastructure layer with a minimal replaceable model:

```typescript
interface PfItem {
  id: string
  name: string
  description?: string
  category: string
  quantity: number
  createdAt: string
  updatedAt: string
}
```

Maps naturally to any domain:
- Bookkeeping: name -> description, quantity -> amount, category -> account type
- Wedding planner: name -> vendor, quantity -> cost, category -> wedding section
- Any CRUD app: text, numeric, select, and date fields covered

### Folder structure

```
plainfold-scaffold-app/
├── src/
│   ├── app/
│   │   ├── App.tsx                  # Root component, provider nesting, PfAppScaffold
│   │   ├── routes.tsx               # Route definitions
│   │   └── nav-items.ts             # Navigation configuration
│   ├── domain/
│   │   └── items/                   # <- Replace with your domain
│   │       ├── types.ts             # PfItem interface
│   │       ├── schema.ts            # Zod validation schema
│   │       ├── store.ts             # Zustand store (hydration from Dexie pattern)
│   │       ├── ItemList.tsx          # List view (PfDataList: table/cards)
│   │       ├── ItemDetail.tsx        # Detail view
│   │       └── ItemForm.tsx          # Add/edit form (PfForm + PfFormTextField)
│   ├── lib/
│   │   ├── db.ts                    # Dexie database (items table + migrations)
│   │   └── constants.ts             # App-level constants
│   ├── views/
│   │   ├── DashboardView.tsx        # Sample dashboard with PfBarChart
│   │   └── SettingsView.tsx         # Composes PfLanguageSwitcher, PfThemeGallery,
│   │                                #   PfExportImportView, PfDangerZone, PfAppInfo
│   ├── locales/
│   │   ├── en.json
│   │   ├── es.json
│   │   └── fr.json
│   └── index.css                    # Imports @plainfold/design-tokens/tokens.css
├── public/
│   ├── icon-192.png                 # Placeholder PWA icons
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── vite.config.ts                   # Dev + PWA build (includes commented local-dev aliases)
├── vite.offline.config.ts           # Offline IIFE build for distribution
├── scripts/
│   └── package-dist.mjs            # Packaging script for offline distribution
├── tsconfig.json
├── eslint.config.js
├── package.json
├── .nvmrc                           # Node 20
└── .github/workflows/
    ├── build.yml                    # Build + typecheck on PR (always active)
    ├── trigger-e2e.yml              # Dispatch to scaffold-app-e2e after build (always active)
    ├── deploy-cloudflare.yml        # Cloudflare Pages (recommended, commented out)
    ├── deploy-vercel.yml            # Vercel alternative (commented out)
    └── deploy-gh-pages.yml          # GitHub Pages alternative (commented out)
```

### Local development with packages

Vite resolve aliases for local package development (in vite.config.ts, toggled via env):

```typescript
// Uncomment and set LOCAL_PACKAGES=true to develop packages locally
// resolve: {
//   alias: {
//     '@plainfold/ui': '/path/to/plainfold-ui/src',
//     '@plainfold/design-tokens': '/path/to/plainfold-design-tokens/src',
//   },
// },
```

### Getting started flow

```bash
gh repo create my-app --template encomp/plainfold-scaffold-app
git clone my-app && cd my-app && npm install
# Replace src/domain/items/ with your domain
# Update db.ts, routes, nav-items, locales
npm run dev
```

---

## Template E2E: plainfold-scaffold-app-e2e

GitHub template repo. Provides tiered E2E testing framework and CI pipeline.

### 5-tier testing framework

Tiers organized by testing dimension, not importance. Each tier tests one cross-cutting concern applicable to any app.

| Tier | Dimension | Browsers | Gate | Question it answers |
|------|-----------|----------|------|---------------------|
| Tier 1 | Functional | Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari, Tablet | Required | Does the app work? |
| Tier 2 | Responsive | Chromium (3 viewport configs) | Required | Does the layout adapt correctly? |
| Tier 3 | i18n | Chromium | Required | Does the app work in all languages? |
| Tier 4 | Resilience | Chromium | Required | Does the app handle bad input gracefully? |
| Tier 5 | Accessibility | Chromium | Required | Can everyone use this app? |

Each tier contains:
- Infrastructure tests (smoke tests verifying package features integrate correctly)
- Domain example tests (Items entity, clearly marked as examples to replace)

### Tier contents

**Tier 1 — Functional (multi-browser):**
- `smoke-theme.spec.ts` — apply theme, verify CSS var changed
- `smoke-i18n.spec.ts` — switch language, verify label
- `smoke-backup.spec.ts` — export file downloads
- `smoke-onboarding.spec.ts` — complete wizard, redirect
- `smoke-nav.spec.ts` — each nav item routes correctly
- `smoke-pwa.spec.ts` — no external requests (offline capable)
- `items-crud.spec.ts` — (example) add, edit, delete item
- `items-search.spec.ts` — (example) filter/search items

**Tier 2 — Responsive (3 viewports):**
- `nav-responsive.spec.ts` — NavDrawer expanded/rail/hidden, NavBar visible/hidden
- `dialog-responsive.spec.ts` — PfDialog as modal (desktop) vs sheet (mobile)
- `items-list-responsive.spec.ts` — (example) PfDataList table vs cards
- `items-form-responsive.spec.ts` — (example) form layout adapts

**Tier 3 — i18n:**
- `locale-switching.spec.ts` — round-trip switching, persistence, browser detection
- `locale-formatting.spec.ts` — number/currency formatting per locale
- `items-i18n.spec.ts` — (example) item labels in ES/FR

**Tier 4 — Resilience:**
- `theme-invalid.spec.ts` — invalid theme JSON rejected gracefully
- `clear-data.spec.ts` — clear all data with confirm/cancel
- `items-validation.spec.ts` — (example) empty name, negative quantity
- `items-empty-state.spec.ts` — (example) no items, empty state renders

**Tier 5 — Accessibility:**
- `nav-keyboard.spec.ts` — tab through nav, Enter to navigate, Escape closes sheet
- `dialog-focus-trap.spec.ts` — focus trapped in dialog, restored on close
- `reduced-motion.spec.ts` — animations disabled with prefers-reduced-motion
- `items-form-a11y.spec.ts` — (example) labels, error announcements, tab order
- `items-list-a11y.spec.ts` — (example) ARIA roles, keyboard navigation

### Test infrastructure

**Fixtures:**
- Custom Playwright fixtures extending base test with page object instances
- Reusable page objects: ThemeGalleryPage, BackupSnackbarPage, AutoBackupDialogPage, PreferencesPage, OnboardingPage
- Example page objects: ItemListPage, ItemFormPage

**Helpers:**
- `helpers/db.ts` — `resetDB(page)` (wipe IndexedDB + reload), `seedSettings(page, key, value)`
- `helpers/nav.ts` — `clickNavItem(page, testId)` (handles mobile overflow sheet automatically)
- `helpers/seed.ts` — `setupOnboarded(page, options?)` (skip onboarding + seed baseline)

**Fixture data:**
- `fixtures/themes.ts` — valid theme, theme with icons, invalid theme (for resilience tests)

### CI pipeline

Trigger: `repository_dispatch` from app repo + manual `workflow_dispatch` + push to main.

```
Tier 1: Functional (5 parallel browser jobs, 30min each)
  ├── chromium
  ├── firefox
  ├── webkit
  ├── mobile-chrome
  └── mobile-safari
    ↓ all must pass
Tier 2: Responsive (chromium, 30min)
Tier 3: i18n (chromium, 30min)
Tier 4: Resilience (chromium, 30min)
Tier 5: Accessibility (chromium, 30min)
    ↓ all must pass
e2e-complete (status check for branch protection)
```

Steps per job:
1. Checkout E2E repo
2. Checkout app repo via PAT into `app/` subdirectory
3. Setup Node 20
4. `npm ci` for E2E + app dependencies
5. Cache Playwright browsers by project
6. Start Vite dev server
7. Wait for localhost:5173 (30s timeout)
8. Run tier-specific Playwright tests
9. Upload HTML report as artifact (14-day retention)

Reporters: HTML + GitHub summary + terminal list.
Screenshots on failure, traces on first retry.

### Folder structure

```
plainfold-scaffold-app-e2e/
├── tests/e2e/
│   ├── fixtures.ts
│   ├── fixtures/
│   │   └── themes.ts
│   ├── helpers/
│   │   ├── db.ts
│   │   ├── nav.ts
│   │   └── seed.ts
│   ├── pages/
│   │   ├── ThemeGalleryPage.ts        # Reusable
│   │   ├── BackupSnackbarPage.ts      # Reusable
│   │   ├── AutoBackupDialogPage.ts    # Reusable
│   │   ├── PreferencesPage.ts         # Reusable
│   │   ├── OnboardingPage.ts          # Reusable
│   │   ├── ItemListPage.ts            # Example
│   │   └── ItemFormPage.ts            # Example
│   ├── tier1/
│   │   ├── README.md                  # "Functional: golden path flows"
│   │   ├── smoke-*.spec.ts
│   │   └── items-crud.spec.ts
│   ├── tier2/
│   │   ├── README.md                  # "Responsive: layout at every breakpoint"
│   │   ├── nav-responsive.spec.ts
│   │   └── items-list-responsive.spec.ts
│   ├── tier3/
│   │   ├── README.md                  # "i18n: every string in every language"
│   │   ├── locale-switching.spec.ts
│   │   └── items-i18n.spec.ts
│   ├── tier4/
│   │   ├── README.md                  # "Resilience: what happens with bad input"
│   │   ├── theme-invalid.spec.ts
│   │   └── items-validation.spec.ts
│   └── tier5/
│       ├── README.md                  # "Accessibility: can everyone use this app"
│       ├── nav-keyboard.spec.ts
│       └── items-form-a11y.spec.ts
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── .github/workflows/
    └── e2e.yml
```

Each tier folder includes a README explaining what dimension it tests, when to add tests there, and patterns to follow.

### Getting started flow

```bash
gh repo create my-app-e2e --template encomp/plainfold-scaffold-app-e2e
# Update playwright.config.ts — change app repo reference
# Update .github/workflows/e2e.yml — change app repo name + PAT
# Replace pages/Item*.ts with domain page objects
# Replace items-*.spec.ts with domain tests
# All infrastructure tests work immediately
```

---

## Package CI/CD and Publishing

### Registry

All packages published to npm (public) under `@plainfold` scope. Zero configuration for consumers — `npm install @plainfold/ui` just works.

### Versioning

Semantic versioning with Changesets. Each PR includes a changeset file (patch/minor/major). A GitHub Action opens a "Version Packages" PR that bumps versions and updates changelogs. Merging that PR triggers npm publish.

### CI workflow per package repo

```
PR opened:
  -> Build package
  -> Run Vitest (unit + accessibility via vitest-axe)
  -> Start Storybook (if applicable)
  -> Run Playwright screenshot tests against Storybook (if applicable)
  -> Run package-owned E2E tests against minimal test app (if applicable)
  -> Upload diffs as artifacts on failure

Version PR merged:
  -> npm publish
  -> Deploy Storybook to Cloudflare Pages (if applicable)
```

### Screenshot testing (visual regression)

Packages with UI (`@plainfold/ui`, `@plainfold/charts`) use Playwright screenshot comparisons against Storybook:
1. CI starts Storybook
2. Playwright visits each story URL
3. `toHaveScreenshot()` compares against committed baselines in `tests/screenshots/`
4. Diffs uploaded as CI artifacts on failure
5. Baselines updated via `npx playwright test --update-snapshots`

Screenshot matrix: every component x every variant x each theme (linen, focus, midnight) x breakpoints (for responsive components).

### Package-owned E2E tests

Each package with runtime behavior owns its own integration/E2E tests:
- Minimal test app inside the package repo (`tests/app/`)
- Playwright tests against that minimal app
- Runs in the package's CI

This ensures the team that changes the code owns the tests that verify it. The scaffold E2E only needs smoke tests.

---

## Cross-Cutting Decisions

### CSS strategy
CSS custom properties + inline React styles. No Tailwind CSS. Theme tokens are CSS variables applied at runtime via `applyTheme()`. Component variants use JavaScript objects. `clsx` retained for conditional classNames. `class-variance-authority` and `tailwind-merge` removed.

### API design principle
No leaking of underlying library APIs in any package. Standard React conventions throughout (onChange, onClose, value, disabled). If the underlying library (Radix, Nivo, Motion) were swapped, zero consumer code changes.

### Router agnosticism
PfAppScaffold and navigation components receive callbacks (`onNavigate`) and state (`isActive`) as props. No router dependency in any package. The scaffold template wires to React Router; consumers can swap for any router.

### Dexie management
Dexie is a peer dependency of `@plainfold/store`. The app installs Dexie once. All packages use the shared settings store via `@plainfold/store` with namespaced keys. The app's domain data uses a separate Dexie database instance.

### Clear data orchestration
PfDangerZone accepts an `onClear` callback. The app composes clearing domain data + calling `pfStoreClearAll()` + reload.

### Local development
Vite resolve aliases in the app's `vite.config.ts` for local package development. Toggled via `LOCAL_PACKAGES` env var. No npm link, no workspace wrapper, no symlink issues. Hot reload works.

### React version
React >= 19 only. No React 18 compatibility layer.

### Breaking change propagation
Two-tier token system: new tokens are optional with CSS fallbacks, promoting to required is a major version bump. Theme validation warns on missing optional, errors on missing required. Bundled themes always include all tokens.

### License
All packages and template repos use MIT license.

### GitHub organization
All repos live under the `encomp/` GitHub organization.

---

## Implementation Execution Strategy

### Multi-Agent Parallel Development

The dependency graph defines natural execution phases. Repos within the same phase have no dependencies on each other and can be built by independent agents in parallel.

```
Phase 1 (parallel — no dependencies):
  Agent A: @plainfold/dev-config
  Agent B: @plainfold/store

Phase 2 (parallel — depends on Phase 1):
  Agent C: @plainfold/design-tokens  (depends on store)

Phase 3 (parallel — depends on Phase 2):
  Agent D: @plainfold/ui             (depends on design-tokens)
  Agent E: @plainfold/charts         (depends on design-tokens)

Phase 4 (parallel — depends on Phase 3):
  Agent F: @plainfold/i18n           (depends on ui + store)
  Agent G: @plainfold/backup         (depends on ui + store)
  Agent H: @plainfold/preferences    (depends on ui + store + design-tokens)

Phase 5 (depends on Phase 4):
  Agent I: @plainfold/onboarding     (depends on ui + store + i18n)

Phase 6 (depends on all packages):
  Agent J: plainfold-scaffold-app    (integrates all packages)
  Agent K: plainfold-scaffold-app-e2e (tests the scaffold app)
```

### Phase execution rules

1. Each phase waits for all agents in the previous phase to complete before starting
2. Within a phase, agents run independently with no shared state
3. Each agent works in its own git worktree to avoid file conflicts
4. Each agent is responsible for: repo creation, code extraction/writing, tests, CI workflow, Storybook (if applicable), initial Changesets config
5. After each phase, a verification step confirms packages build and their tests pass before dependents start

### Agent task scope

Each agent receives:
- The design spec (this document) for the package it's building
- Read access to the source budget-tracker repo for extraction
- The published packages from prior phases as npm dependencies
- Clear success criteria: package builds, tests pass, Storybook renders (if applicable), CI workflow valid

### Verification gates between phases

After each phase completes:
1. All packages in the phase must build successfully (`npm run build`)
2. All tests must pass (`npm test`)
3. Package can be installed as a dependency by the next phase's packages
4. Storybook (if applicable) renders without errors
5. Screenshot baselines are committed (if applicable)

### Phase timing estimates

| Phase | Repos | Agent-hours | Wall clock (parallel) | Bottleneck |
|-------|-------|-------------|----------------------|------------|
| Phase 1 | dev-config, store | ~5 hrs | ~3 hrs | store (Dexie wrapper + tests) |
| Phase 2 | design-tokens | ~8 hrs | ~8 hrs | Single agent, medium complexity |
| Phase 3 | ui, charts | ~20 hrs | ~16 hrs | ui (20+ components, Storybook, screenshots) |
| Phase 4 | i18n, backup, preferences | ~20 hrs | ~8 hrs | 3x parallel, backup/preferences tie |
| Phase 5 | onboarding | ~4 hrs | ~4 hrs | Single agent, small scope |
| Phase 6 | scaffold-app, scaffold-app-e2e | ~18 hrs | ~10 hrs | scaffold-app (wiring all packages) |
| Gates | Verification between phases | — | ~6 hrs | Build, test, install checks |

| Metric | Estimate |
|--------|----------|
| Total agent-hours | ~75 hrs across 11 agents |
| Critical path (wall clock) | ~55 hrs |
| At ~8 hrs/day | ~7 working days |
| Optimistic (no blockers) | ~5 days |
| Realistic (with iterations/fixes) | ~8-10 days |

Biggest risk: Phase 3 (`@plainfold/ui`) is the largest single unit and sits on the critical path. Everything downstream depends on it.

### Orchestration pattern: Per-phase workflows with human gates

Each phase is a separate workflow invocation. Within each phase, agents fan out in parallel for independent repos. Between phases, automated verification runs and results are presented for human review before proceeding.

**Why this pattern:**
- Natural checkpoints — review each phase's output before dependents are built
- Clean context per phase — each workflow starts fresh, no context bloat across 55+ hours
- Easy recovery — re-run a single phase workflow if issues are found
- Parallelism preserved — agents fan out within each phase (up to 3x in Phase 4)
- Low overhead — 6 approvals across 7+ days (~5 min each)

**Execution flow:**

```
Phase 1 workflow:
  → parallel(store, dev-config)
  → verify: build, test, installable
  → present results → human review → approve

Phase 2 workflow:
  → agent(design-tokens)
  → verify: build, test, Storybook, screenshots
  → present results → human review → approve

Phase 3 workflow:
  → parallel(ui, charts)
  → verify: build, test, Storybook, screenshots
  → present results → human review → approve
  (Critical review — largest phase, most downstream impact)

Phase 4 workflow:
  → parallel(i18n, backup, preferences)
  → verify: build, test, E2E
  → present results → human review → approve

Phase 5 workflow:
  → agent(onboarding)
  → verify: build, test, E2E
  → present results → human review → approve

Phase 6 workflow:
  → parallel(scaffold-app, scaffold-app-e2e)
  → verify: full integration (app boots, all packages wired, E2E passes)
  → present results → final review
```

**Estimated daily schedule:**

| Day | Phases | What happens |
|-----|--------|-------------|
| Day 1 | Phase 1 + 2 | Foundation packages (store, dev-config, design-tokens) |
| Day 2-3 | Phase 3 | Component library + charts (largest phase) |
| Day 4 | Phase 4 | i18n, backup, preferences (3x parallel) |
| Day 5 | Phase 5 | Onboarding |
| Day 6-7 | Phase 6 | Template repos (integration + E2E) |

Total: 11 agents across 6 sequential phases. Maximum parallelism of 3 agents in Phase 4.

---

## CLAUDE.md Per Repository

Every repo ships with a CLAUDE.md that gives any agent full context to work with the repo independently. Each CLAUDE.md follows a consistent structure but is tailored to the repo's role in the ecosystem.

### Structure (all repos)

```markdown
# <package-name>

<one-line description of what this package does and its role in the Plainfold ecosystem>

## Architecture

<dependency graph position, what this package depends on, what depends on it>

## Public API

<exported functions, components, hooks, types — with usage examples>

## Development

<how to set up, build, test, lint, run Storybook>

## Testing

<testing strategy, how to run tests, how to update screenshot baselines>

## CI/CD

<what the CI pipeline does, how publishing works>

## Key Decisions

<design constraints an agent must respect — e.g., "never expose Radix props",
"all new tokens start as optional", "CSS variables only, no Tailwind">
```

### Repo-specific CLAUDE.md content

| Repo | Key content an agent needs |
|------|---------------------------|
| `@plainfold/dev-config` | What configs are shared, how packages extend them, how to add a new rule |
| `@plainfold/store` | Dexie peer dep rationale, namespace convention (`pf:<pkg>:*`), PfStoreReady usage |
| `@plainfold/design-tokens` | Token contract (required vs optional), two-tier breaking change rules, theme validation, bundled themes list, CSS fallback pattern |
| `@plainfold/ui` | Full component inventory with prop signatures, MD3 naming convention, API design rules (no leaking Radix/Motion), CSS strategy (inline styles + CSS vars, no Tailwind), useBreakpoint export, Storybook patterns |
| `@plainfold/charts` | Abstracted prop mapping (our API -> Nivo internals), usePfChartTheme hook, how to add a new chart type without leaking Nivo |
| `@plainfold/i18n` | Provider config, language detection priority chain, persistence via store, how to add a new language, PfLanguageSwitcher usage |
| `@plainfold/backup` | Provider config with reminder rules, export filename pattern, Dexie export-import plugin usage, PfExportImportView drop-in, how reminder state is tracked |
| `@plainfold/onboarding` | Provider + wizard pattern, step content as render props, completion state key, reset flow |
| `@plainfold/preferences` | Settings page composition pattern, PfThemeGallery location rationale, PfDangerZone callback pattern, how packages contribute settings sections |
| `scaffold-app` | Provider nesting order (boot sequence), domain folder convention (`src/domain/<entity>/`), how to replace Items with your domain, Vite local-dev aliases, deployment workflow activation, offline build |
| `scaffold-app-e2e` | 5-tier testing framework with tier definitions, where to add new tests (by dimension), page object convention, helper usage (resetDB, seedSettings, setupOnboarded), CI pipeline structure, how to connect to a new app repo |

### CLAUDE.md for packages vs templates

**Package CLAUDE.md** focuses on: what the package exports, how to modify it, what constraints to respect, how to test changes.

**Template CLAUDE.md** focuses on: how to use the template to build a new app, what to replace, what to keep, how all the packages integrate together.

---

## Skills for Template Repos

Two skills ship with the scaffold templates to guide agents through common workflows.

### Skill 1: `plainfold:new-app` (in scaffold-app)

**Trigger:** When an agent is asked to create a new app using the Plainfold ecosystem.

**What it does:** Guides the agent through creating a new app from the scaffold template, step by step.

```markdown
---
name: plainfold:new-app
description: Create a new Plainfold app from the scaffold template.
  Use when starting a new app project that needs theming, i18n,
  backup/restore, onboarding, responsive navigation, and PWA support.
---

## Steps

1. **Create repo from template**
   - `gh repo create <app-name> --template encomp/plainfold-scaffold-app`
   - Clone and install dependencies

2. **Define your domain entity**
   - Create `src/domain/<entity>/` with types, schema, store, views, form
   - Use `src/domain/items/` as the reference implementation
   - Delete the items/ folder when done

3. **Update database schema**
   - Edit `src/lib/db.ts` — replace items table with your entity table
   - Define Dexie schema version and indexes

4. **Update navigation**
   - Edit `src/app/nav-items.ts` — replace Items nav entry with your entity
   - Update route definitions in `src/app/routes.tsx`

5. **Update translations**
   - Replace item-related keys in `src/locales/en.json`, `es.json`, `fr.json`
   - Add your domain-specific translation keys

6. **Update PWA manifest**
   - Edit `vite.config.ts` — change app name, description, theme color
   - Replace icons in `public/` with your app icons

7. **Update backup config**
   - Edit `App.tsx` — change `appName` prop on PfBackupProvider

8. **Update onboarding**
   - Edit onboarding steps to match your app's first-run experience

9. **Activate deployment**
   - Uncomment one of: deploy-cloudflare.yml, deploy-vercel.yml, deploy-gh-pages.yml
   - Add required secrets to GitHub repo settings

10. **Set up E2E**
    - Create E2E repo from template: `gh repo create <app-name>-e2e --template encomp/plainfold-scaffold-app-e2e`
    - Update playwright.config.ts and e2e.yml with your app repo name
    - Add APP_REPO_PAT secret

11. **Verify**
    - `npm run dev` — app runs with your domain entity
    - `npm run build` — production build succeeds
    - `npm run typecheck` — no type errors

## Checklist
- [ ] Domain entity defined with types, schema, store, views, form
- [ ] Database schema updated
- [ ] Navigation and routes updated
- [ ] Translations updated for all 3 languages
- [ ] PWA manifest and icons updated
- [ ] Backup appName updated
- [ ] Onboarding steps customized
- [ ] Deployment workflow activated
- [ ] E2E repo created and connected
- [ ] App runs, builds, and type-checks
```

### Skill 2: `plainfold:new-app-e2e` (in scaffold-app-e2e)

**Trigger:** When an agent is asked to set up E2E testing for a Plainfold app or add tests to an existing E2E repo.

**What it does:** Guides the agent through connecting the E2E repo to an app and writing tests following the 5-tier framework.

```markdown
---
name: plainfold:new-app-e2e
description: Set up or extend E2E testing for a Plainfold app.
  Use when creating E2E tests, adding test coverage, or connecting
  the E2E repo to a new app. Enforces the 5-tier testing framework.
---

## Setup (new E2E repo)

1. **Create from template**
   - `gh repo create <app-name>-e2e --template encomp/plainfold-scaffold-app-e2e`

2. **Connect to app repo**
   - Edit `playwright.config.ts` — update app repo path
   - Edit `.github/workflows/e2e.yml` — update app repo name
   - Add `APP_REPO_PAT` secret to GitHub repo settings

3. **Create domain page objects**
   - Add page objects in `tests/e2e/pages/` for your domain views
   - Follow the pattern in `ItemListPage.ts` and `ItemFormPage.ts`
   - Delete the Item* example page objects

4. **Replace example domain tests**
   - Replace `items-*.spec.ts` files in each tier with your domain tests
   - Keep all `smoke-*.spec.ts` and infrastructure tests as-is

## Writing new tests — tier decision guide

Before writing a test, determine which tier it belongs to:

| Ask yourself... | If yes → |
|----------------|----------|
| Is this a core user flow that must work on all browsers/devices? | **Tier 1: Functional** |
| Does this test how a view looks at different screen sizes? | **Tier 2: Responsive** |
| Does this test translated text or locale-specific formatting? | **Tier 3: i18n** |
| Does this test error handling, validation, or edge cases? | **Tier 4: Resilience** |
| Does this test keyboard nav, focus management, or screen readers? | **Tier 5: Accessibility** |

## Test patterns

### Page Object convention
- One page object per view/component
- Locators as class properties using `page.getByTestId()`
- Methods return promises (async/await)
- Methods wait for visibility before interacting

### Seeding data
- `resetDB(page)` — always call at start of test to ensure clean state
- `setupOnboarded(page)` — skip onboarding for tests that don't test it
- `seedSettings(page, key, value)` — inject specific settings

### Responsive tests (Tier 2)
- Test each view at 3 viewports: mobile (375x667), tablet (768x1024), desktop (1280x720)
- Use `test.describe` per viewport
- Assert layout changes: visibility, positioning, component swaps

### Accessibility tests (Tier 5)
- Tab through interactive elements, verify focus order
- Verify ARIA labels on non-text elements
- Test Escape key closes overlays
- Test screen reader announcements for dynamic content

## Checklist
- [ ] Page objects created for all domain views
- [ ] Tier 1: At least 1 happy-path CRUD test per entity
- [ ] Tier 2: Each view tested at mobile, tablet, desktop
- [ ] Tier 3: Domain labels verified in each supported language
- [ ] Tier 4: Form validation errors and empty states tested
- [ ] Tier 5: Keyboard navigation and ARIA labels verified
- [ ] All infrastructure smoke tests still pass
- [ ] CI pipeline runs and e2e-complete check passes
```

### Skill installation

Both skills are committed to their respective repos under `.claude/skills/`:

```
plainfold-scaffold-app/.claude/skills/new-app.md
plainfold-scaffold-app-e2e/.claude/skills/new-app-e2e.md
```

Any agent working in a repo created from these templates will automatically discover and use the skills.
