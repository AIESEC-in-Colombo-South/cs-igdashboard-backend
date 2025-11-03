const { createApproval, getApprovalSums } = require('../services/approvalService');

function parseIds(rawIds) {
  if (!rawIds) {
    return [];
  }

  const values = Array.isArray(rawIds) ? rawIds : String(rawIds).split(',');

  const unique = new Set();

  values.forEach((value) => {
    const trimmed = String(value).trim();
    if (!trimmed) {
      return;
    }

    const numeric = Number(trimmed);
    if (!Number.isNaN(numeric)) {
      unique.add(numeric);
    }
  });

  return [...unique];
}

async function createApprovalController(req, res, next) {
  try {
    const payload = {
      lc_alignment_id:
        req.query?.lc_alignment_id ??
        req.query?.alignment ??
        req.params?.lc_alignment_id,
      value:
        req.query?.value ??
        req.query?.approvals ??
        req.params?.value
    };

    console.log('[createApprovalController] Query payload:', payload);

    const approval = await createApproval(payload);

    console.log('[createApprovalController] Stored approval:', approval);

    res.status(201).json({
      success: true,
      data: approval
    });
  } catch (error) {
    next(error);
  }
}

async function getApprovalSumsController(req, res, next) {
  try {
    const ids = parseIds(req.query.ids);
    console.log('[getApprovalSumsController] Parsed ids:', ids);

    const data = await getApprovalSums({ ids });

    console.log('[getApprovalSumsController] Result:', data);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createApprovalController,
  getApprovalSumsController
};
