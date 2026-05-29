import { verifySlackSignature } from './_slack-bridge/verifySlackSignature.js';
import { chatGetPermalink, conversationsInfo, usersInfo, viewsOpen } from './_slack-bridge/slackClient.js';
import { buildIncidentModalView, MODAL_CALLBACK_ID, BLOCK_IDS } from './_slack-bridge/modalView.js';
import { mapViewSubmissionToAppSheetRow, validateRequired } from './_slack-bridge/mapSubmission.js';
import { appsheetAddRow } from './_slack-bridge/appsheetClient.js';

function textResponse(statusCode, body, headers = {}) {
  return { statusCode, headers: { 'Content-Type': 'text/plain', ...headers }, body };
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function parseFormUrlEncoded(rawBody) {
  const params = new URLSearchParams(rawBody);
  const payloadStr = params.get('payload');
  if (!payloadStr) return null;
  try { return JSON.parse(payloadStr); } catch { return null; }
}

async function handleButtonOpenModal(payload, env) {
  const action = payload.actions?.[0];
  let parsed = {};
  try { parsed = JSON.parse(action?.value || '{}'); } catch { /* noop */ }
  const channel = parsed.channel || payload.channel?.id;
  const ts = parsed.ts;
  const token = env.SLACK_BOT_TOKEN;

  let permalink = '';
  if (channel && ts) {
    try {
      const pl = await chatGetPermalink(token, channel, ts);
      permalink = pl.permalink || '';
    } catch (err) {
      console.warn('[slack-interactivity] chat.getPermalink failed', err.message);
    }
  }

  if (channel) {
    try {
      const info = await conversationsInfo(token, channel);
      if (info.channel?.is_private) {
        return jsonResponse(200, { response_action: 'errors' });
      }
    } catch (err) {
      console.warn('[slack-interactivity] conversations.info failed', err.message);
    }
  }

  let createdBy = payload.user?.name || payload.user?.id || '';
  try {
    const u = await usersInfo(token, payload.user?.id);
    createdBy = u.user?.profile?.real_name || u.user?.real_name || u.user?.name || createdBy;
  } catch (err) {
    console.warn('[slack-interactivity] users.info failed', err.message);
  }

  const privateMetadata = JSON.stringify({
    channel,
    ts,
    permalink,
    createdBy,
    reactorUserId: payload.user?.id,
  });

  try {
    await viewsOpen(token, payload.trigger_id, buildIncidentModalView({ privateMetadata, env }));
  } catch (err) {
    console.error('[slack-interactivity] views.open failed', err.message, err.slackResponse);
  }

  return { statusCode: 200, body: '' };
}

async function handleViewSubmission(payload, env) {
  if (payload.view?.callback_id !== MODAL_CALLBACK_ID) {
    return { statusCode: 200, body: '' };
  }

  let metadata = {};
  try { metadata = JSON.parse(payload.view.private_metadata || '{}'); } catch { /* noop */ }

  const row = mapViewSubmissionToAppSheetRow({
    state: payload.view.state,
    slackContext: {
      channel: metadata.channel,
      ts: metadata.ts,
      permalink: metadata.permalink,
      createdBy: metadata.createdBy || payload.user?.name || '',
    },
  });

  const missing = validateRequired(row);
  if (missing.length > 0) {
    const errors = {};
    const reverseMap = {
      'Customer': BLOCK_IDS.customer,
      'Customer District': BLOCK_IDS.customerDistrict,
      'Operating Company': BLOCK_IDS.operatingCompany,
      'XC Products Gun System': BLOCK_IDS.productLine,
    };
    missing.forEach((field) => {
      const blockId = reverseMap[field];
      if (blockId) errors[blockId] = 'Required';
    });
    return jsonResponse(200, { response_action: 'errors', errors });
  }

  try {
    await appsheetAddRow({
      appId: env.APPSHEET_APP_ID,
      apiKey: env.APPSHEET_API_KEY,
      tableName: env.APPSHEET_TABLE_NAME || 'Incident',
      row,
    });
  } catch (err) {
    console.error('[slack-interactivity] AppSheet add failed', err.message, err.responseText);
    return jsonResponse(200, {
      response_action: 'errors',
      errors: { [BLOCK_IDS.notes]: 'Failed to create incident in AppSheet. Please retry.' },
    });
  }

  return { statusCode: 200, body: '' };
}

export const handler = async (req) => {
  if (req.httpMethod !== 'POST') return textResponse(405, 'Method Not Allowed');

  const env = process.env;
  const rawBody = req.body || '';
  const timestamp = req.headers['x-slack-request-timestamp'] || req.headers['X-Slack-Request-Timestamp'];
  const signature = req.headers['x-slack-signature'] || req.headers['X-Slack-Signature'];

  if (!verifySlackSignature({
    signingSecret: env.SLACK_SIGNING_SECRET,
    timestamp,
    signature,
    rawBody,
  })) {
    return textResponse(401, 'invalid signature');
  }

  const payload = parseFormUrlEncoded(rawBody);
  if (!payload) return textResponse(400, 'invalid payload');

  if (env.SLACK_APP_ID && payload.api_app_id && payload.api_app_id !== env.SLACK_APP_ID) {
    console.warn('[slack-interactivity] api_app_id mismatch', payload.api_app_id);
    return { statusCode: 200, body: '' };
  }

  if (payload.type === 'block_actions') {
    const actionId = payload.actions?.[0]?.action_id;
    if (actionId === 'xc_open_incident_modal') return handleButtonOpenModal(payload, env);
    return { statusCode: 200, body: '' };
  }

  if (payload.type === 'view_submission') return handleViewSubmission(payload, env);

  return { statusCode: 200, body: '' };
};
