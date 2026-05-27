// Deploy entrypoint shim — re-exports the real Hono app from index.tsx (same folder).
import app from "./index.tsx";
Deno.serve(app.fetch);
