import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

/** Repository root (this file is src/config/env.ts). */
export const ROOT = path.resolve(__dirname, '../..');

/** Which environment we run against. Selects env/.env.<TEST_ENV> and baselines/<TEST_ENV>/. */
export const TEST_ENV = process.env.TEST_ENV ?? 'dev';

const envFile = path.join(ROOT, 'env', `.env.${TEST_ENV}`);
if (fs.existsSync(envFile)) {
  // Values already set (e.g. by the pipeline) are never overwritten.
  dotenv.config({ path: envFile });
}

export const settings = {
  recordBaseline: process.env.RECORD_BASELINE === 'true',
  ignoreHttpsErrors: process.env.IGNORE_HTTPS_ERRORS === 'true',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 30_000),
};

/**
 * Reads a required environment variable with a message that says exactly what is missing and where to add it.
 * Called only when a value is really needed, so a missing value fails only the API that needs it.
 */
export function readEnv(name: string, neededFor: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Environment variable ${name} is not set (needed for ${neededFor}, TEST_ENV=${TEST_ENV}). ` +
        `Add it to env/.env.${TEST_ENV} or to the pipeline variable group.`,
    );
  }
  return value;
}
