import { BLOCK_IDS, ACTION_IDS } from './modalView.js';

/**
 * Read a single value from view.state.values for either static_select or
 * plain_text_input fallbacks.
 */
function readValue(state, blockId, actionId) {
  const block = state?.values?.[blockId];
  const action = block?.[actionId];
  if (!action) return '';
  if (action.selected_option?.value != null) return String(action.selected_option.value);
  if (typeof action.value === 'string') return action.value;
  return '';
}

/**
 * Map a Slack view_submission state + Slack context into the AppSheet row
 * payload using the column names confirmed for the Incident table.
 */
export function mapViewSubmissionToAppSheetRow({ state, slackContext }) {
  const customer = readValue(state, BLOCK_IDS.customer, ACTION_IDS.customer);
  const customerDistrict = readValue(state, BLOCK_IDS.customerDistrict, ACTION_IDS.customerDistrict);
  const operatingCompany = readValue(state, BLOCK_IDS.operatingCompany, ACTION_IDS.operatingCompany);
  const productLine = readValue(state, BLOCK_IDS.productLine, ACTION_IDS.productLine);
  const notes = readValue(state, BLOCK_IDS.notes, ACTION_IDS.notes);

  return {
    'Customer': customer,
    'Customer District': customerDistrict,
    'Operating Company': operatingCompany,
    'XC Products Gun System': productLine,
    'Notes': notes,
    'XC Representative': slackContext?.createdBy ?? '',
    'Slack URL': slackContext?.permalink ?? '',
    'Slack TS': slackContext?.ts ?? '',
    'Slack Channel': slackContext?.channel ?? '',
  };
}

/** Returns a list of human-readable error strings (empty array = valid). */
export function validateRequired(row) {
  const required = ['Customer', 'Customer District', 'Operating Company', 'XC Products Gun System'];
  return required.filter((k) => !row[k] || String(row[k]).trim() === '');
}
