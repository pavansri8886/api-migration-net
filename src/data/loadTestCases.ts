import * as fs from 'fs';
import * as path from 'path';
import { ROOT } from '../config/env';
import { ApiContext, TestCase } from '../types';

const ALLOWED_FIELDS = [
  'id', 'description', 'pathParams', 'query', 'body', 'headers',
  'expectedStatus', 'expectFields', 'tags', 'skipComparison',
];

/**
 * Reads testdata/<endpoint>.json and checks it thoroughly, so a typo like "expectStatus"
 * gives a clear message instead of a test that silently checks nothing.
 */
export function loadTestCases(ctx: ApiContext, endpointName: string): TestCase[] {
  const file = path.join(ctx.apiDir, 'testdata', `${endpointName}.json`);
  const shown = path.relative(ROOT, file);
  if (!fs.existsSync(file)) throw new Error(`Missing test data file ${shown}`);

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (error) {
    throw new Error(`Invalid JSON in ${shown}: ${(error as Error).message}`);
  }
  if (!Array.isArray(raw)) throw new Error(`${shown} must contain a list [ ... ] of test cases`);

  const problems: string[] = [];
  const ids = new Set<string>();
  const isObject = (v: unknown) => v !== null && typeof v === 'object' && !Array.isArray(v);

  raw.forEach((c, i) => {
    const where = `case ${i + 1}${isObject(c) && typeof c.id === 'string' ? ` (${c.id})` : ''}`;
    if (!isObject(c)) return problems.push(`${where}: must be an object`);

    for (const key of Object.keys(c)) {
      if (!ALLOWED_FIELDS.includes(key)) problems.push(`${where}: unknown field "${key}"`);
    }
    if (typeof c.id !== 'string' || !c.id) problems.push(`${where}: "id" is required`);
    else if (ids.has(c.id)) problems.push(`${where}: duplicate id "${c.id}"`);
    else ids.add(c.id);
    if (typeof c.description !== 'string' || !c.description) problems.push(`${where}: "description" is required`);
    if (c.expectedStatus !== undefined && !Number.isInteger(c.expectedStatus)) {
      problems.push(`${where}: "expectedStatus" must be a number`);
    }
    for (const field of ['pathParams', 'query', 'headers', 'expectFields']) {
      if (c[field] !== undefined && !isObject(c[field])) problems.push(`${where}: "${field}" must be an object`);
    }
    if (c.tags !== undefined && !(Array.isArray(c.tags) && c.tags.every((t: unknown) => typeof t === 'string'))) {
      problems.push(`${where}: "tags" must be a list of texts`);
    }
    if (c.skipComparison !== undefined && typeof c.skipComparison !== 'string') {
      problems.push(`${where}: "skipComparison" must be a reason text`);
    }
  });

  if (problems.length) throw new Error(`Problems in ${shown}:\n  - ${problems.join('\n  - ')}`);
  return raw as TestCase[];
}

export const toTags = (tags: string[] = []): string[] => tags.map((t) => (t.startsWith('@') ? t : `@${t}`));

/** Reads a value by a simple path like "licenses[0].status". */
export function getByPath(data: unknown, pathExpr: string): unknown {
  const tokens = pathExpr.replace(/^\$\.?/, '').replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let current: unknown = data;
  for (const t of tokens) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[t];
  }
  return current;
}
