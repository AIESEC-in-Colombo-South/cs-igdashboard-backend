const Approval = require('../models/approval');

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

async function createApproval({ lc_alignment_id: alignmentId, value }) {
  console.log('[approvalService] createApproval called with:', {
    lc_alignment_id: alignmentId,
    value
  });

  const lcAlignmentId = validateAlignmentId(alignmentId);
  const safeValue = validateValue(value);

  console.log('[approvalService] Normalized values:', {
    lcAlignmentId,
    safeValue
  });

  const approval = await Approval.create({
    lc_alignment_id: lcAlignmentId,
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
    { $match: matchStage },
    {
      $group: {
        _id: '$lc_alignment_id',
        approvals: { $sum: '$value' }
      }
    },
    { $sort: { _id: 1 } }
  ];

  console.log('[approvalService] Aggregation pipeline:', pipeline);

  const results = await Approval.aggregate(pipeline);

  console.log('[approvalService] Aggregation raw results:', results);

  const formatted = results.map((item) => ({
    lc_alignment_id: Number(item._id),
    approvals: item.approvals
  }));

  console.log('[approvalService] Formatted results:', formatted);

  if (!ids || ids.length === 0) {
    return formatted;
  }

  const lookup = new Map(formatted.map((entry) => [entry.lc_alignment_id, entry.approvals]));

  console.log('[approvalService] Lookup map:', lookup);

  return ids.map((rawId) => {
    const numeric = validateAlignmentId(rawId);
    const approvals = lookup.get(numeric) || 0;
    console.log('[approvalService] Lookup for id:', numeric, 'approvals:', approvals);
    return {
      lc_alignment_id: numeric,
      approvals
    };
  });
}

module.exports = {
  createApproval,
  getApprovalSums
};
