import { pfEslintConfig } from '@plainfold/dev-config/eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  pfEslintConfig,
])
