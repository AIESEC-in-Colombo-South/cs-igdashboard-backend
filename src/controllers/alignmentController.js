const {
  listSignupAlignmentCounts,
  listApplicationAlignmentCounts,
  listSignupAlignmentDailyCounts,
  listApplicationAlignmentDailyCounts
} = require('../services/alignmentService');

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

function parseTodayFlag(value) {
  if (value === undefined) {
    return false;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'y', 'on', 't'].includes(normalized);
}

function parseDate(value, fieldName) {
  if (!value) {
    const error = new Error(`Missing required query parameter: ${fieldName}`);
    error.status = 400;
    throw error;
  }

  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    const error = new Error(`Invalid date format for ${fieldName}. Use YYYY-MM-DD.`);
    error.status = 400;
    throw error;
  }

  return date;
}

function parseDateRange(query) {
  const startDate = parseDate(query.start, 'start');
  const endDate = parseDate(query.end, 'end');

  if (endDate < startDate) {
    const error = new Error('Query parameter "end" must be on or after "start".');
    error.status = 400;
    throw error;
  }

  return { startDate, endDate };
}

async function signupAlignmentController(req, res, next) {
  try {
    const ids = parseIds(req.query.ids);
    const today = parseTodayFlag(req.query.today);
    const data = await listSignupAlignmentCounts({ ids, today });
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function applicationAlignmentController(req, res, next) {
  try {
    const ids = parseIds(req.query.ids);
    const today = parseTodayFlag(req.query.today);
    const data = await listApplicationAlignmentCounts({ ids, today });
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function signupAlignmentDailyController(req, res, next) {
  try {
    const ids = parseIds(req.query.ids);
    const { startDate, endDate } = parseDateRange(req.query);
    const data = await listSignupAlignmentDailyCounts({ ids, startDate, endDate });
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function applicationAlignmentDailyController(req, res, next) {
  try {
    const ids = parseIds(req.query.ids);
    const { startDate, endDate } = parseDateRange(req.query);
    const data = await listApplicationAlignmentDailyCounts({ ids, startDate, endDate });
    res.json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  signupAlignmentController,
  applicationAlignmentController,
  signupAlignmentDailyController,
  applicationAlignmentDailyController
};
