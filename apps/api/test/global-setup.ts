import { execSync } from 'node:child_process';

// Przygotowuje izolowaną testową bazę SQLite przed testami.
// Używa bezpiecznego `migrate deploy` (idempotentny, nie kasuje danych) —
// schemat powstaje z istniejących migracji, a wiersze czyścimy w beforeEach.
export default function globalSetup() {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:./test.db';
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: process.env,
  });
}
