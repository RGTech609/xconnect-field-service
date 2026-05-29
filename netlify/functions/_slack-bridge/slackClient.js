const SLACK_API = 'https://slack.com/api';

async function slackPost(method, token, body) {
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) {
    const err = new Error(`Slack ${method} failed: ${json.error || res.status}`);
    err.slackResponse = json;
    throw err;
  }
  return json;
}

async function slackGet(method, token, params) {
  const url = new URL(`${SLACK_API}/${method}`);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, String(v));
  });
  const res = await fetch(url.toString(), {
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) {
    const err = new Error(`Slack ${method} failed: ${json.error || res.status}`);
    err.slackResponse = json;
    throw err;
  }
  return json;
}

export function viewsOpen(token, triggerId, view) {
  return slackPost('views.open', token, { trigger_id: triggerId, view });
}

export function chatGetPermalink(token, channel, messageTs) {
  return slackGet('chat.getPermalink', token, { channel, message_ts: messageTs });
}

export function conversationsInfo(token, channel) {
  return slackGet('conversations.info', token, { channel });
}

export function usersInfo(token, user) {
  return slackGet('users.info', token, { user });
}

export function conversationsHistory(token, channel, messageTs) {
  return slackGet('conversations.history', token, {
    channel,
    latest: messageTs,
    inclusive: true,
    limit: 1,
  });
}
