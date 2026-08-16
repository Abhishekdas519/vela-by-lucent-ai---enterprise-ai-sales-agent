import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

declare global {
  var _postgresPool: Pool | undefined;
  var _drizzleDb: any | undefined;
}

export const createPool = () => {
  if (!global._postgresPool && process.env.DATABASE_URL) {
    global._postgresPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const getDb = () => {
  if (!global._drizzleDb) {
    const pool = createPool();
    if (pool) {
      global._drizzleDb = drizzle(pool, { schema });
    }
  }
  return global._drizzleDb;
};

// Proxy db to allow graceful calls
export const db = new Proxy({} as any, {
  get(target, prop) {
    const activeDb = getDb();
    if (!activeDb) {
      throw new Error('Database not configured (DATABASE_URL missing)');
    }
    return activeDb[prop];
  }
});
