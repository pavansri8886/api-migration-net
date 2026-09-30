import { defineConfig } from '@playwright/test';

/**
 * Report folder follows what you run:
 *   npx playwright test projects/prj-a/api-crew   -> reports/prj-a/api-crew/
 *   npx playwright test projects/prj-a            -> reports/prj-a/all-apis/
 *   npx playwright test --project=selfcheck       -> reports/selfcheck/
 *   npx playwright test                           -> reports/all-projects/
 */
function reportDir(): string {
  const args = process.argv.slice(2);
  const target = args.find((a) => /(^|[\\/])projects[\\/][^\\/]+/.test(a));
  if (target) {
    const parts = target.replace(/\\/g, '/').split('/').filter(Boolean);
    const i = parts.indexOf('projects');
    const api = parts[i + 2];
    return `reports/${parts[i + 1]}/${api && api !== 'tests' && !api.endsWith('.ts') ? api : 'all-apis'}`;
  }
  if (args.includes('--project=selfcheck') || args.join(' ').includes('--project selfcheck')) return 'reports/selfcheck';
  return 'reports/all-projects';
}

// Optional title or tag filter from the pipeline ("all" or empty runs everything)
const filter = process.env.TEST_FILTER && process.env.TEST_FILTER !== 'all' ? process.env.TEST_FILTER : undefined;
const out = reportDir();

export default defineConfig({
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  grep: filter ? new RegExp(filter) : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: `${out}/html` }],
    ['junit', { outputFile: `${out}/junit/results.xml` }],
  ],
  // No browsers anywhere in this repo: `npx playwright install` is never needed.
  projects: [
    { name: 'comparison', testDir: './projects', testMatch: /\.compare\.spec\.ts$/ },
    { name: 'regression', testDir: './projects', testMatch: /\.regression\.spec\.ts$/ },
    { name: 'selfcheck', testDir: './src/selfcheck', testMatch: /\.test\.ts$/ },
  ],
});
