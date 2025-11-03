const { syncPeople, listPeople } = require('../services/peopleService');

async function syncPeopleController(req, res, next) {
  try {
    const { page = 1, perPage = 50, filters = null, q = null } = req.body || {};

    const parsedPage = Number.parseInt(page, 10);
    const parsedPerPage = Number.parseInt(perPage, 10);

    const result = await syncPeople({
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

async function listPeopleController(req, res, next) {
  try {
    const { page = '1', perPage = '50', status, search } = req.query;

    const parsedPage = Number.parseInt(page, 10);
    const parsedPerPage = Number.parseInt(perPage, 10);

    const result = await listPeople({
      page: Number.isNaN(parsedPage) ? 1 : parsedPage,
      perPage: Number.isNaN(parsedPerPage) ? 50 : parsedPerPage,
      status,
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
  syncPeopleController,
  listPeopleController
};
