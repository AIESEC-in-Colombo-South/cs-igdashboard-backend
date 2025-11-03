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
    const { lc_alignment_id, value } = req.body || {};

    if (lc_alignment_id == null || value == null) {
      const error = new Error('lc_alignment_id and value are required.');
      error.status = 400;
      throw error;
    }

    const approval = await createApproval({ lc_alignment_id, value });

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
    const data = await getApprovalSums({ ids });

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
