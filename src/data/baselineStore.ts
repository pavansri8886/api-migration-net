import * as fs from 'fs';
import * as path from 'path';
import { ROOT, TEST_ENV } from '../config/env';
import { ApiContext } from '../types';

/** baselines/<env>/<project>/<api>/<endpoint>/<caseId>.json. Written only by the framework. */
export interface Baseline {
  status: number;
  /** Normalized body: ignored fields are already removed. */
  body: unknown;
  recordedAt: string;
  note: string;
}

function fileFor(ctx: ApiContext, endpointName: string, caseId: string): string {
  const safeId = caseId.replace(/[^\w.-]/g, '_');
  return path.join(ROOT, 'baselines', TEST_ENV, ctx.project, ctx.api, endpointName, `${safeId}.json`);
}

export function readBaseline(ctx: ApiContext, endpointName: string, caseId: string): Baseline | undefined {
  const file = fileFor(ctx, endpointName, caseId);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf-8')) as Baseline) : undefined;
}

export function writeBaseline(ctx: ApiContext, endpointName: string, caseId: string, baseline: Baseline): void {
  const file = fileFor(ctx, endpointName, caseId);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(baseline, null, 2)}\n`);
}
