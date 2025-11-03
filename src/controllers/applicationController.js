const {
  syncApplications,
  listApplications
} = require('../services/applicationService');

async function syncApplicationsController(req, res, next) {
  try {
    const { page = 1, perPage = 50, filters = null, q = null } = req.body || {};

    const parsedPage = Number.parseInt(page, 10);
    const parsedPerPage = Number.parseInt(perPage, 10);

    const result = await syncApplications({
      page: Number.isNaN(parsedPage) ? 1 : parsedPage,
      perPage: Number.isNaN(parsedPerPage) ? 50 : parsedPerPage,
      filters,
      q
    });

    res.json({
      success: true,
      synced: result.inserted || 0,
      details: result
    });
  } catch (error) {
    next(error);
  }
}

async function listApplicationsController(req, res, next) {
  try {
    const { page = '1', perPage = '50', status, currentStatus, search } = req.query;

    const parsedPage = Number.parseInt(page, 10);
    const parsedPerPage = Number.parseInt(perPage, 10);

    const result = await listApplications({
      page: Number.isNaN(parsedPage) ? 1 : parsedPage,
      perPage: Number.isNaN(parsedPerPage) ? 50 : parsedPerPage,
      status,
      currentStatus,
      search
    });

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  syncApplicationsController,
  listApplicationsController
};
