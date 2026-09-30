import { env } from 'cloudflare:workers';
export function getStore(): D1Database { if (!env.DB) throw new Error('Practice storage is unavailable'); return env.DB; }
