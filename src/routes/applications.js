const express = require('express');
const {
  syncApplicationsController,
  listApplicationsController
} = require('../controllers/applicationController');

const router = express.Router();

router.get('/', listApplicationsController);
router.post('/sync', syncApplicationsController);

module.exports = router;
