/**
 * Resolve controlled value option lists for the modal.
 *
 * Today these are fed by environment variables that contain JSON arrays of
 * strings (or {text, value} objects). When XC moves to AppSheet/Supabase
 * lookup tables, swap the body of `loadOptions` to call those backends —
 * the rest of the bridge stays unchanged.
 */

const ENV_KEYS = {
  customer: 'CUSTOMER_OPTIONS_JSON',
  customerDistrict: 'CUSTOMER_DISTRICT_OPTIONS_JSON',
  operatingCompany: 'OPERATING_COMPANY_OPTIONS_JSON',
  productLine: 'PRODUCT_LINE_OPTIONS_JSON',
};

const SLACK_STATIC_SELECT_MAX = 100;

function parseEnvList(envKey, env) {
  const raw = env[envKey];
  if (!raw) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`[slack-bridge] ${envKey} is not valid JSON; falling back to empty list`);
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry) => {
      if (typeof entry === 'string') return { text: entry, value: entry };
      if (entry && typeof entry.text === 'string') {
        return { text: entry.text, value: entry.value ?? entry.text };
      }
      return null;
    })
    .filter(Boolean);
}

export function loadOptions(field, env = process.env) {
  const envKey = ENV_KEYS[field];
  if (!envKey) return [];
  return parseEnvList(envKey, env);
}

export function toSlackOptions(list) {
  return list.slice(0, SLACK_STATIC_SELECT_MAX).map((o) => ({
    text: { type: 'plain_text', text: String(o.text).slice(0, 75) },
    value: String(o.value).slice(0, 75),
  }));
}

export { SLACK_STATIC_SELECT_MAX };
