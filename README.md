## AIESEC IG Backend

Express service that pulls people and opportunity application data from the EXPA GraphQL endpoint and stores it in MongoDB.

### Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Duplicate the environment template:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` with your MongoDB connection string and EXPA API token. If your URI omits a database name, supply it via `MONGODB_DB_NAME` (the example defaults to `iGHackathon`).
4. Start the server:
   ```bash
   npm run dev
   ```

### Triggering a sync via API

**Sign ups**

Send a POST request to `http://localhost:3000/people/sync` with an optional payload to control pagination or filtering:

```json
{
  "page": 1,
  "perPage": 50,
  "filters": null,
  "q": null
}
```

The service will fetch the latest data from `https://gis-api.aiesec.org/graphql` and write only brand-new November records into the `signups` collection. Existing people stay untouched.

**Applications**

Send a POST request to `http://localhost:3000/applications/sync` with an optional payload:

```json
{
  "page": 1,
  "perPage": 50,
  "filters": null,
  "q": null
}
```

This fetches opportunity application records and inserts new November items into the `applications` collection.

### Reading synced data

**Sign ups**

Fetch stored records with:

```
GET http://localhost:3000/people?page=1&perPage=50&status=open&search=john
```

Query parameters are optional:

- `page` (default `1`)
- `perPage` (default `50`, max `100`)
- `status` (filters by EXPA status)
- `search` (case-insensitive match on `full_name`)

**Applications**

Fetch stored application records with:

```
GET http://localhost:3000/applications?page=1&perPage=50&status=open&currentStatus=matched&search=jane
```

Query parameters are optional:

- `page` (default `1`)
- `perPage` (default `50`, max `100`)
- `status` (filters by EXPA status)
- `currentStatus` (filters by EXPA current_status)
- `search` (case-insensitive match on applicant full name)

**LC alignment metrics**

Fetch signup counts per alignment:

```
GET http://localhost:3000/alignments/signups
```

Fetch application counts per alignment:

```
GET http://localhost:3000/alignments/applications
```

Both endpoints return an array of `{ lc_alignment_id, signups/applications }` objects where each metric includes `total`, `ogv`, and `ogt` counts. Application totals reflect unique people per programme per alignment—multiple applications from the same person in the same programme are counted once. When you pass explicit `ids`, any alignment without data is returned with zeroed totals.

You can optionally filter the response by providing a comma-separated list of alignment IDs:

```
GET http://localhost:3000/alignments/signups?ids=39880,7669,13106,10231
GET http://localhost:3000/alignments/applications?ids=39880,7669,13106,10231
```

Append `today=true` to restrict counts to records created today (midnight–midnight UTC):

```
GET http://localhost:3000/alignments/signups?ids=39880,7669&today=true
GET http://localhost:3000/alignments/applications?today=true
```

For day-by-day breakdowns within a custom date range (e.g., weekly dashboards), use the daily endpoints. Provide `start` and `end` in `YYYY-MM-DD` format and optional alignment IDs:

```
GET http://localhost:3000/alignments/signups/daily?start=2025-01-06&end=2025-01-12&ids=39880,7669
GET http://localhost:3000/alignments/applications/daily?start=2025-01-06&end=2025-01-12&ids=39880,7669
```

The daily endpoints return an array ordered by date. Each item contains the date and the counts per requested alignment, defaulting to zero when no records exist.

**Approvals tracking**

Record manual approval totals per alignment:

```
POST http://localhost:3000/approvals?lc_alignment_id=39880&programme_id=7&value=3
```

Retrieve summed approvals (optionally filtered by alignment IDs):

```
GET http://localhost:3000/approvals
GET http://localhost:3000/approvals?ids=39880,7669,13106
```

The response contains `{ lc_alignment_id, approvals }` entries with `total`, `ogv`, and `ogt` subtotals. When `ids` are provided, alignments with no stored approvals return zeroed values.

### Running as a cron job (Render)

- Run a one-off sync locally with:
  ```bash
  npm run sync
  ```
  This command will sequentially run both people and application sync jobs.
- To sync only applications you can still run:
  ```bash
  npm run sync:applications
  ```
- For Render Cron Jobs set the schedule to every 5 minutes and the command to:
  ```bash
  npm run sync
  ```

You can override defaults via environment variables:

- `MONGODB_DB_NAME` – database used when `MONGODB_URI` does not include one
- `SYNC_PAGE` – page number (default `1`)
- `SYNC_PER_PAGE` – records per page (default `50`)
- `SYNC_FILTERS` – JSON stringified GraphQL filters object
- `SYNC_QUERY` – free-text search string
- `CORS_ALLOW_ORIGINS` – comma-separated list of allowed origins (defaults to `*`)

Regardless of trigger, only records created in November are synced for both people and applications.

## Approvals

GET http://localhost:3000/approvals?ids=39880,7669,13106
POST http://localhost:3000/approvals?lc_alignment_id=7669&value=2

## Sign Ups

Time range

GET http://localhost:3000/alignments/signups/daily?start=2025-11-01&end=2025-11-03&ids=39880,7669,13106,10231

Today

GET http://localhost:3000/alignments/signups?ids=39880,7669,13106,10231&today=true

All

GET http://localhost:3000/alignments/applications?ids=39880,7669,13106,10231

## Applications

GET http://localhost:3000/alignments/applications?ids=39880,7669,13106,10231&today=true

GET http://localhost:3000/alignments/applications/daily?start=2025-11-01&end=2025-11-04&ids=39880,7669

GET http://localhost:3000/alignments/signups?ids=39880,7669,13106,10231
