import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { PROJECTS_DIR, loadProjectConfig } from '../config/projectConfig';
import { loadTestCases } from '../data/loadTestCases';
import { EndpointDefinition } from '../types';

// Checks every project without calling any API, so mistakes are caught in the pull request,
// not during a test run: unlisted APIs, missing files, wrong names, broken test data.

const dirs = (p: string) => fs.readdirSync(p).filter((d) => fs.statSync(path.join(p, d)).isDirectory());

for (const project of dirs(PROJECTS_DIR)) {
  test.describe(`project ${project}`, () => {
    test('project.config.ts is valid and lists exactly the API folders', () => {
      const config = loadProjectConfig(project);
      expect(Object.keys(config.apis).sort()).toEqual(dirs(path.join(PROJECTS_DIR, project)).sort());
    });

    for (const api of dirs(path.join(PROJECTS_DIR, project))) {
      const apiDir = path.join(PROJECTS_DIR, project, api);

      test(`${api}: endpoints, test data and specs are consistent`, () => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const endpoints: Record<string, EndpointDefinition> = require(path.join(apiDir, 'endpoints'));
        const names = Object.keys(endpoints);
        expect(names.length, 'endpoints/index.ts exports no endpoints').toBeGreaterThan(0);

        for (const name of names) {
          const e = endpoints[name];
          expect(fs.existsSync(path.join(apiDir, 'endpoints', `${name}.ts`)), `export "${name}" must match a file endpoints/${name}.ts`).toBe(true);
          expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], `${name}: method`).toContain(e.method);
          expect(e.path?.v2, `${name}: path.v2 is required`).toBeTruthy();
          expect(() => loadTestCases({ project, api, apiDir }, name)).not.toThrow();
        }

        for (const mode of ['compare', 'regression']) {
          const spec = path.join(apiDir, 'tests', `${api}.${mode}.spec.ts`);
          expect(fs.existsSync(spec), `missing tests/${api}.${mode}.spec.ts`).toBe(true);
        }
      });
    }
  });
}
