const PROGRAMME_IDS = Object.freeze({
  OGV: 7,
  OGT: 8,
  OGT_ALT: 9
});

const PROGRAMME_TYPES = Object.freeze({
  OGV: 'ogv',
  OGT: 'ogt'
});

const PROGRAMME_ID_TO_TYPE = new Map([
  [PROGRAMME_IDS.OGV, PROGRAMME_TYPES.OGV],
  [PROGRAMME_IDS.OGT, PROGRAMME_TYPES.OGT],
  [PROGRAMME_IDS.OGT_ALT, PROGRAMME_TYPES.OGT]
]);

const PROGRAMME_TYPES_SET = new Set([...PROGRAMME_ID_TO_TYPE.values()]);

const OGT_PROGRAMME_IDS = Object.freeze([
  PROGRAMME_IDS.OGT,
  PROGRAMME_IDS.OGT_ALT
]);

const OGT_PROGRAMME_IDS_STRINGS = Object.freeze(OGT_PROGRAMME_IDS.map((id) => String(id)));

function resolveProgrammeTypeFromId(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return null;
  }

  return PROGRAMME_ID_TO_TYPE.get(numeric) || null;
}

function resolveProgrammeTypeFromSelectedProgrammes(programmes = []) {
  const normalized = programmes
    .map((programme) => {
      if (typeof programme === 'string') {
        return programme;
      }

      if (programme !== null && programme !== undefined) {
        const converted = programme.toString();
        return converted;
      }

      return null;
    })
    .filter(Boolean);

  if (normalized.includes(String(PROGRAMME_IDS.OGV))) {
    return PROGRAMME_TYPES.OGV;
  }

  if (
    normalized.some((programmeId) => OGT_PROGRAMME_IDS_STRINGS.includes(programmeId))
  ) {
    return PROGRAMME_TYPES.OGT;
  }

  return null;
}

module.exports = {
  PROGRAMME_IDS,
  PROGRAMME_TYPES,
  PROGRAMME_ID_TO_TYPE,
  PROGRAMME_TYPES_SET,
  OGT_PROGRAMME_IDS,
  OGT_PROGRAMME_IDS_STRINGS,
  resolveProgrammeTypeFromId,
  resolveProgrammeTypeFromSelectedProgrammes
};
