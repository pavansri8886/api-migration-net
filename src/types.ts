/**
 * The contract between the framework (src/) and the projects (projects/).
 * Projects only ever use these types; everything else in src/ is internal.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiVersion = 'v1' | 'v2';

// ---------------------------------------------------------------------------
// Comparison rules
// ---------------------------------------------------------------------------

/** Rules that make two payloads comparable. Used in project.config.ts and endpoint files. */
export interface CompareRules {
  /**
   * Fields allowed to differ. Syntax:
   *   "meta.requestId"     exact path
   *   "licenses[].id"      a field in every item of a list
   *   "**.lastUpdated"     that field name at any depth
   *   "*"                  any single field name
   */
  ignore?: string[];
  /** Lists whose order does not matter: path -> field to sort by ("*" = whole item, "$" = the root list). */
  sortArrays?: Record<string, string>;
  /** Treat "field: null" and a missing field as the same. */
  dropNulls?: boolean;
}

// ---------------------------------------------------------------------------
// Endpoint definition: projects/<project>/<api>/endpoints/<endpoint>.ts
// ---------------------------------------------------------------------------

export interface EndpointDefinition extends CompareRules {
  method: HttpMethod;
  /** Path templates; {name} is filled from pathParams in the test data. v1 is optional so V1 can be retired. */
  path: { v1?: string; v2: string };
  /** Headers every call to this endpoint needs. */
  headers?: Record<string, string>;
}

/** Identity function: exists only so endpoint files get type checking and autocomplete. */
export function defineEndpoint(definition: EndpointDefinition): EndpointDefinition {
  return definition;
}

// ---------------------------------------------------------------------------
// Project configuration: projects/<project>/project.config.ts
// All *Env fields hold the NAME of an environment variable, never the value itself.
// ---------------------------------------------------------------------------

export type AuthConfig =
  | { type: 'none' }
  | { type: 'bearer'; tokenEnv: string }
  | { type: 'apiKey'; header: string; keyEnv: string }
  | {
      type: 'azureAd';
      scopeEnv: string;
      tenantIdEnv?: string; // default AZURE_TENANT_ID
      clientIdEnv?: string; // default AZURE_CLIENT_ID
      clientSecretEnv?: string; // default AZURE_CLIENT_SECRET
    };

export interface VersionTarget {
  urlEnv: string;
  auth?: AuthConfig;
}

export interface ApiTarget {
  v1?: Partial<VersionTarget>;
  v2?: Partial<VersionTarget>;
}

export interface ProjectConfig {
  /** Used by every API unless the API overrides it (typical when all APIs share one gateway). */
  defaults?: ApiTarget;
  /** Every API folder of the project must be listed here, even with {} when it only uses defaults. */
  apis: Record<string, ApiTarget>;
  /** Comparison rules for every endpoint of the project. */
  rules?: CompareRules;
}

export function defineProject(config: ProjectConfig): ProjectConfig {
  return config;
}

// ---------------------------------------------------------------------------
// Test data: projects/<project>/<api>/testdata/<endpoint>.json (an array of these)
// ---------------------------------------------------------------------------

export interface TestCase {
  id: string;
  description: string;
  pathParams?: Record<string, string | number>;
  query?: Record<string, string | number | boolean>;
  body?: unknown;
  headers?: Record<string, string>;
  /** Expected HTTP status. In regression, falls back to the baseline status when not set. */
  expectedStatus?: number;
  /** Specific values the V2 response must contain, e.g. { "licenses[0].status": "VALID" }. */
  expectFields?: Record<string, unknown>;
  /** Become Playwright tags (@smoke), usable with --grep @smoke. */
  tags?: string[];
  /** Reason text. Skips the case in compare mode when V2 behaviour changed on purpose. */
  skipComparison?: string;
}

// ---------------------------------------------------------------------------
// Internal shapes
// ---------------------------------------------------------------------------

/** Where a test belongs, derived from its folder: projects/<project>/<api>/tests. */
export interface ApiContext {
  project: string;
  api: string;
  apiDir: string;
}

export interface ApiResponse {
  version: ApiVersion;
  url: string;
  status: number;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
}
