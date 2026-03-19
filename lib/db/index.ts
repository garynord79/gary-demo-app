import * as schema from "@/lib/db/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "DATABASE_URL is not set. Neon placeholder connection will fail until configured.",
  );
}

const sql = neon(databaseUrl ?? "postgres://user:password@localhost:5432/app");

export const db = drizzle({ client: sql, schema });

// TODO: Replace Neon placeholder with Azure Database for PostgreSQL.
// TODO: Use workload identity / federated credentials for secretless auth where applicable.
