## AIESEC IG Backend API

Base URL (local development):

```
http://localhost:3000
```

All responses follow the shape:

```json
{
  "success": true,
  "...": "..."
}
```

Errors return `success: false` with an explanatory `message`.

---

### Health Check

- **GET** `/health`
- Purpose: verify the service is running.

**Postman example**

```
Method: GET
URL: http://localhost:3000/health
```

---

### People (Signups)

#### List signups

- **GET** `/people`
- Query params:
  - `page` (default `1`)
  - `perPage` (default `50`, max `100`)
  - `status` – optional filter on EXPA status
  - `search` – case-insensitive match on `full_name`

**Postman example**

```
Method: GET
URL: http://localhost:3000/people?page=1&perPage=25&status=open&search=ana
```

#### Sync signups (November-only import)

- **POST** `/people/sync`
- Body (JSON):
  - `page` (default `1`)
  - `perPage` (default `50`)
  - `filters` – optional GraphQL filters object
  - `q` – optional free-text search string

**Postman example**

```
Method: POST
URL: http://localhost:3000/people/sync
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "page": 1,
  "perPage": 50,
  "filters": null,
  "q": null
}
```

---

### Applications

#### List stored applications

- **GET** `/applications`
- Query params:
  - `page` (default `1`)
  - `perPage` (default `50`, max `100`)
  - `status` – EXPA status filter
  - `currentStatus` – EXPA current status filter
  - `search` – match on applicant full name

**Postman example**

```
Method: GET
URL: http://localhost:3000/applications?page=1&perPage=25&status=open&currentStatus=matched&search=jane
```

#### Sync applications (November-only import)

- **POST** `/applications/sync`
- Body matches signups sync payload.

**Postman example**

```
Method: POST
URL: http://localhost:3000/applications/sync
Headers:
  Content-Type: application/json
Body (raw JSON):
{
  "page": 1,
  "perPage": 30,
  "filters": null,
  "q": null
}
```

---

### LC Alignment Metrics

#### Aggregate counts

- **GET** `/alignments/signups`
- **GET** `/alignments/applications`
- Query params:
  - `ids` – optional comma-separated list of `lc_alignment_id` values; defaults to all.
  - `today` – optional (`true/false`). When true, restricts counts to today (UTC midnight to midnight).

**Postman example**

```
Method: GET
URL: http://localhost:3000/alignments/signups?ids=39880,7669&today=true
```

Response:

```json
{
  "success": true,
  "data": [
    { "lc_alignment_id": 39880, "signups": 5 },
    { "lc_alignment_id": 7669, "signups": 0 }
  ]
}
```

#### Daily counts (date range)

- **GET** `/alignments/signups/daily`
- **GET** `/alignments/applications/daily`
- Query params:
  - `start` (required) – `YYYY-MM-DD`
  - `end` (required) – `YYYY-MM-DD`
  - `ids` – optional comma-separated list; defaults to all present in range.

**Postman example**

```
Method: GET
URL: http://localhost:3000/alignments/applications/daily?start=2025-01-06&end=2025-01-12&ids=39880,7669
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "date": "2025-01-06",
      "counts": [
        { "lc_alignment_id": 39880, "applications": 1 },
        { "lc_alignment_id": 7669, "applications": 0 }
      ]
    },
    {
      "date": "2025-01-07",
      "counts": [
        { "lc_alignment_id": 39880, "applications": 2 },
        { "lc_alignment_id": 7669, "applications": 1 }
      ]
    }
  ]
}
```

---

### Approvals

Manual approvals tracking separate from EXPA imports.

#### Create approval entry

- **POST** `/approvals`
- Query params:
  - `lc_alignment_id` (required, number)
  - `value` (required, non-negative number)

**Postman example**

```
Method: POST
URL: http://localhost:3000/approvals?lc_alignment_id=39880&value=3
```

#### Get approval totals

- **GET** `/approvals`
- Query params:
  - `ids` – optional comma-separated list of `lc_alignment_id`. When provided, any missing IDs return zero.

**Postman example**

```
Method: GET
URL: http://localhost:3000/approvals?ids=39880,7669,13106
```

Response:

```json
{
  "success": true,
  "data": [
    { "lc_alignment_id": 39880, "approvals": 7 },
    { "lc_alignment_id": 7669, "approvals": 0 },
    { "lc_alignment_id": 13106, "approvals": 4 }
  ]
}
```

---

### Sync Jobs (CLI references)

Although not API endpoints, the following commands run the same logic used by the `/people/sync` and `/applications/sync` routes:

```bash
npm run sync           # sequential people + applications
npm run sync:applications
```

Environment overrides:

- `SYNC_PAGE`
- `SYNC_PER_PAGE`
- `SYNC_FILTERS`
- `SYNC_QUERY`
