const Person = require('../models/person');
const { fetchPeople } = require('./expaClient');

function normalizePerson(rawPerson) {
  const personId = Number(rawPerson.id);

  if (Number.isNaN(personId)) {
    throw new Error('Person record missing numeric id from EXPA response.');
  }

  const toDate = (value) => (value ? new Date(value) : null);
  const safeProgrammes =
    rawPerson?.person_profile?.selected_programmes?.map((item) => String(item)) || [];

  const normalized = {
    id: personId,
    has_opportunity_applications: rawPerson.has_opportunity_applications,
    full_name: rawPerson.full_name ?? null,
    created_at: toDate(rawPerson.created_at),
    updated_at: toDate(rawPerson.updated_at),
    last_active_at: toDate(rawPerson.last_active_at),
    status: rawPerson.status ?? null,
    person_profile: {
      selected_programmes: safeProgrammes
    }
  };

  if (rawPerson.home_lc) {
    normalized.home_lc = {
      id: rawPerson.home_lc.id != null ? Number(rawPerson.home_lc.id) : null,
      name: rawPerson.home_lc.name ?? null
    };
  }

  if (rawPerson.home_mc) {
    normalized.home_mc = {
      id: rawPerson.home_mc.id != null ? Number(rawPerson.home_mc.id) : null,
      name: rawPerson.home_mc.name ?? null
    };
  }

  if (rawPerson.lc_alignment) {
    normalized.lc_alignment = {
      id: rawPerson.lc_alignment.id != null ? Number(rawPerson.lc_alignment.id) : null
    };
  }

  return normalized;
}

async function syncPeople({ page, perPage, filters, q }) {
  const people = await fetchPeople({ page, perPage, filters, q });

  console.log(`[syncPeople] fetched=${people.length}`);

  const fetched = people.length;

  if (!fetched) {
    return { fetched: 0, eligible: 0, matched: 0, modified: 0, upserted: 0 };
  }

  const novemberPeople = people.filter((person) => {
    if (!person.created_at) {
      return false;
    }

    const createdDate = new Date(person.created_at);

    if (Number.isNaN(createdDate.getTime())) {
      return false;
    }

    return createdDate.getUTCMonth() === 10; // November
  });

  console.log(`[syncPeople] eligibleForNovember=${novemberPeople.length}`);

  if (!novemberPeople.length) {
    return { fetched, eligible: 0, inserted: 0, skipped: 0 };
  }
  // Use bulkWrite for efficient upserts
  const normalizedPeople = novemberPeople.map((person) => {
    const normalized = normalizePerson(person);
    return normalized;
  });

  console.log(
    `[syncPeople] normalized sample ids=${normalizedPeople.slice(0, 5).map((p) => p.id).join(', ')}`
  );
  const candidateIds = normalizedPeople.map((person) => person.id);

  const existingPeople = await Person.find({ id: { $in: candidateIds } })
    .select({ id: 1 })
    .lean();

  const existingIds = new Set(existingPeople.map((person) => person.id));

  const newPeople = normalizedPeople.filter((person) => !existingIds.has(person.id));

  console.log(`[syncPeople] existing=${existingIds.size} new=${newPeople.length}`);

  if (!newPeople.length) {
    return {
      fetched,
      eligible: normalizedPeople.length,
      inserted: 0,
      skipped: normalizedPeople.length
    };
  }

  await Person.insertMany(newPeople, { ordered: false });

  return {
    fetched,
    eligible: normalizedPeople.length,
    inserted: newPeople.length,
    skipped: normalizedPeople.length - newPeople.length
  };
}

async function listPeople({ page = 1, perPage = 50, status, search }) {
  const safePage = Number.isNaN(page) || page < 1 ? 1 : page;
  const boundedPerPage = Math.min(Math.max(perPage, 1), 100);

  const query = {};

  if (status) {
    query.status = status;
  }

  if (search) {
    query.full_name = { $regex: search, $options: 'i' };
  }

  const [data, total] = await Promise.all([
    Person.find(query)
      .sort({ updated_at: -1 })
      .skip((safePage - 1) * boundedPerPage)
      .limit(boundedPerPage)
      .lean(),
    Person.countDocuments(query)
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
  syncPeople,
  normalizePerson,
  listPeople
};
