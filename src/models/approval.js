const { Schema, model } = require('mongoose');

const ApprovalSchema = new Schema(
  {
    lc_alignment_id: { type: Number, required: true, index: true },
    value: { type: Number, required: true, min: 0 }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = model('Approval', ApprovalSchema, 'approvals');
