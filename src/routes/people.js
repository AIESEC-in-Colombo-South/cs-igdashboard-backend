const express = require('express');
const { syncPeopleController, listPeopleController } = require('../controllers/peopleController');

const router = express.Router();

router.get('/', listPeopleController);
router.post('/sync', syncPeopleController);

module.exports = router;
