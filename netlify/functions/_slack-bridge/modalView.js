import { loadOptions, toSlackOptions } from './options.js';

export const MODAL_CALLBACK_ID = 'xc_incident_modal';

export const BLOCK_IDS = {
  customer: 'customer_block',
  customerDistrict: 'customer_district_block',
  operatingCompany: 'operating_company_block',
  productLine: 'product_line_block',
  notes: 'notes_block',
};

export const ACTION_IDS = {
  customer: 'customer_select',
  customerDistrict: 'customer_district_select',
  operatingCompany: 'operating_company_select',
  productLine: 'product_line_select',
  notes: 'notes_input',
};

function selectBlock({ blockId, actionId, label, field, env, placeholder }) {
  const opts = toSlackOptions(loadOptions(field, env));
  const element = opts.length > 0
    ? {
        type: 'static_select',
        action_id: actionId,
        placeholder: { type: 'plain_text', text: placeholder },
        options: opts,
      }
    : {
        type: 'plain_text_input',
        action_id: actionId,
        placeholder: { type: 'plain_text', text: `${placeholder} (no options configured)` },
      };
  return {
    type: 'input',
    block_id: blockId,
    label: { type: 'plain_text', text: label },
    element,
  };
}

/**
 * Build the Slack modal view.
 * privateMetadata is opaque to Slack; we use it to carry the source-message
 * info (channel, ts, permalink, reactor user id) through to view_submission.
 */
export function buildIncidentModalView({ privateMetadata, env = process.env }) {
  return {
    type: 'modal',
    callback_id: MODAL_CALLBACK_ID,
    private_metadata: privateMetadata,
    title: { type: 'plain_text', text: 'New XC Incident' },
    submit: { type: 'plain_text', text: 'Create' },
    close: { type: 'plain_text', text: 'Cancel' },
    blocks: [
      selectBlock({
        blockId: BLOCK_IDS.customer,
        actionId: ACTION_IDS.customer,
        label: 'Customer',
        field: 'customer',
        env,
        placeholder: 'Select customer',
      }),
      selectBlock({
        blockId: BLOCK_IDS.customerDistrict,
        actionId: ACTION_IDS.customerDistrict,
        label: 'Customer District',
        field: 'customerDistrict',
        env,
        placeholder: 'Select district',
      }),
      selectBlock({
        blockId: BLOCK_IDS.operatingCompany,
        actionId: ACTION_IDS.operatingCompany,
        label: 'Operating Company',
        field: 'operatingCompany',
        env,
        placeholder: 'Select operating company',
      }),
      selectBlock({
        blockId: BLOCK_IDS.productLine,
        actionId: ACTION_IDS.productLine,
        label: 'Product Line',
        field: 'productLine',
        env,
        placeholder: 'Select product line',
      }),
      {
        type: 'input',
        block_id: BLOCK_IDS.notes,
        label: { type: 'plain_text', text: 'Notes' },
        element: {
          type: 'plain_text_input',
          action_id: ACTION_IDS.notes,
          multiline: true,
        },
        optional: true,
      },
    ],
  };
}
