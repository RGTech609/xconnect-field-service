/**
 * Minimal AppSheet API client.
 * Endpoint: https://www.appsheet.com/api/v2/apps/{appId}/tables/{tableName}/Action
 */
export async function appsheetAddRow({ appId, apiKey, tableName, row }) {
  if (!appId || !apiKey || !tableName) {
    throw new Error('AppSheet client missing appId / apiKey / tableName');
  }
  const url = `https://www.appsheet.com/api/v2/apps/${encodeURIComponent(appId)}/tables/${encodeURIComponent(tableName)}/Action`;
  const body = {
    Action: 'Add',
    Properties: { Locale: 'en-US' },
    Rows: [row],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ApplicationAccessKey': apiKey,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(`AppSheet Add failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.responseText = text;
    throw err;
  }
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }
  return json;
}
