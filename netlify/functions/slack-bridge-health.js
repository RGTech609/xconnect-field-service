export const handler = async (req) => {
  if (req.httpMethod !== 'GET' && req.httpMethod !== 'HEAD') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  const env = process.env;
  const status = {
    ok: true,
    service: 'slack-bridge',
    config: {
      slackAppIdConfigured: Boolean(env.SLACK_APP_ID),
      slackBotTokenConfigured: Boolean(env.SLACK_BOT_TOKEN),
      slackSigningSecretConfigured: Boolean(env.SLACK_SIGNING_SECRET),
      xcEmojiName: env.XC_EMOJI_NAME || 'XC',
      appsheetAppIdConfigured: Boolean(env.APPSHEET_APP_ID),
      appsheetApiKeyConfigured: Boolean(env.APPSHEET_API_KEY),
      appsheetTableName: env.APPSHEET_TABLE_NAME || 'Incident',
    },
  };
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(status),
  };
};
