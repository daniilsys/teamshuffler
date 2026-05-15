import { config } from './config';
import { createClient } from './client';
import db from './db';

async function main(): Promise<void> {
  await db.$connect();
  console.log('Database connected');

  const client = createClient();
  await client.login(config.token);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
