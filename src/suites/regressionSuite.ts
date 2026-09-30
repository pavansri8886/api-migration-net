import { test, expect } from '../fixtures';
import { apiContextFrom, rulesFor } from '../config/projectConfig';
import { normalize } from '../compare/normalize';
import { diff, formatDifferences } from '../compare/diff';
import { getByPath, loadTestCases, toTags } from '../data/loadTestCases';
import { readBaseline } from '../data/baselineStore';
import { schemaFileFor, validateSchema } from '../data/validateSchema';
import { EndpointDefinition, TestCase } from '../types';

/**
 * Regression mode (long term): V2 only. Per case it checks, when available:
 * status, schema, expectFields, and the saved baseline. At least one check must exist.
 * Called from projects/<project>/<api>/tests/<api>.regression.spec.ts.
 */
export function defineRegressionTests(testsDir: string, endpoints: Record<string, EndpointDefinition>): void {
  const ctx = apiContextFrom(testsDir);

  for (const [name, endpoint] of Object.entries(endpoints)) {
    test.describe(`${ctx.project} > ${ctx.api} > ${name} [regression]`, () => {
      let cases: TestCase[];
      try {
        cases = loadTestCases(ctx, name);
      } catch (error) {
        test('test data could not be loaded', () => {
          throw error;
        });
        return;
      }

      for (const tc of cases) {
        test(`${tc.id}: ${tc.description}`, { tag: toTags(tc.tags) }, async ({ clients }, testInfo) => {
          const baseline = readBaseline(ctx, name, tc.id);
          const schemaFile = schemaFileFor(ctx, name);
          const expectedStatus = tc.expectedStatus ?? baseline?.status;
          if (expectedStatus === undefined && !tc.expectFields && !schemaFile && !baseline) {
            throw new Error(`No checks for ${tc.id}: add expectedStatus or expectFields, a schema, or record a baseline`);
          }

          const v2 = await clients.get(ctx, 'v2');
          const res = await v2.send(endpoint, tc);
          await testInfo.attach('v2-response', { body: JSON.stringify(res, null, 2), contentType: 'application/json' });
          testInfo.annotations.push({ type: 'timing', description: `V2 ${res.durationMs} ms` });

          if (expectedStatus !== undefined) expect.soft(res.status, 'HTTP status').toBe(expectedStatus);

          for (const [fieldPath, expected] of Object.entries(tc.expectFields ?? {})) {
            expect.soft(getByPath(res.body, fieldPath), `Field ${fieldPath}`).toEqual(expected);
          }

          if (schemaFile && res.status < 300) {
            const errors = validateSchema(schemaFile, res.body);
            expect.soft(errors, `Schema violations:\n${errors.join('\n')}`).toEqual([]);
          }

          if (baseline) {
            const differences = diff(baseline.body, normalize(res.body, rulesFor(ctx, endpoint)));
            if (differences.length) {
              await testInfo.attach('differences', { body: JSON.stringify(differences, null, 2), contentType: 'application/json' });
            }
            expect(differences, formatDifferences(differences, { expected: 'baseline', actual: 'V2' })).toEqual([]);
          } else {
            testInfo.annotations.push({ type: 'baseline', description: 'none recorded: status, field and schema checks only' });
          }
        });
      }
    });
  }
}
