import { verifySlackSignature } from './_slack-bridge/verifySlackSignature.js';

function jsonResponse(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
}

function textResponse(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'text/plain' }, body };
}

function emojiMatches(eventEmoji, configured) {
  if (!eventEmoji || !configured) return false;
  // Slack delivers emoji name without colons, but may include skin-tone suffix.
  const base = eventEmoji.split('::')[0];
  return base.toLowerCase() === configured.toLowerCase();
}

/**
 * Slack does NOT include a trigger_id on reaction_added, so we cannot open a
 * modal directly from this event. Post an ephemeral message to the reactor
 * with a button — clicking it generates a trigger_id that flows to
 * slack-interactivity, which opens the real modal.
 */
async function postOpenerEphemeral({ token, channel, user, ts }) {
  if (!token || !channel || !user || !ts) return;
  const payload = {
    channel,
    user,
    text: 'Create an XC Incident from this message?',
    blocks: [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*Create an XC Incident from this message?*' },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'xc_open_incident_modal',
            style: 'primary',
            text: { type: 'plain_text', text: 'Fill XC Incident' },
            value: JSON.stringify({ channel, ts }),
          },
        ],
      },
    ],
  };
  const res = await fetch('https://slack.com/api/chat.postEphemeral', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) {
    const err = new Error(`chat.postEphemeral failed: ${json.error || res.status}`);
    err.slackResponse = json;
    throw err;
  }
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

  let payload;
  try { payload = JSON.parse(rawBody); } catch { return textResponse(400, 'invalid json'); }

  if (payload.type === 'url_verification') {
    return jsonResponse(200, { challenge: payload.challenge });
  }

  if (payload.type !== 'event_callback') return jsonResponse(200, { ok: true });

  if (env.SLACK_APP_ID && payload.api_app_id && payload.api_app_id !== env.SLACK_APP_ID) {
    console.warn('[slack-events] api_app_id mismatch', payload.api_app_id);
    return jsonResponse(200, { ok: true });
  }

  const event = payload.event || {};
  if (event.type !== 'reaction_added') return jsonResponse(200, { ok: true });

  if (!emojiMatches(event.reaction, env.XC_EMOJI_NAME || 'XC')) {
    return jsonResponse(200, { ok: true });
  }

  // item_user is the message author; channel_type on item may not be set on
  // reaction_added — we re-check public/private inside the interactivity flow
  // via conversations.info if needed.
  try {
    await postOpenerEphemeral({
      token: env.SLACK_BOT_TOKEN,
      channel: event.item?.channel,
      user: event.user,
      ts: event.item?.ts,
    });
  } catch (err) {
    console.error('[slack-events] postEphemeral failed', err.message);
  }

  return jsonResponse(200, { ok: true });
};

export const _internal = { emojiMatches };
