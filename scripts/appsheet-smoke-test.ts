/**
 * Quick smoke test: confirms the AppSheet API key + App ID + table name combo works.
 *
 * Usage:
 *   export APPSHEET_KEY=$(cat ~/.appsheet-key)
 *   pnpm tsx scripts/appsheet-smoke-test.ts
 *
 * On success: prints the first row of the "Field Visits" table.
 * On failure: prints HTTP status + AppSheet error body.
 */

const APP_ID = '87bcc0a1-ac3f-4b51-8198-84b8274a5826';
const KEY = process.env.APPSHEET_KEY;
if (!KEY) {
  console.error('Missing APPSHEET_KEY env var. Run: export APPSHEET_KEY=$(cat ~/.appsheet-key)');
  process.exit(1);
}

const TABLES_TO_TRY = ['Field Visits', 'Customers', 'Incident'];

async function probeTable(name: string) {
  const url = `https://www.appsheet.com/api/v2/apps/${APP_ID}/tables/${encodeURIComponent(name)}/Action`;
  const body = {
    Action: 'Find',
    Properties: { Locale: 'en-US', Timezone: 'Mountain Standard Time' },
    Rows: [],
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ApplicationAccessKey: KEY!,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(`\n── Table: "${name}" → HTTP ${res.status} ─────────────────────────`);
  if (res.ok) {
    try {
      const arr = JSON.parse(text);
      const len = Array.isArray(arr) ? arr.length : 0;
      console.log(`  Rows: ${len}`);
      if (arr[0]) {
        const cols = Object.keys(arr[0]);
        console.log(`  Columns (${cols.length}): ${cols.slice(0, 12).join(', ')}${cols.length > 12 ? '...' : ''}`);
        console.log(`  First row sample:`);
        for (const [k, v] of Object.entries(arr[0]).slice(0, 5)) {
          const s = typeof v === 'string' ? v.slice(0, 50) : String(v);
          console.log(`    ${k}: ${s}`);
        }
      }
    } catch (e) {
      console.log(`  ⚠ Response was 200 but not JSON: ${text.slice(0, 200)}`);
    }
  } else {
    console.log(`  ✗ ${text.slice(0, 500)}`);
  }
}

(async () => {
  console.log(`AppSheet API smoke test`);
  console.log(`  App ID: ${APP_ID}`);
  console.log(`  Key length: ${KEY!.length}`);
  for (const t of TABLES_TO_TRY) {
    await probeTable(t);
  }
})();
