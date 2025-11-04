const Approval = require('../models/approval');
const {
  PROGRAMME_ID_TO_TYPE,
  PROGRAMME_TYPES,
  PROGRAMME_TYPES_SET,
  resolveProgrammeTypeFromId
} = require('../constants/programmes');

const ALLOWED_PROGRAMME_IDS = Array.from(PROGRAMME_ID_TO_TYPE.keys());

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validateAlignmentId(lcAlignmentId) {
  const numeric = Number(lcAlignmentId);

  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    throw validationError('lc_alignment_id must be a valid number.');
  }

  return numeric;
}

function validateValue(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || Number.isNaN(numeric) || numeric < 0) {
    throw validationError('value must be a non-negative number.');
  }

  return numeric;
}

function validateProgrammeId(programmeId) {
  const numeric = Number(programmeId);

  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    throw validationError('programme_id must be a valid number.');
  }

  if (!PROGRAMME_ID_TO_TYPE.has(numeric)) {
    throw validationError(
      `programme_id must be one of the supported programme ids: ${ALLOWED_PROGRAMME_IDS.join(
        ', '
      )}.`
    );
  }

  return numeric;
}

function createProgrammeBuckets() {
  return {
    [PROGRAMME_TYPES.OGV]: 0,
    [PROGRAMME_TYPES.OGT]: 0
  };
}

function formatProgrammeApprovals(results, ids) {
  const alignmentMap = new Map();

  results.forEach((item) => {
    const alignmentId = Number(item._id.lc_alignment_id);
    const programmeId = Number(item._id.programme_id);
    const programmeType = resolveProgrammeTypeFromId(programmeId);

    if (!programmeType || !PROGRAMME_TYPES_SET.has(programmeType)) {
      return;
    }

    let buckets = alignmentMap.get(alignmentId);
    if (!buckets) {
      buckets = createProgrammeBuckets();
      alignmentMap.set(alignmentId, buckets);
    }

    buckets[programmeType] += item.approvals;
  });

  const defaultIds =
    Array.isArray(ids) && ids.length > 0
      ? ids.map(validateAlignmentId)
      : [...alignmentMap.keys()].sort((a, b) => a - b);

  return defaultIds.map((alignmentId) => {
    const buckets = alignmentMap.get(alignmentId) || createProgrammeBuckets();
    const total = buckets[PROGRAMME_TYPES.OGV] + buckets[PROGRAMME_TYPES.OGT];

    return {
      lc_alignment_id: alignmentId,
      approvals: {
        total,
        [PROGRAMME_TYPES.OGV]: buckets[PROGRAMME_TYPES.OGV],
        [PROGRAMME_TYPES.OGT]: buckets[PROGRAMME_TYPES.OGT]
      }
    };
  });
}

async function createApproval({ lc_alignment_id: alignmentId, programme_id: programmeId, value }) {
  console.log('[approvalService] createApproval called with:', {
    lc_alignment_id: alignmentId,
    programme_id: programmeId,
    value
  });

  const lcAlignmentId = validateAlignmentId(alignmentId);
  const programmeIdNumeric = validateProgrammeId(programmeId);
  const safeValue = validateValue(value);

  console.log('[approvalService] Normalized values:', {
    lcAlignmentId,
    programmeId: programmeIdNumeric,
    safeValue
  });

  const approval = await Approval.create({
    lc_alignment_id: lcAlignmentId,
    programme_id: programmeIdNumeric,
    value: safeValue
  });

  console.log('[approvalService] Document persisted with _id:', approval._id);

  return approval.toObject();
}

async function getApprovalSums({ ids }) {
  console.log('[approvalService] getApprovalSums called with ids:', ids);

  const matchStage = {};

  if (Array.isArray(ids) && ids.length > 0) {
    const numericIds = ids.map(validateAlignmentId);
    matchStage.lc_alignment_id = { $in: numericIds };
  }

  console.log('[approvalService] Aggregation match stage:', matchStage);

  const pipeline = [
    {
      $match: {
        ...matchStage,
        programme_id: { $in: ALLOWED_PROGRAMME_IDS }
      }
    },
    {
      $group: {
        _id: {
          lc_alignment_id: '$lc_alignment_id',
          programme_id: '$programme_id'
        },
        approvals: { $sum: '$value' }
      }
    },
    { $sort: { '_id.lc_alignment_id': 1, '_id.programme_id': 1 } }
  ];

  console.log('[approvalService] Aggregation pipeline:', pipeline);

  const results = await Approval.aggregate(pipeline);

  console.log('[approvalService] Aggregation raw results:', results);

  const formatted = formatProgrammeApprovals(results, ids);

  console.log('[approvalService] Formatted results:', formatted);

  return formatted;
}

module.exports = {
  createApproval,
  getApprovalSums
};
