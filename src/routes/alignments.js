const express = require('express');
const {
  signupAlignmentController,
  applicationAlignmentController,
  signupAlignmentDailyController,
  applicationAlignmentDailyController
} = require('../controllers/alignmentController');

const router = express.Router();

router.get('/signups/daily', signupAlignmentDailyController);
router.get('/signups', signupAlignmentController);
router.get('/applications/daily', applicationAlignmentDailyController);
router.get('/applications', applicationAlignmentController);

module.exports = router;
