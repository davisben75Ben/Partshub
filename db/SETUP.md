# PartsHub D1 setup (deployment checklist)

Code supports a D1 binding named `PARTSHUB_DB`. The live Cloudflare database has **not** been provisioned by these GitHub commits.

1. In Cloudflare, create a D1 database named `partshub-catalog`; note its actual database UUID.
2. Add the following to `wrangler.jsonc` (replace the placeholder UUID with the actual value):
```json
"d1_databases": [
  { "binding": "PARTSHUB_DB", "database_name": "partshub-catalog", "database_id": "REPLACE_WITH_ACTUAL_D1_UUID" }
]
```
3. Apply schema: `npx wrangler d1 execute partshub-catalog --remote --file=./db/schema.sql`.
4. Deploy the Worker using the existing build pipeline. Do not replace its existing assets configuration.
5. Visit `/api/core/health`. Expect `databaseConnected:true`, `catalogStorage:"d1"` and `partCount:0` before import.
6. The `/api/core/search?partNumber=R45TS` endpoint will return zero results until a sourced record is imported. This is expected. Do not describe seed references as verified catalog data.

Import safeguards: only authorized data; normalize part numbers by uppercasing and removing punctuation; retain brand, provenance and verification status; never invent fitment, interchanges or prices. No public write/import endpoint until authenticated access controls are implemented.

If the D1 binding is absent, the API continues to return two clearly labeled manual seed references. If D1 is bound but schema/query fails, it returns 503 instead of silently serving misleading data.
