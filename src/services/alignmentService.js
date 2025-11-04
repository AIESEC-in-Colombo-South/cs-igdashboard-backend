const Person = require('../models/person');
const Application = require('../models/application');
const {
  PROGRAMME_IDS,
  PROGRAMME_TYPES,
  PROGRAMME_TYPES_SET,
  OGT_PROGRAMME_IDS_STRINGS
} = require('../constants/programmes');

const SRI_LANKA_OFFSET_MINUTES = 5 * 60 + 30; // UTC+5:30
const PROGRAMME_TYPE_VALUES = Array.from(PROGRAMME_TYPES_SET);

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

function createProgrammeBuckets() {
  return {
    [PROGRAMME_TYPES.OGV]: 0,
    [PROGRAMME_TYPES.OGT]: 0
  };
}

function formatProgrammeCounts(results, ids, valueKey) {
  const alignmentMap = new Map();

  results.forEach((item) => {
    const alignmentId = Number(item._id.alignmentId ?? item._id);
    const programmeType = item._id.programType;

    if (!PROGRAMME_TYPES_SET.has(programmeType)) {
      return;
    }

    let buckets = alignmentMap.get(alignmentId);

    if (!buckets) {
      buckets = createProgrammeBuckets();
      alignmentMap.set(alignmentId, buckets);
    }

    buckets[programmeType] += item.count;
  });

  const defaultIds =
    Array.isArray(ids) && ids.length > 0
      ? ids.map((id) => Number(id))
      : [...alignmentMap.keys()].sort((a, b) => a - b);

  return defaultIds.map((alignmentId) => {
    const buckets = alignmentMap.get(alignmentId) || createProgrammeBuckets();
    const total = buckets[PROGRAMME_TYPES.OGV] + buckets[PROGRAMME_TYPES.OGT];

    return {
      lc_alignment_id: alignmentId,
      [valueKey]: {
        total,
        [PROGRAMME_TYPES.OGV]: buckets[PROGRAMME_TYPES.OGV],
        [PROGRAMME_TYPES.OGT]: buckets[PROGRAMME_TYPES.OGT]
      }
    };
  });
}

function applicationProgramTypeExpression() {
  return {
    $switch: {
      branches: [
        {
          case: { $eq: ['$opportunity.programme.id', PROGRAMME_IDS.OGV] },
          then: PROGRAMME_TYPES.OGV
        },
        {
          case: { $eq: ['$opportunity.programme.id', PROGRAMME_IDS.OGT] },
          then: PROGRAMME_TYPES.OGT
        },
        {
          case: { $eq: ['$opportunity.programme.id', PROGRAMME_IDS.OGT_ALT] },
          then: PROGRAMME_TYPES.OGT
        }
      ],
      default: null
    }
  };
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
      $project: {
        alignmentId: '$lc_alignment.id',
        programmeIds: {
          $map: {
            input: { $ifNull: ['$person_profile.selected_programmes', []] },
            as: 'programme',
            in: {
              $cond: [
                { $eq: [{ $type: '$$programme' }, 'string'] },
                '$$programme',
                { $toString: '$$programme' }
              ]
            }
          }
        }
      }
    },
    {
      $addFields: {
        programType: {
          $cond: [
            { $in: [String(PROGRAMME_IDS.OGV), '$programmeIds'] },
            PROGRAMME_TYPES.OGV,
            {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $setIntersection: ['$programmeIds', OGT_PROGRAMME_IDS_STRINGS]
                      }
                    },
                    0
                  ]
                },
                PROGRAMME_TYPES.OGT,
                null
              ]
            }
          ]
        }
      }
    },
    {
      $match: {
        programType: { $in: PROGRAMME_TYPE_VALUES }
      }
    },
    {
      $group: {
        _id: {
          alignmentId: '$alignmentId',
          programType: '$programType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.alignmentId': 1 }
    }
  ]);

  return formatProgrammeCounts(results, ids, 'signups');
}

