## AIESEC IG Backend API

Base URL (local development):

```
http://localhost:3000
```

Unless noted otherwise, API responses include a `success` flag alongside a payload.

```json
{
  "success": true
}
```

Errors return `success: false` with an explanatory `message`.

The health check endpoint is the only exception and responds with a plain status object.

---

### Health Check

- **GET** `/health`
- Purpose: verify the service is running.
- Response:

```json
{
  "status": "ok"
}
```

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
- Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "full_name": "Sample Person",
      "status": "open",
      "has_opportunity_applications": false,
      "created_at": "2024-11-05T12:34:56.789Z",
      "updated_at": "2024-11-07T09:15:00.000Z",
      "last_active_at": null,
      "person_profile": {
        "selected_programmes": ["GV"]
      },
      "home_lc": { "id": 1340, "name": "COLOMBO SOUTH" },
      "home_mc": { "id": 1000, "name": "SRI LANKA" },
      "lc_alignment": { "id": 39880 }
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

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
- Response:

```json
{
  "success": true,
  "synced": 42,
  "details": {
    "fetched": 60,
    "eligible": 45,
    "inserted": 42,
    "skipped": 3
  }
}
```

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
- Response:

```json
{
  "success": true,
  "data": [
    {
      "id": 456,
      "status": "open",
      "current_status": "matched",
      "created_at": "2024-11-09T08:00:00.000Z",
      "updated_at": "2024-11-11T11:30:00.000Z",
      "date_matched": "2024-11-10T00:00:00.000Z",
      "date_approved": null,
      "person": {
        "id": 123,
        "full_name": "Sample Person",
        "email": "person@example.com",
        "home_lc": { "id": 1340, "name": "COLOMBO SOUTH" },
        "home_mc": { "id": 1000, "name": "SRI LANKA" }
      },
      "opportunity": {
        "id": 890,
        "title": "Marketing Intern",
        "programme": { "id": 1, "short_name_display": "GV" }
      },
      "lc_alignment_id": 39880
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 25,
    "total": 75,
    "totalPages": 3
  }
}
```

**Postman example**

```
Method: GET
URL: http://localhost:3000/applications?page=1&perPage=25&status=open&currentStatus=matched&search=jane
```

#### Sync applications (November-only import)

- **POST** `/applications/sync`
- Body matches signups sync payload.
- Response:

```json
{
  "success": true,
  "synced": 15,
  "details": {
    "fetched": 20,
    "eligible": 18,
    "inserted": 15,
    "skipped": 3
  }
}
```

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

Each response includes `signups`/`applications` objects with `total`, `ogv`, and `ogt` counts. Application totals reflect unique people per programme per alignment (duplicate programme applications from the same person are counted once).

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
    {
      "lc_alignment_id": 39880,
      "signups": { "total": 5, "ogv": 3, "ogt": 2 }
    },
    {
      "lc_alignment_id": 7669,
      "signups": { "total": 0, "ogv": 0, "ogt": 0 }
    }
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
        {
          "lc_alignment_id": 39880,
          "applications": { "total": 1, "ogv": 1, "ogt": 0 }
        },
        {
          "lc_alignment_id": 7669,
          "applications": { "total": 0, "ogv": 0, "ogt": 0 }
        }
      ]
    },
    {
      "date": "2025-01-07",
      "counts": [
        {
          "lc_alignment_id": 39880,
          "applications": { "total": 2, "ogv": 1, "ogt": 1 }
        },
        {
          "lc_alignment_id": 7669,
          "applications": { "total": 1, "ogv": 0, "ogt": 1 }
        }
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
  - `programme_id` (required – `7` for OGV, `8` or `9` for OGT)
  - `value` (required, non-negative number)
- Response: HTTP `201 Created`

```json
{
  "success": true,
  "data": {
    "_id": "6744d7a14f39fec4052d0e52",
    "lc_alignment_id": 39880,
    "programme_id": 7,
    "value": 3,
    "createdAt": "2024-11-11T10:05:21.123Z",
    "updatedAt": "2024-11-11T10:05:21.123Z"
  }
}
```

**Postman example**

```
Method: POST
URL: http://localhost:3000/approvals?lc_alignment_id=39880&programme_id=7&value=3
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
    {
      "lc_alignment_id": 39880,
      "approvals": { "total": 7, "ogv": 4, "ogt": 3 }
    },
    {
      "lc_alignment_id": 7669,
      "approvals": { "total": 0, "ogv": 0, "ogt": 0 }
    },
    {
      "lc_alignment_id": 13106,
      "approvals": { "total": 4, "ogv": 1, "ogt": 3 }
    }
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
