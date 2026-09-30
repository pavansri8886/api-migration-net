import { defineProject } from '../../src/types';

/**
 * prj-a: where its APIs live and rules shared by all of them.
 * Values ending in "Env" are NAMES of environment variables; the values are in env/.env.<environment>.
 */
export default defineProject({
  // Used by every API below unless the API overrides it (e.g. all APIs behind one gateway).
  defaults: {
    v1: { urlEnv: 'PRJA_V1_URL', auth: { type: 'none' } },
    v2: { urlEnv: 'PRJA_V2_URL', auth: { type: 'none' } },
    // When auth is known, replace "none", for example:
    // v1: { urlEnv: 'PRJA_V1_URL', auth: { type: 'azureAd', scopeEnv: 'PRJA_V1_SCOPE' } },
    // v2: { urlEnv: 'PRJA_V2_URL', auth: { type: 'bearer', tokenEnv: 'PRJA_V2_TOKEN' } },
  },

  // Every API folder must be listed. {} means: use the defaults above.
  apis: {
    'api-crew': {},
    // 'api-b': { v2: { urlEnv: 'PRJA_B_V2_URL' } },   // example: api-b has its own V2 host
  },

  // Fields every prj-a API returns that are allowed to differ between V1 and V2.
  rules: {
    ignore: ['**.traceId', '**.correlationId'],
  },
});
