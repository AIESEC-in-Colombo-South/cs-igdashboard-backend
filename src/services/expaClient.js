// services/expaClient.js
// Requires Node 18+ (global fetch). If using older Node, set globalThis.fetch = require('undici').fetch

const config = require('../config/env');

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const isTransientFieldError = (errors) =>
  Array.isArray(errors) &&
  errors.some((e) => /try to execute the query for this field later/i.test(e?.message || ''));

/**
 * executeExpaQuery
 * - Sends the GraphQL query to EXPA.
 * - Retries on transient resolver errors, 5xx HTTP, and network errors.
 * - Returns `data` even when GraphQL `errors` exists (when data is present).
 *
 * IMPORTANT: this function uses config.expaToken exactly as-is when present,
 * with no trimming or prefixing (per your request).
 */
async function executeExpaQuery(query, variables = {}, { retries = 0, baseDelayMs = 0 } = {}) {
  const token = config.expaToken; // intentionally used exactly as-is (no trim / no "Bearer " prefix)
  const body = JSON.stringify({ query, variables });

  let attempt = 0;

  while (true) {
    try {
      const res = await fetch(config.expaUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'aiesec-ig-sync',
          ...(token ? { Authorization: token } : {}),
          'Cache-Control': 'no-store'
        },
        body,
        keepalive: true
      });

      const text = await res.text();

      if (!res.ok) {
        // Retry 5xx by backoff
        if (res.status >= 500 && attempt < retries) {
          attempt += 1;
          await sleep(baseDelayMs * 2 ** (attempt - 1));
          continue;
        }
        throw new Error(`EXPA request failed with status ${res.status}${text ? `: ${text}` : ''}`);
      }
      if (!text) {
        throw new Error('EXPA GraphQL responded without a body.');
      }

      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error('Failed to parse EXPA GraphQL response.');
      }

      const { data, errors } = payload || {};

      // If EXPA returns the transient field error, retry with backoff
      if (isTransientFieldError(errors) && attempt < retries) {
        attempt += 1;
        await sleep(baseDelayMs * 2 ** (attempt - 1));
        continue;
      }

      // If there's some data, return it (even if errors exist)
      if (data && Object.keys(data).length > 0) {
        return data;
      }

      // If no usable data, but there are errors, throw them
      if (Array.isArray(errors) && errors.length > 0) {
        const msg = errors.map((e) => e.message).join('; ');
        throw new Error(`EXPA GraphQL error: ${msg}`);
      }

      // Nothing to return
      return null;
    } catch (err) {
      // network-level retry
      const isNetworky = /fetch failed|network|timeout|ECONN|ENOTFOUND|EAI_AGAIN/i.test(err.message || '');
      if (isNetworky && attempt < retries) {
        attempt += 1;
        await sleep(baseDelayMs * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }
  }
}

/* ---------- GraphQL queries ---------- */

const PEOPLE_INDEX_QUERY = `
  query PeopleIndexQuery($page: Int, $perPage: Int, $filters: PeopleFilter, $q: String) {
    allPeople(page: $page, per_page: $perPage, filters: $filters, q: $q) {
      data {
        id
        has_opportunity_applications
        full_name
        created_at
        updated_at
        last_active_at
        status
        home_lc { id name }
        home_mc { id name }
        person_profile { selected_programmes }
        lc_alignment { id }
      }
    }
  }
`;

const APPLICATION_INDEX_QUERY = `
  query ApplicationIndexByCS(
    $page: Int = 1,
    $per_page: Int = 100,
    $q: String = "",
    $filters: ApplicationFilter
  ) {
    allOpportunityApplication(page: $page, per_page: $per_page, q: $q, filters: $filters) {
      data {
        id
        status
        current_status
        created_at
        updated_at
        date_matched
        date_approved
        person {
          id
          full_name
          email
          home_lc { id name }
          home_mc { id name }
        }
        opportunity {
          id
          title
          programme { id short_name_display }
        }
      }
    }
  }
`;

/* ---------- exported fetchers ---------- */

function sanitizeVariables(variables = {}) {
  return Object.fromEntries(
    Object.entries(variables).filter(
      ([, value]) => value !== null && value !== undefined
    )
  );
}

async function fetchPeople({ page = 1, perPage = 50, filters = null, q = null } = {}) {
  const safePerPage = Math.max(1, Math.min(perPage, 150));
  const variables = sanitizeVariables({
    page,
    perPage: safePerPage,
    filters,
    q
  });

  const data = await executeExpaQuery(PEOPLE_INDEX_QUERY, variables);
  return data?.allPeople?.data ?? [];
}

async function fetchApplications({ page = 1, perPage = 30, filters = null, q = null } = {}) {
  const safePerPage = Math.max(1, Math.min(perPage, 50));
  const variables = sanitizeVariables({
    page,
    per_page: safePerPage,
    filters,
    q
  });

  const data = await executeExpaQuery(APPLICATION_INDEX_QUERY, variables);
  return data?.allOpportunityApplication?.data ?? [];
}

/**
 * fetchAllApplications - fetch pages until an empty page is returned.
 * Adds small jitter between page requests to reduce chances of throttle.
 */
async function fetchAllApplications({ startPage = 1, perPage = 100, filters = null, q = null } = {}) {
  const results = [];
  let page = startPage;

  while (true) {
    const chunk = await fetchApplications({ page, perPage, filters, q });
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    results.push(...chunk);
    page += 1;
    // gentle pacing + jitter
    await sleep(250 + Math.floor(Math.random() * 200));
  }

  return results;
}

module.exports = {
  executeExpaQuery,
  PEOPLE_INDEX_QUERY,
  APPLICATION_INDEX_QUERY,
  fetchPeople,
  fetchApplications,
  fetchAllApplications
};
