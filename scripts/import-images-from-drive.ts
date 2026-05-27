#!/usr/bin/env tsx
/**
 * Import images from rclone-downloaded AppSheet backup folder into Supabase.
 *
 * Source: local directory (default: .drive-backup/) populated by:
 *   rclone copy "gdrive:FST Backup05262026" ./.drive-backup --transfers 16 --progress
 *
 * Filename patterns recognized:
 *   <22-char-row_id>.Image1.<HHMMSS>.jpg   -> parent_table=incidents,
 *                                            parent_row_id=<row_id>,
 *                                            field_name='Image1'
 *   <22-char-row_id>.Image2.<HHMMSS>.jpg   -> parent_table=incidents,
 *                                            parent_row_id=<row_id>,
 *                                            field_name='Image2'
 *   <22-char-images_row_id>.Pictures.<HHMMSS>.jpg
 *                                          -> look up images_legacy.event_id by row_id
 *                                          -> parent_table=incidents,
 *                                             parent_row_id=<event_id>,
 *                                             field_name='Pictures'
 *
 * Anything not matching (e.g. "Copy of <hex>.Pictures.*.jpg" legacy Sheets-era
 * files with no row_id mapping) is logged to a skip report and ignored.
 *
 * For each kept file:
 *   1. Read bytes from disk.
 *   2. Upload to Supabase Storage bucket `make-64775d98-incident-images` at
 *      `incidents/<parent_row_id>/<uuid>.jpg`.
 *   3. Insert row into public.images with:
 *        parent_table, parent_row_id, field_name,
 *        storage_path, source='appsheet-backfill',
 *        appsheet_row_id (the row_id parsed from the filename),
 *        appsheet_path (the bare filename) -- UNIQUE, makes reruns idempotent,
 *        mime_type='image/jpeg', file_size_bytes.
 *
 * Usage:
 *   pnpm tsx scripts/import-images-from-drive.ts            # real run
 *   pnpm tsx scripts/import-images-from-drive.ts --dry-run  # report only
 *   pnpm tsx scripts/import-images-from-drive.ts --limit=10 # first 10 files
 *   pnpm tsx scripts/import-images-from-drive.ts --dir=/path
 */
import { createClient } from "@supabase/supabase-js";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const args = new Map<string, string>();
for (const a of process.argv.slice(2)) {
  const [k, v] = a.startsWith("--") ? a.slice(2).split("=") : [a, ""];
  args.set(k, v ?? "true");
}
const DRY_RUN = args.has("dry-run");
const LIMIT = args.get("limit") ? parseInt(args.get("limit")!, 10) : Infinity;
const DIR =
  args.get("dir") ||
  path.resolve(process.cwd(), ".drive-backup");

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY env vars");
  process.exit(1);
}

const BUCKET = "make-64775d98-incident-images";
const ROW_ID_RE = /^([A-Za-z0-9_\-]{22})\.(Image1|Image2|Pictures)\.(\d{6})\.(jpe?g|png|webp|gif|heic)$/i;

interface ParsedFile {
  filename: string;
  full_path: string;
  size: number;
  parsed_row_id: string;       // the 22-char prefix
  field_name: "Image1" | "Image2" | "Pictures";
  timestamp: string;           // HHMMSS
  ext: string;
}

interface PlannedImport extends ParsedFile {
  parent_table: "incidents";
  parent_row_id: string;       // resolved (= parsed_row_id for Image1/2, or event_id for Pictures)
  mime_type: string;
}

const extToMime = (ext: string): string => {
  const e = ext.toLowerCase();
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "webp") return "image/webp";
  if (e === "gif") return "image/gif";
  if (e === "heic") return "image/heic";
  return "application/octet-stream";
};