async function listApplicationAlignmentCounts({ ids, today } = {}) {
  const todayRange = resolveTodayRange(today);
  const results = await Application.aggregate([
    { $match: buildMatchStage('lc_alignment_id', ids, 'created_at', todayRange) },
    {
      $project: {
        alignmentId: '$lc_alignment_id',
        personId: '$person.id',
        programType: applicationProgramTypeExpression()
      }
    },
    {
      $match: {
        programType: { $in: PROGRAMME_TYPE_VALUES },
        personId: { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          alignmentId: '$alignmentId',
          programType: '$programType'
        },
        personIds: { $addToSet: '$personId' }
      }
    },
    {
      $project: {
        _id: 1,
        count: { $size: '$personIds' }
      }
    },
    {
      $sort: { '_id.alignmentId': 1 }
    }
  ]);

  return formatProgrammeCounts(results, ids, 'applications');
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
  const countsByDay = new Map();

  results.forEach((item) => {
    const alignmentId = Number(item._id.alignmentId);
    const day = item._id.day;
    const programmeType = item._id.programType;

    if (!PROGRAMME_TYPES_SET.has(programmeType)) {
      return;
    }

    if (!countsByDay.has(day)) {
      countsByDay.set(day, new Map());
    }

    const dayMap = countsByDay.get(day);

    if (!dayMap.has(alignmentId)) {
      dayMap.set(alignmentId, createProgrammeBuckets());
    }

    const buckets = dayMap.get(alignmentId);
    buckets[programmeType] += item.count;
  });

  const defaultIds =
    ids && ids.length > 0
      ? ids.map((id) => Number(id))
      : [...new Set(results.map((item) => Number(item._id.alignmentId)))].sort(
          (a, b) => a - b
        );

  return dayKeys.map((day) => ({
    date: day,
    counts: defaultIds.map((alignmentId) => ({
      lc_alignment_id: alignmentId,
      [valueKey]: (() => {
        const buckets =
          countsByDay.get(day)?.get(alignmentId) || createProgrammeBuckets();
        const total = buckets[PROGRAMME_TYPES.OGV] + buckets[PROGRAMME_TYPES.OGT];

        return {
          total,
          [PROGRAMME_TYPES.OGV]: buckets[PROGRAMME_TYPES.OGV],
          [PROGRAMME_TYPES.OGT]: buckets[PROGRAMME_TYPES.OGT]
        };
      })()
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
        },
        programmeIds: {
          $map: {
            input: { $ifNull: ['$person_profile.selected_programmes', []] },
            as: 'programme',
            in: {
              $cond: [
                { $eq: [{ $type: '$$programme' }, 'string'] },
                '$$programme',
                { $toString: '$$programme' }
              ]
            }
          }
        }
      }
    },
    {
      $addFields: {
        programType: {
          $cond: [
            { $in: [String(PROGRAMME_IDS.OGV), '$programmeIds'] },
            PROGRAMME_TYPES.OGV,
            {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $setIntersection: ['$programmeIds', OGT_PROGRAMME_IDS_STRINGS]
                      }
                    },
                    0
                  ]
                },
                PROGRAMME_TYPES.OGT,
                null
              ]
            }
          ]
        }
      }
    },
    {
      $match: {
        programType: { $in: PROGRAMME_TYPE_VALUES }
      }
    },
    {
      $group: {
        _id: { alignmentId: '$alignmentId', day: '$day', programType: '$programType' },
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
        },
        personId: '$person.id',
        programType: applicationProgramTypeExpression()
      }
    },
    {
      $match: {
        programType: { $in: PROGRAMME_TYPE_VALUES },
        personId: { $ne: null }
      }
    },
    {
      $group: {
        _id: {
          alignmentId: '$alignmentId',
          day: '$day',
          programType: '$programType'
        },
        personIds: { $addToSet: '$personId' }
      }
    },
    {
      $project: {
        _id: 1,
        count: { $size: '$personIds' }
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
