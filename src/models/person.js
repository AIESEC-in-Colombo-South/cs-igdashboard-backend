const { Schema, model } = require('mongoose');

const LocationSchema = new Schema(
  {
    id: { type: Number },
    name: { type: String }
  },
  { _id: false }
);

const AlignmentSchema = new Schema(
  {
    id: { type: Number }
  },
  { _id: false }
);

const PersonProfileSchema = new Schema(
  {
    selected_programmes: [{ type: String }]
  },
  { _id: false }
);

const PersonSchema = new Schema(
  {
    id: { type: Number, required: true, unique: true, index: true },
    has_opportunity_applications: { type: Boolean },
    full_name: { type: String },
    created_at_expa: { type: Date },
    updated_at: { type: Date },
    last_active_at: { type: Date },
    status: { type: String },
    home_lc: { type: LocationSchema, default: undefined },
    home_mc: { type: LocationSchema, default: undefined },
    person_profile: { type: PersonProfileSchema, default: undefined },
    lc_alignment: { type: AlignmentSchema, default: undefined }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

module.exports = model('Person', PersonSchema, 'signups');
