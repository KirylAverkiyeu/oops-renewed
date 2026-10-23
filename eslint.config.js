// eslint.config.js  (ESLint v9 flat config)
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  // ── Global ignores ──────────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', 'db/**'],
  },

  // ── Base JS rules ───────────────────────────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript rules (all .ts / .tsx files) ─────────────────────────────────
  ...tseslint.configs.recommended,

  // ── React rules (src only) ───────────────────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
      'react/prop-types': 'off',         // TypeScript handles prop types
    },
  },

  // ── Project-wide custom rules ────────────────────────────────────────────────
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off', // Server-side code relies on console logging
    },
  },

  // ── Prettier must be last — disables all formatting rules ───────────────────
  prettierConfig,
);

