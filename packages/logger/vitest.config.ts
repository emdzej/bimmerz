import { defineConfig } from 'vitest/config';

// Lets `pnpm --filter @emdzej/bimmerz-logger test` find the tests
// when run from inside the package dir. The root config has its own
// `include` glob that picks them up from the repo root.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
