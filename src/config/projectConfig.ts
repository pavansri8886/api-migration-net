import * as fs from 'fs';
import * as path from 'path';
import { ROOT, readEnv } from './env';
import { ApiContext, ApiVersion, AuthConfig, CompareRules, EndpointDefinition, ProjectConfig } from '../types';

export const PROJECTS_DIR = path.join(ROOT, 'projects');

/**
 * Works out project and API from where the spec file lives: projects/<project>/<api>/tests.
 * This is why nobody types project or API names anywhere: the folders are the single source of truth.
 */
export function apiContextFrom(testsDir: string): ApiContext {
  const parts = path.relative(PROJECTS_DIR, testsDir).split(path.sep);
  if (parts.length !== 3 || parts[0] === '..' || parts[2] !== 'tests') {
    throw new Error(`Spec files must be in projects/<project>/<api>/tests/, but found one in: ${testsDir}`);
  }
  const [project, api] = parts;
  return { project, api, apiDir: path.join(PROJECTS_DIR, project, api) };
}

const cache = new Map<string, ProjectConfig>();

/** Loads projects/<project>/project.config.ts once per worker. */
export function loadProjectConfig(project: string): ProjectConfig {
  const cached = cache.get(project);
  if (cached) return cached;

  const file = path.join(PROJECTS_DIR, project, 'project.config.ts');
  if (!fs.existsSync(file)) throw new Error(`Missing projects/${project}/project.config.ts`);

  // Loaded at run time (not imported) so a broken config fails only this project's tests.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const loaded = require(file);
  const config = (loaded.default ?? loaded) as ProjectConfig;
  if (!config || typeof config.apis !== 'object') {
    throw new Error(`projects/${project}/project.config.ts must export default defineProject({ apis: { ... } })`);
  }
  cache.set(project, config);
  return config;
}

export interface ResolvedTarget {
  baseUrl: string;
  auth: AuthConfig;
  label: string;
}

/** Where to send requests for one API and version: API settings first, then project defaults. */
export function resolveTarget(ctx: ApiContext, version: ApiVersion): ResolvedTarget {
  const config = loadProjectConfig(ctx.project);
  const apiConfig = config.apis[ctx.api];
  if (!apiConfig) {
    throw new Error(`API "${ctx.api}" is not listed under "apis" in projects/${ctx.project}/project.config.ts`);
  }
  const merged = { ...config.defaults?.[version], ...apiConfig[version] };
  const label = `${ctx.project}/${ctx.api} ${version.toUpperCase()}`;
  if (!merged.urlEnv) {
    throw new Error(`No ${version}.urlEnv for ${ctx.project}/${ctx.api}: set it under "defaults" or "apis" in project.config.ts`);
  }
  return { baseUrl: readEnv(merged.urlEnv, `${label} URL`), auth: merged.auth ?? { type: 'none' }, label };
}

/** Project rules + endpoint rules. */
export function rulesFor(ctx: ApiContext, endpoint: EndpointDefinition): CompareRules {
  const project = loadProjectConfig(ctx.project).rules ?? {};
  return {
    ignore: [...(project.ignore ?? []), ...(endpoint.ignore ?? [])],
    sortArrays: { ...(project.sortArrays ?? {}), ...(endpoint.sortArrays ?? {}) },
    dropNulls: endpoint.dropNulls ?? project.dropNulls ?? false,
  };
}
