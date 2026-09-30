import { test as base, request, APIRequestContext } from '@playwright/test';
import { settings } from './config/env';
import { resolveTarget } from './config/projectConfig';
import { ApiClient } from './http/apiClient';
import { ApiContext, ApiVersion } from './types';

/**
 * Creates clients on demand and reuses them for every test of the same API in this worker.
 * One pool serves all projects and APIs; what differs per API comes from project.config.ts.
 */
export class ClientPool {
  private readonly clients = new Map<string, Promise<ApiClient>>();
  private readonly contexts: APIRequestContext[] = [];

  get(ctx: ApiContext, version: ApiVersion): Promise<ApiClient> {
    const key = `${ctx.project}/${ctx.api}/${version}`;
    let client = this.clients.get(key);
    if (!client) {
      client = this.create(ctx, version);
      this.clients.set(key, client);
    }
    return client;
  }

  private async create(ctx: ApiContext, version: ApiVersion): Promise<ApiClient> {
    const target = resolveTarget(ctx, version); // throws a clear error if config or env is missing
    const context = await request.newContext({ ignoreHTTPSErrors: settings.ignoreHttpsErrors });
    this.contexts.push(context);
    return new ApiClient(context, target, version);
  }

  async dispose(): Promise<void> {
    await Promise.all(this.contexts.map((c) => c.dispose()));
  }
}

/** The only fixture of the framework: a worker scoped client pool. */
export const test = base.extend<object, { clients: ClientPool }>({
  clients: [
    async ({}, use) => {
      const pool = new ClientPool();
      await use(pool);
      await pool.dispose();
    },
    { scope: 'worker' },
  ],
});

export { expect } from '@playwright/test';
