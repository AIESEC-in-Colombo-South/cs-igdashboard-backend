const Application = require('../models/application');
const Person = require('../models/person');
const { fetchApplications } = require('./expaClient');

const NOVEMBER_CREATED_AT_CUTOFF_ISO = '2024-11-05T00:00:00Z';
const NOVEMBER_CREATED_AT_CUTOFF = new Date(NOVEMBER_CREATED_AT_CUTOFF_ISO);

function enforceNovemberCreatedAtCutoff(filters) {
  const baseFilters =
    filters && typeof filters === 'object' && !Array.isArray(filters) ? { ...filters } : {};

  const existingCreatedAt =
    baseFilters.created_at && typeof baseFilters.created_at === 'object'
      ? { ...baseFilters.created_at }
      : {};

  const existingFromRaw = existingCreatedAt.from;
  const existingFromDate = existingFromRaw ? new Date(existingFromRaw) : null;
  const shouldOverrideFrom =
    !existingFromDate ||
    Number.isNaN(existingFromDate.getTime()) ||
    existingFromDate < NOVEMBER_CREATED_AT_CUTOFF;

  if (shouldOverrideFrom) {
    existingCreatedAt.from = NOVEMBER_CREATED_AT_CUTOFF_ISO;
  }

  baseFilters.created_at = existingCreatedAt;
  return baseFilters;
}

function toDate(value) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeLocation(rawLocation) {
  if (!rawLocation) {
    return undefined;
  }

  return {
    id: rawLocation.id != null ? Number(rawLocation.id) : null,
    name: rawLocation.name ?? null
  };
}

function normalizeProgramme(rawProgramme) {
  if (!rawProgramme) {
    return undefined;
  }

  return {
    id: rawProgramme.id != null ? Number(rawProgramme.id) : null,
    short_name_display: rawProgramme.short_name_display ?? null
  };
}

function normalizePerson(rawPerson) {
  if (!rawPerson) {
    return undefined;
  }

  return {
    id: rawPerson.id != null ? Number(rawPerson.id) : null,
    full_name: rawPerson.full_name ?? null,
    email: rawPerson.email ?? null,
    home_lc: normalizeLocation(rawPerson.home_lc),
    home_mc: normalizeLocation(rawPerson.home_mc)
  };
}

function normalizeOpportunity(rawOpportunity) {
  if (!rawOpportunity) {
    return undefined;
  }

  return {
    id: rawOpportunity.id != null ? Number(rawOpportunity.id) : null,
    title: rawOpportunity.title ?? null,
    programme: normalizeProgramme(rawOpportunity.programme)
  };
}

function normalizeApplication(rawApplication) {
  const applicationId = Number(rawApplication?.id);

  if (Number.isNaN(applicationId)) {
    throw new Error('Application record missing numeric id from EXPA response.');
  }

  return {
    id: applicationId,
    status: rawApplication.status ?? null,
    current_status: rawApplication.current_status ?? null,
    created_at: toDate(rawApplication.created_at),
    updated_at: toDate(rawApplication.updated_at),
    date_matched: toDate(rawApplication.date_matched),
    date_approved: toDate(rawApplication.date_approved),
    person: normalizePerson(rawApplication.person),
    opportunity: normalizeOpportunity(rawApplication.opportunity)
  };
}

async function syncApplications({ page, perPage, filters, q }) {
  const filteredGraphqlFilters = enforceNovemberCreatedAtCutoff(filters);
  const applications = await fetchApplications({
    page,
    perPage,
    filters: filteredGraphqlFilters,
    q
  });

  console.log(`[syncApplications] fetched=${applications.length}`);

  const fetched = applications.length;

  if (!fetched) {
    return { fetched: 0, eligible: 0, inserted: 0, skipped: 0 };
  }

  const colomboSouthApplications = applications.filter((application) => {
    const homeLcId = application?.person?.home_lc?.id;
    const homeLcName = application?.person?.home_lc?.name;

    return (homeLcId === '1340' || homeLcId === 1340) && homeLcName === 'COLOMBO SOUTH';
  });

  if (!colomboSouthApplications.length) {
    return { fetched, eligible: 0, inserted: 0, skipped: fetched };
  }

  const novemberApplications = colomboSouthApplications.filter((application) => {
    if (!application?.created_at) {
      return false;
    }

    const createdDate = new Date(application.created_at);

    if (Number.isNaN(createdDate.getTime())) {
      return false;
    }

    return createdDate.getUTCMonth() === 10; // November
  });

  console.log(`[syncApplications] eligibleForNovember=${novemberApplications.length}`);

  if (!novemberApplications.length) {
    return { fetched, eligible: 0, inserted: 0, skipped: 0 };
  }

  const normalizedApplications = novemberApplications.map((application) =>
    normalizeApplication(application)
  );

  const personIds = [
    ...new Set(
      normalizedApplications
        .map((application) => application.person?.id)
        .filter((id) => id != null)
    )
  ];

  if (personIds.length) {
    const people = await Person.find({ id: { $in: personIds } })
      .select({ id: 1, 'lc_alignment.id': 1 })
      .lean();

    const alignmentMap = new Map(
      people
        .map((person) => {
          const alignmentId = person?.lc_alignment?.id;
          return alignmentId != null ? [person.id, alignmentId] : null;
        })
        .filter(Boolean)
    );

    normalizedApplications.forEach((application) => {
      const alignmentId = alignmentMap.get(application.person?.id);
      if (alignmentId != null) {
        application.lc_alignment_id = alignmentId;
      }
    });
  }

  console.log(
    `[syncApplications] normalized sample ids=${normalizedApplications
      .slice(0, 5)
      .map((app) => app.id)
      .join(', ')}`
  );

  const candidateIds = normalizedApplications.map((application) => application.id);

  const existingApplications = await Application.find({ id: { $in: candidateIds } })
    .select({ id: 1 })
    .lean();

  const existingIds = new Set(existingApplications.map((application) => application.id));

  const newApplications = normalizedApplications.filter(
    (application) => !existingIds.has(application.id)
  );

  console.log(
    `[syncApplications] existing=${existingIds.size} new=${newApplications.length}`
  );

  if (!newApplications.length) {
    return {
      fetched,
      eligible: normalizedApplications.length,
      inserted: 0,
      skipped: normalizedApplications.length
    };
  }

  await Application.insertMany(newApplications, { ordered: false });

  return {
    fetched,
    eligible: normalizedApplications.length,
    inserted: newApplications.length,
    skipped: normalizedApplications.length - newApplications.length
  };
}

async function listApplications({
  page = 1,
  perPage = 50,
  status,
  currentStatus,
  search
}) {
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const boundedPerPage = Math.min(Math.max(perPage, 1), 100);

  const query = {};

  if (status) {
    query.status = status;
  }

  if (currentStatus) {
    query.current_status = currentStatus;
  }

  if (search) {
    query['person.full_name'] = { $regex: search, $options: 'i' };
  }

  const [data, total] = await Promise.all([
    Application.find(query)
      .sort({ updated_at: -1 })
      .skip((safePage - 1) * boundedPerPage)
      .limit(boundedPerPage)
      .lean(),
    Application.countDocuments(query)
  ]);

  return {
    data,
    pagination: {
      page: safePage,
      perPage: boundedPerPage,
      total,
      totalPages: Math.ceil(total / boundedPerPage) || 1
    }
  };
}

module.exports = {
  syncApplications,
  listApplications,
  normalizeApplication
};
