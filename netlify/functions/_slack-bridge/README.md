# Slack ↔ AppSheet Bridge

Isolated Netlify Functions service that turns a Slack reaction on a public channel message into a new row in the AppSheet `Incident` table, via a real Slack modal.

The service is deliberately self-contained under `netlify/functions/` so the XC frontend is unaffected, and so we can later swap the AppSheet client for an XC/Supabase backend without touching the Slack side.

## Architecture

```
Slack public channel
   ⇣ reaction_added (emoji: XC)
slack-events  ──► chat.postEphemeral (button "Fill XC Incident") to the reactor
                    ⇣ user clicks
slack-interactivity  ──► views.open (modal)
                    ⇣ user submits
slack-interactivity (view_submission)  ──► AppSheet /Action (Add)
```

Why the ephemeral-button hop? Slack does **not** include a `trigger_id` on `reaction_added`, and `trigger_id` is required to open a modal. The ephemeral button is the supported way to "translate" a reaction into a trigger_id.

## Files

| Path | Purpose |
| --- | --- |
| `netlify/functions/slack-events.js` | POST endpoint for the Slack Events API. Verifies signature, handles `url_verification`, filters for `reaction_added` with the configured emoji, posts the opener ephemeral. |
| `netlify/functions/slack-interactivity.js` | POST endpoint for Slack Interactivity. Handles the button (opens modal) and `view_submission` (writes to AppSheet). |
| `netlify/functions/slack-bridge-health.js` | GET endpoint reporting which env vars are configured (booleans only — never values). |
| `netlify/functions/_slack-bridge/` | Shared modules (signature verification, Slack client, modal view, mapping, AppSheet client, options). Files prefixed with `_` are not deployed as functions by Netlify. |

## Environment variables (set in Netlify → Site → Environment)

| Variable | Required | Notes |
| --- | --- | --- |
| `SLACK_APP_ID` | recommended | Defensive check; set to `A076FHTFEUR`. |
| `SLACK_BOT_TOKEN` | **yes** | `xoxb-…`. Must NOT be committed. |
| `SLACK_SIGNING_SECRET` | **yes** | Used to verify every incoming Slack request. |
| `XC_EMOJI_NAME` | recommended | Default `XC`. Compared case-insensitively. |
| `APPSHEET_APP_ID` | **yes** | `sKAcIp2oIA4qaNl0GjSpW6`. |
| `APPSHEET_API_KEY` | **yes** | AppSheet Application Access Key. |
| `APPSHEET_TABLE_NAME` | recommended | Default `Incident`. |
| `CUSTOMER_OPTIONS_JSON` | optional | JSON array of strings or `{text,value}` objects. |
| `CUSTOMER_DISTRICT_OPTIONS_JSON` | optional | Same shape. |
| `OPERATING_COMPANY_OPTIONS_JSON` | optional | Same shape. |
| `PRODUCT_LINE_OPTIONS_JSON` | optional | Same shape. |

Example for an options JSON env var:

```json
["Acme Co","Globex","Initech"]
```

or

```json
[{"text":"Acme Co (US)","value":"acme-us"},{"text":"Globex","value":"globex"}]
```

If an options env var is empty/missing, the corresponding modal field renders as a free-text input instead of a dropdown. This is intentional so the bridge stays usable while option sources are still being finalized.

> **TODO:** Replace env-driven options with live lookups against AppSheet (or eventually Supabase XC tables). Only `options.js` needs to change — `loadOptions(field, env)` is the single seam.

## Slack app configuration

App: **A076FHTFEUR**.

### Bot scopes (OAuth & Permissions → Bot Token Scopes)
- `reactions:read`
- `channels:history`
- `channels:read`
- `chat:write`
- `users:read`

### Event subscriptions (Event Subscriptions)
- Request URL: `https://<your-netlify-domain>/.netlify/functions/slack-events`
- Subscribe to bot events: `reaction_added`

### Interactivity & shortcuts (Interactivity & Shortcuts)
- Interactivity: **on**
- Request URL: `https://<your-netlify-domain>/.netlify/functions/slack-interactivity`

(Netlify redirect rules also expose `/slack/events`, `/slack/interactivity`, `/slack/health` if you prefer cleaner URLs — both forms work.)

## AppSheet column mapping

The bridge writes to the `Incident` table using exactly these column names:

| Modal field | AppSheet column |
| --- | --- |
| Customer | `Customer` |
| Customer District | `Customer District` |
| Operating Company | `Operating Company` |
| Product Line | `XC Products Gun System` |
| Notes | `Notes` |
| (Slack reactor, resolved name) | `XC Representative` |
| (auto) message permalink | `Slack URL` |
| (auto) message ts | `Slack TS` |
| (auto) channel id | `Slack Channel` |

## Tests

```
node --test netlify/functions/_slack-bridge/__tests__/slackBridge.test.js
```

(Also picked up by `pnpm test:slack-bridge`.)

The test suite covers:
- Slack signature verification (valid / wrong signature / wrong secret / stale timestamp / body tampering)
- Emoji matching (case, skin-tone suffix, empty)
- `view_submission → AppSheet row` mapping for both `static_select` and `plain_text_input` fallback
- `validateRequired` flags missing required fields

## Security

- The previously exposed Slack bot token must be **rotated** before this is wired up. Never commit the new token; set it only in Netlify environment.
- Every Slack request is verified via HMAC-SHA256 against `SLACK_SIGNING_SECRET` with a 5-minute timestamp window — unsigned/forged requests are rejected with 401.
- `SLACK_APP_ID` is checked defensively to drop traffic from other Slack apps that may share the URL.

## Known assumptions / TODOs

- The bridge assumes Netlify Functions v1-style handler signature (`event.httpMethod`, `event.headers`, `event.body`). If the repo later migrates to the v2 (Web Fetch API) signature, only the four `handler` wrappers need updating.
- Public-channel filtering relies on `conversations.info`. `mpim`/`im`/private channels are dropped; the bridge does **not** currently filter shared channels separately.
- No persistence between events and submissions — `private_metadata` on the modal carries channel/ts/permalink/reactor through the round-trip.
- Options lists are env-driven for now. Move to a live source as soon as the canonical lookup tables are finalized.
