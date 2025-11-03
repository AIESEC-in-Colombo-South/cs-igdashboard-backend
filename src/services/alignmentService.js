const Person = require('../models/person');
const Application = require('../models/application');

const SRI_LANKA_OFFSET_MINUTES = 5 * 60 + 30; // UTC+5:30

function buildMatchStage(fieldName, ids, dateField, dateRange) {
  const base = {};

  if (Array.isArray(ids) && ids.length > 0) {
    base[fieldName] = { $in: ids };
  } else {
    base[fieldName] = { $ne: null };
  }

  if (dateRange && dateField) {
    base[dateField] = {
      $gte: dateRange.start,
      $lt: dateRange.end
    };
  }

  return base;
}

function resolveTodayRange(enabled) {
  if (!enabled) {
    return null;
  }

  const offsetMs = SRI_LANKA_OFFSET_MINUTES * 60 * 1000;
  const now = Date.now();
  const localNow = new Date(now + offsetMs);
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth();
  const day = localNow.getUTCDate();

  const startUtcMs = Date.UTC(year, month, day) - offsetMs;
  const start = new Date(startUtcMs);

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
}

async function listSignupAlignmentCounts({ ids, today } = {}) {
  const todayRange = resolveTodayRange(today);
  const results = await Person.aggregate([
    { $match: buildMatchStage('lc_alignment.id', ids, 'created_at', todayRange) },
    {
      $group: {
        _id: '$lc_alignment.id',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const formatted = results.map((item) => ({
    lc_alignment_id: Number(item._id),
    signups: item.count
  }));

  if (!ids || ids.length === 0) {
    return formatted;
  }

  const lookup = new Map(formatted.map((entry) => [entry.lc_alignment_id, entry.signups]));

  return ids.map((rawId) => {
    const numeric = Number(rawId);
    return {
      lc_alignment_id: numeric,
      signups: lookup.get(numeric) || 0
    };
  });
}

async function listApplicationAlignmentCounts({ ids, today } = {}) {
  const todayRange = resolveTodayRange(today);
  const results = await Application.aggregate([
    { $match: buildMatchStage('lc_alignment_id', ids, 'created_at', todayRange) },
    {
      $group: {
        _id: '$lc_alignment_id',
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  const formatted = results.map((item) => ({
    lc_alignment_id: Number(item._id),
    applications: item.count
  }));

  if (!ids || ids.length === 0) {
    return formatted;
  }

  const lookup = new Map(
    formatted.map((entry) => [entry.lc_alignment_id, entry.applications])
  );

  return ids.map((rawId) => {
    const numeric = Number(rawId);
    return {
      lc_alignment_id: numeric,
      applications: lookup.get(numeric) || 0
    };
  });
}

function toUtcStartOfDay(value) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function createDateSeries(startInclusive, endInclusive) {
  const days = [];
  const cursor = new Date(startInclusive);

  while (cursor <= endInclusive) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
}

function expandDailyResults(results, ids, dayKeys, valueKey) {
  const normalized = results.map((item) => ({
    alignmentId: Number(item._id.alignmentId),
    day: item._id.day,
    count: item.count
  }));

  const defaultIds =
    ids && ids.length > 0
      ? ids.map((id) => Number(id))
      : [...new Set(normalized.map((item) => item.alignmentId))].sort((a, b) => a - b);

  const lookup = new Map();
  normalized.forEach((item) => {
    lookup.set(`${item.alignmentId}|${item.day}`, item.count);
  });

  return dayKeys.map((day) => ({
    date: day,
    counts: defaultIds.map((alignmentId) => ({
      lc_alignment_id: alignmentId,
      [valueKey]: lookup.get(`${alignmentId}|${day}`) || 0
    }))
  }));
}

async function listSignupAlignmentDailyCounts({ ids, startDate, endDate }) {
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required for daily alignment counts.');
  }

  const start = toUtcStartOfDay(startDate);
  const endInclusive = toUtcStartOfDay(endDate);
  const endExclusive = new Date(endInclusive);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const dateRange = { start, end: endExclusive };

  const matchStage = buildMatchStage('lc_alignment.id', ids, 'created_at', dateRange);

  const results = await Person.aggregate([
    { $match: matchStage },
    {
      $project: {
        alignmentId: '$lc_alignment.id',
        day: {
          $dateToString: {
            date: '$created_at',
            format: '%Y-%m-%d',
            timezone: 'UTC'
          }
        }
      }
    },
    {
      $group: {
        _id: { alignmentId: '$alignmentId', day: '$day' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.day': 1, '_id.alignmentId': 1 } }
  ]);

  const dayKeys = createDateSeries(start, endInclusive);
  return expandDailyResults(results, ids, dayKeys, 'signups');
}

async function listApplicationAlignmentDailyCounts({ ids, startDate, endDate }) {
  if (!startDate || !endDate) {
    throw new Error('startDate and endDate are required for daily alignment counts.');
  }

  const start = toUtcStartOfDay(startDate);
  const endInclusive = toUtcStartOfDay(endDate);
  const endExclusive = new Date(endInclusive);
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

  const dateRange = { start, end: endExclusive };

  const matchStage = buildMatchStage('lc_alignment_id', ids, 'created_at', dateRange);

  const results = await Application.aggregate([
    { $match: matchStage },
    {
      $project: {
        alignmentId: '$lc_alignment_id',
        day: {
          $dateToString: {
            date: '$created_at',
            format: '%Y-%m-%d',
            timezone: 'UTC'
          }
        }
      }
    },
    {
      $group: {
        _id: { alignmentId: '$alignmentId', day: '$day' },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.day': 1, '_id.alignmentId': 1 } }
  ]);

  const dayKeys = createDateSeries(start, endInclusive);
  return expandDailyResults(results, ids, dayKeys, 'applications');
}

module.exports = {
  listSignupAlignmentCounts,
  listApplicationAlignmentCounts,
  listSignupAlignmentDailyCounts,
  listApplicationAlignmentDailyCounts
};
