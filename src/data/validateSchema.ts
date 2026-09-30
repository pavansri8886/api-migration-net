import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';
import { ApiContext } from '../types';

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const compiled = new Map<string, ValidateFunction>();

/** schemas/<endpoint>.schema.json if it exists. Schemas are optional. */
export function schemaFileFor(ctx: ApiContext, endpointName: string): string | undefined {
  const file = path.join(ctx.apiDir, 'schemas', `${endpointName}.schema.json`);
  return fs.existsSync(file) ? file : undefined;
}

/** Returns the list of schema violations; an empty list means valid. */
export function validateSchema(schemaFile: string, data: unknown): string[] {
  let validate = compiled.get(schemaFile);
  if (!validate) {
    validate = ajv.compile(JSON.parse(fs.readFileSync(schemaFile, 'utf-8')));
    compiled.set(schemaFile, validate);
  }
  return validate(data) ? [] : (validate.errors ?? []).map((e) => `${e.instancePath || '$'} ${e.message}`);
}
