const Approval = require('../models/approval');

function validateAlignmentId(lcAlignmentId) {
  const numeric = Number(lcAlignmentId);

  if (!Number.isFinite(numeric) || Number.isNaN(numeric)) {
    throw new Error('lc_alignment_id must be a valid number.');
  }

  return numeric;
}

function validateValue(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || Number.isNaN(numeric) || numeric < 0) {
    throw new Error('value must be a non-negative number.');
  }

  return numeric;
}

async function createApproval({ lc_alignment_id: alignmentId, value }) {
  const lcAlignmentId = validateAlignmentId(alignmentId);
  const safeValue = validateValue(value);

  const approval = await Approval.create({
    lc_alignment_id: lcAlignmentId,
    value: safeValue
  });

  return approval.toObject();
}

async function getApprovalSums({ ids }) {
  const matchStage = {};

  if (Array.isArray(ids) && ids.length > 0) {
    const numericIds = ids.map(validateAlignmentId);
    matchStage.lc_alignment_id = { $in: numericIds };
  }

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

  const results = await Approval.aggregate(pipeline);

  const formatted = results.map((item) => ({
    lc_alignment_id: Number(item._id),
    approvals: item.approvals
  }));

  if (!ids || ids.length === 0) {
    return formatted;
  }

  const lookup = new Map(formatted.map((entry) => [entry.lc_alignment_id, entry.approvals]));

  return ids.map((rawId) => {
    const numeric = validateAlignmentId(rawId);
    return {
      lc_alignment_id: numeric,
      approvals: lookup.get(numeric) || 0
    };
  });
}

module.exports = {
  createApproval,
  getApprovalSums
};