async function main() {
  console.log("=".repeat(60));
  console.log("AppSheet Drive Backfill -> Supabase images");
  console.log("=".repeat(60));
  console.log(`Source dir: ${DIR}`);
  console.log(`Bucket:     ${BUCKET}`);
  console.log(`Mode:       ${DRY_RUN ? "DRY RUN (no writes)" : "REAL RUN"}`);
  if (LIMIT !== Infinity) console.log(`Limit:      ${LIMIT}`);
  console.log("");

  // 1. Verify source dir exists
  try {
    const s = await stat(DIR);
    if (!s.isDirectory()) throw new Error("not a directory");
  } catch (e) {
    console.error(`Source dir not found: ${DIR}`);
    console.error("Run rclone copy first. See script header for command.");
    process.exit(1);
  }

  // 2. Enumerate + parse filenames
  const entries = await readdir(DIR);
  const parsed: ParsedFile[] = [];
  const skipped: Array<{ filename: string; reason: string }> = [];

  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const m = name.match(ROW_ID_RE);
    if (!m) {
      skipped.push({ filename: name, reason: "filename does not match row_id pattern" });
      continue;
    }
    const full = path.join(DIR, name);
    const st = await stat(full);
    if (!st.isFile()) continue;
    parsed.push({
      filename: name,
      full_path: full,
      size: st.size,
      parsed_row_id: m[1],
      field_name: m[2] as ParsedFile["field_name"],
      timestamp: m[3],
      ext: m[4].toLowerCase(),
    });
  }

  console.log(`Found ${entries.length} entries in source dir`);
  console.log(`  - Parsable:  ${parsed.length}`);
  console.log(`  - Skipped:   ${skipped.length}  (legacy / non-matching)`);
  const byField: Record<string, number> = {};
  for (const p of parsed) byField[p.field_name] = (byField[p.field_name] ?? 0) + 1;
  console.log(`  - By field:  ${JSON.stringify(byField)}`);
  console.log("");

  // 3. Connect to Supabase
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // 4. Resolve Pictures -> incident via images_legacy
  const pictureRowIds = parsed
    .filter(p => p.field_name === "Pictures")
    .map(p => p.parsed_row_id);
  const legacyMap = new Map<string, string>();
  if (pictureRowIds.length > 0) {
    console.log(`Resolving ${pictureRowIds.length} Pictures rows -> images_legacy.event_id ...`);
    // chunked in case there are many
    const chunkSize = 500;
    for (let i = 0; i < pictureRowIds.length; i += chunkSize) {
      const slice = pictureRowIds.slice(i, i + chunkSize);
      const { data, error } = await sb
        .from("images_legacy")
        .select("row_id,event_id")
        .in("row_id", slice);
      if (error) {
        console.error("images_legacy lookup failed:", error);
        process.exit(1);
      }
      for (const r of data ?? []) {
        if (r.event_id) legacyMap.set(r.row_id, r.event_id);
      }
    }
    console.log(`  Resolved ${legacyMap.size}/${pictureRowIds.length}`);
  }

  // 5. Build planned imports + skip-list
  const planned: PlannedImport[] = [];
  for (const p of parsed) {
    let parent_row_id: string | null = null;
    if (p.field_name === "Image1" || p.field_name === "Image2") {
      parent_row_id = p.parsed_row_id;
    } else if (p.field_name === "Pictures") {
      parent_row_id = legacyMap.get(p.parsed_row_id) ?? null;
      if (!parent_row_id) {
        skipped.push({
          filename: p.filename,
          reason: `Pictures file: no images_legacy.event_id for row_id=${p.parsed_row_id}`,
        });
        continue;
      }
    }
    if (!parent_row_id) continue;
    planned.push({
      ...p,
      parent_table: "incidents",
      parent_row_id,
      mime_type: extToMime(p.ext),
    });
  }

  console.log(`Planned imports: ${planned.length}`);
  console.log(`Final skip list: ${skipped.length}`);
  console.log("");

  // 6. Find already-imported (appsheet_path UNIQUE)
  console.log("Checking for existing rows in `images` table ...");
  const allPaths = planned.map(p => p.filename);
  const existing = new Set<string>();
  const chunkSize = 500;
  for (let i = 0; i < allPaths.length; i += chunkSize) {
    const slice = allPaths.slice(i, i + chunkSize);
    const { data, error } = await sb
      .from("images")
      .select("appsheet_path")
      .in("appsheet_path", slice);
    if (error) {
      console.error("existing-rows check failed:", error);
      process.exit(1);
    }
    for (const r of data ?? []) {
      if (r.appsheet_path) existing.add(r.appsheet_path);
    }
  }
  console.log(`  ${existing.size} already imported, will skip`);
  console.log("");

  // 7. Execute (or dry-run print)
  const todo = planned
    .filter(p => !existing.has(p.filename))
    .slice(0, LIMIT);
  console.log(`Will process ${todo.length} files\n`);

  if (DRY_RUN) {
    console.log("--- DRY RUN: first 10 ---");
    for (const t of todo.slice(0, 10)) {
      console.log(
        `  ${t.field_name.padEnd(8)}  parent=${t.parent_row_id}  file=${t.filename}  (${t.size}B)`
      );
    }
    if (skipped.length > 0) {
      console.log(`\n--- SKIPPED (first 10) ---`);
      for (const s of skipped.slice(0, 10)) {
        console.log(`  ${s.reason}  -- ${s.filename}`);
      }
    }
    console.log("\nDry-run complete. Re-run without --dry-run to import.");
    return;
  }

  let okCount = 0;
  let errCount = 0;
  const errors: Array<{ filename: string; phase: string; message: string }> = [];

  for (let i = 0; i < todo.length; i++) {
    const t = todo[i];
    const progress = `[${(i + 1).toString().padStart(4)}/${todo.length}]`;
    try {
      const bytes = await readFile(t.full_path);
      const uuid = crypto.randomUUID();
      const storage_path = `incidents/${t.parent_row_id}/${uuid}.${t.ext}`;

      const up = await sb.storage.from(BUCKET).upload(storage_path, bytes, {
        contentType: t.mime_type,
        upsert: false,
      });
      if (up.error) {
        throw new Error(`storage.upload: ${up.error.message}`);
      }

      const ins = await sb.from("images").insert({
        parent_table: t.parent_table,
        parent_row_id: t.parent_row_id,
        field_name: t.field_name,
        storage_path,
        source: "appsheet-backfill",
        appsheet_row_id: t.parsed_row_id,
        appsheet_path: t.filename,
        mime_type: t.mime_type,
        file_size_bytes: t.size,
      });
      if (ins.error) {
        // Roll back storage upload to keep things tidy
        await sb.storage.from(BUCKET).remove([storage_path]).catch(() => {});
        throw new Error(`db.insert: ${ins.error.message}`);
      }

      okCount++;
      if (okCount % 50 === 0 || okCount <= 5) {
        console.log(`${progress} OK   ${t.field_name}  ${t.filename}`);
      }
    } catch (e: any) {
      errCount++;
      errors.push({
        filename: t.filename,
        phase: e.message?.split(":")[0] ?? "unknown",
        message: e.message ?? String(e),
      });
      console.error(`${progress} ERR  ${t.filename}  ${e.message}`);
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(`Done.  OK: ${okCount}   ERR: ${errCount}   SKIPPED (pre-flight): ${skipped.length}`);
  console.log("=".repeat(60));

  if (errors.length > 0) {
    console.log("\nFirst 20 errors:");
    for (const e of errors.slice(0, 20)) {
      console.log(`  [${e.phase}] ${e.filename}: ${e.message}`);
    }
  }
  if (skipped.length > 0) {
    console.log("\nFirst 20 pre-flight skips:");
    for (const s of skipped.slice(0, 20)) {
      console.log(`  ${s.reason}  -- ${s.filename}`);
    }
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
