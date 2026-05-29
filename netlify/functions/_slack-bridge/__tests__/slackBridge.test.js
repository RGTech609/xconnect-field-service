import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifySlackSignature } from '../verifySlackSignature.js';
import { mapViewSubmissionToAppSheetRow, validateRequired } from '../mapSubmission.js';
import { BLOCK_IDS, ACTION_IDS } from '../modalView.js';
import { _internal } from '../../slack-events.js';

// --- verifySlackSignature ---
{
  const signingSecret = 'shhh';
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const rawBody = '{"type":"url_verification","challenge":"abc"}';
  const sig = 'v0=' + crypto.createHmac('sha256', signingSecret)
    .update(`v0:${timestamp}:${rawBody}`).digest('hex');

  assert.equal(verifySlackSignature({ signingSecret, timestamp, signature: sig, rawBody }), true);
  assert.equal(verifySlackSignature({ signingSecret, timestamp, signature: sig + 'x', rawBody }), false);
  assert.equal(verifySlackSignature({ signingSecret: 'wrong', timestamp, signature: sig, rawBody }), false);
  assert.equal(verifySlackSignature({ signingSecret, timestamp: '1', signature: sig, rawBody }), false);
  assert.equal(verifySlackSignature({ signingSecret, timestamp, signature: sig, rawBody: rawBody + 'x' }), false);
}

// --- emojiMatches ---
{
  assert.equal(_internal.emojiMatches('XC', 'XC'), true);
  assert.equal(_internal.emojiMatches('xc', 'XC'), true);
  assert.equal(_internal.emojiMatches('XC::skin-tone-2', 'XC'), true);
  assert.equal(_internal.emojiMatches('thumbsup', 'XC'), false);
  assert.equal(_internal.emojiMatches('', 'XC'), false);
  assert.equal(_internal.emojiMatches('XC', ''), false);
}

// --- mapViewSubmissionToAppSheetRow ---
{
  const state = {
    values: {
      [BLOCK_IDS.customer]: { [ACTION_IDS.customer]: { selected_option: { value: 'Acme Co' } } },
      [BLOCK_IDS.customerDistrict]: { [ACTION_IDS.customerDistrict]: { selected_option: { value: 'North' } } },
      [BLOCK_IDS.operatingCompany]: { [ACTION_IDS.operatingCompany]: { selected_option: { value: 'OpCo A' } } },
      [BLOCK_IDS.productLine]: { [ACTION_IDS.productLine]: { selected_option: { value: 'Gun 9000' } } },
      [BLOCK_IDS.notes]: { [ACTION_IDS.notes]: { value: 'something broken' } },
    },
  };
  const row = mapViewSubmissionToAppSheetRow({
    state,
    slackContext: {
      channel: 'C123',
      ts: '1700000000.000100',
      permalink: 'https://slack.example/archives/C123/p1700000000000100',
      createdBy: 'Alice',
    },
  });
  assert.equal(row['Customer'], 'Acme Co');
  assert.equal(row['Customer District'], 'North');
  assert.equal(row['Operating Company'], 'OpCo A');
  assert.equal(row['XC Products Gun System'], 'Gun 9000');
  assert.equal(row['Notes'], 'something broken');
  assert.equal(row['XC Representative'], 'Alice');
  assert.equal(row['Slack URL'], 'https://slack.example/archives/C123/p1700000000000100');
  assert.equal(row['Slack TS'], '1700000000.000100');
  assert.equal(row['Slack Channel'], 'C123');
  assert.deepEqual(validateRequired(row), []);
}

// --- validateRequired surfaces missing fields ---
{
  const row = {
    'Customer': '',
    'Customer District': '',
    'Operating Company': 'OpCo',
    'XC Products Gun System': 'Gun',
    'Notes': '',
    'XC Representative': '',
    'Slack URL': '',
    'Slack TS': '',
    'Slack Channel': '',
  };
  assert.deepEqual(validateRequired(row), ['Customer', 'Customer District']);
}

// --- plain_text_input fallback in mapping (when no static_select options exist) ---
{
  const state = {
    values: {
      [BLOCK_IDS.customer]: { [ACTION_IDS.customer]: { value: 'Typed Customer' } },
      [BLOCK_IDS.customerDistrict]: { [ACTION_IDS.customerDistrict]: { value: 'Typed District' } },
      [BLOCK_IDS.operatingCompany]: { [ACTION_IDS.operatingCompany]: { value: 'Typed OpCo' } },
      [BLOCK_IDS.productLine]: { [ACTION_IDS.productLine]: { value: 'Typed Line' } },
      [BLOCK_IDS.notes]: { [ACTION_IDS.notes]: { value: '' } },
    },
  };
  const row = mapViewSubmissionToAppSheetRow({ state, slackContext: {} });
  assert.equal(row['Customer'], 'Typed Customer');
  assert.equal(row['XC Products Gun System'], 'Typed Line');
}

console.log('slack-bridge tests passed');
