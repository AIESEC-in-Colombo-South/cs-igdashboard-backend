const express = require('express');
const {
  createApprovalController,
  getApprovalSumsController
} = require('../controllers/approvalController');

const router = express.Router();

router.post('/', createApprovalController);
router.get('/', getApprovalSumsController);

module.exports = router;
