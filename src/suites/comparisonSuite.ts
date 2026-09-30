import { test, expect } from '../fixtures';
import { settings } from '../config/env';
import { apiContextFrom, rulesFor } from '../config/projectConfig';
import { normalize } from '../compare/normalize';
import { diff, formatDifferences } from '../compare/diff';
import { getByPath, loadTestCases, toTags } from '../data/loadTestCases';
import { writeBaseline } from '../data/baselineStore';
import { schemaFileFor, validateSchema } from '../data/validateSchema';
import { EndpointDefinition, TestCase } from '../types';

/**
 * Compare mode (during migration): the same request goes to V1 and V2, and the cleaned
 * responses must be identical. Called from projects/<project>/<api>/tests/<api>.compare.spec.ts.
 *
 * With RECORD_BASELINE=true, every case where V1 and V2 match is saved as a baseline,
 * so the V1 "truth" is kept for regression after V1 is switched off.
 */
export function defineComparisonTests(testsDir: string, endpoints: Record<string, EndpointDefinition>): void {
  const ctx = apiContextFrom(testsDir);

  for (const [name, endpoint] of Object.entries(endpoints)) {
    test.describe(`${ctx.project} > ${ctx.api} > ${name} [compare]`, () => {
      let cases: TestCase[];
      try {
        cases = loadTestCases(ctx, name);
      } catch (error) {
        // A broken file fails only this endpoint; every other endpoint, API and project still runs.
        test('test data could not be loaded', () => {
          throw error;
        });
        return;
      }

      for (const tc of cases) {
        test(`${tc.id}: ${tc.description}`, { tag: toTags(tc.tags) }, async ({ clients }, testInfo) => {
          test.skip(!!tc.skipComparison, tc.skipComparison);
          test.skip(!endpoint.path.v1, 'Endpoint has no V1 path (exists only in V2)');

          const [v1, v2] = await Promise.all([clients.get(ctx, 'v1'), clients.get(ctx, 'v2')]);
          const [r1, r2] = await Promise.all([v1.send(endpoint, tc), v2.send(endpoint, tc)]);

          const rules = rulesFor(ctx, endpoint);
          const n1 = normalize(r1.body, rules);
          const n2 = normalize(r2.body, rules);
          const differences = diff(n1, n2);

          // Evidence in the HTML report
          await testInfo.attach('v1-response', { body: JSON.stringify(r1, null, 2), contentType: 'application/json' });
          await testInfo.attach('v2-response', { body: JSON.stringify(r2, null, 2), contentType: 'application/json' });
          if (differences.length) {
            await testInfo.attach('differences', { body: JSON.stringify(differences, null, 2), contentType: 'application/json' });
          }
          testInfo.annotations.push({ type: 'timing', description: `V1 ${r1.durationMs} ms, V2 ${r2.durationMs} ms` });

          if (settings.recordBaseline && r1.status === r2.status && differences.length === 0) {
            writeBaseline(ctx, name, tc.id, {
              status: r2.status,
              body: n2,
              recordedAt: new Date().toISOString(),
              note: 'V1 and V2 matched when recorded',
            });
            testInfo.annotations.push({ type: 'baseline', description: 'recorded' });
          }

          // Soft checks: all problems of this case are reported together
          expect.soft(r2.status, 'HTTP status of V2 should match V1').toBe(r1.status);
          if (tc.expectedStatus !== undefined) {
            expect.soft(r1.status, 'V1 status differs from expectedStatus in the test data').toBe(tc.expectedStatus);
          }
          for (const [fieldPath, expected] of Object.entries(tc.expectFields ?? {})) {
            expect.soft(getByPath(r2.body, fieldPath), `V2 field ${fieldPath}`).toEqual(expected);
          }
          const schemaFile = schemaFileFor(ctx, name);
          if (schemaFile && r2.status < 300) {
            const errors = validateSchema(schemaFile, r2.body);
            expect.soft(errors, `V2 schema violations:\n${errors.join('\n')}`).toEqual([]);
          }

          // The main check
          expect(differences, formatDifferences(differences)).toEqual([]);
        });
      }
    });
  }
}
