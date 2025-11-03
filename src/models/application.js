const { Schema, model } = require('mongoose');

const LocationSchema = new Schema(
  {
    id: { type: Number },
    name: { type: String }
  },
  { _id: false }
);

const ProgrammeSchema = new Schema(
  {
    id: { type: Number },
    short_name_display: { type: String }
  },
  { _id: false }
);

const PersonSchema = new Schema(
  {
    id: { type: Number },
    full_name: { type: String },
    email: { type: String },
    home_lc: { type: LocationSchema, default: undefined },
    home_mc: { type: LocationSchema, default: undefined }
  },
  { _id: false }
);

const OpportunitySchema = new Schema(
  {
    id: { type: Number },
    title: { type: String },
    programme: { type: ProgrammeSchema, default: undefined }
  },
  { _id: false }
);

const ApplicationSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    status: { type: String },
    current_status: { type: String },
    created_at: { type: Date },
    updated_at: { type: Date },
    date_matched: { type: Date },
    date_approved: { type: Date },
    lc_alignment_id: { type: Number },
    person: { type: PersonSchema, default: undefined },
    opportunity: { type: OpportunitySchema, default: undefined }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = model('Application', ApplicationSchema, 'applications');
