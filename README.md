# HyperVision AI

A mobile-first holographic AI assistant starter project with separate frontend, Cloudflare Worker backend, optional Supabase SQL, PWA files, and the supplied app icon.

## Folder guide

- `frontend/index.html` — page structure
- `frontend/style.css` — HyperVision holographic styling
- `frontend/script.js` — chat, speech, model list, Worker URL settings
- `frontend/config.js` — public frontend configuration only
- `frontend/manifest.json`, `frontend/sw.js` — installable PWA and static offline cache
- `frontend/assets/icon.png` — supplied app icon
- `worker/src/index.js` — Gemini API proxy; keeps API key on server
- `worker/wrangler.toml`, `worker/package.json` — Worker deployment files
- `supabase/schema.sql` — optional secure chat-history table
- `supabase/config.js` — optional public Supabase settings template (not wired into initial UI)

## Important limits

- The frontend is a UI and browser-based assistant. It cannot freely control all Android apps/settings. Advanced phone actions require a separate native Android companion and user-granted permissions.
- Speech recognition support depends on the browser and device. Speech output uses browser text-to-speech and is not an exact voice clone.
- The Worker lists Gemini models available to the configured API key that support `generateContent`. Availability and quotas vary. This does not mean every Gemini model or modality is supported by this text-chat UI.
- The Supabase schema is optional and chat history is not saved to Supabase by this starter frontend yet.
- CORS is permissive for easy first testing. Before public production use, restrict `Access-Control-Allow-Origin` in `worker/src/index.js` to your actual frontend origin and add rate limiting/abuse protection.

## Manual setup (no automatic account linking)

### 1. Test the frontend

Serve the `frontend` directory with any static HTTPS host. Opening `index.html` directly from local file storage may disable some browser features. The Worker is deployed separately.

### 2. Deploy the Worker manually

Cloudflare Workers normally deploys using Wrangler from a terminal. On an Android-only setup, you can use the Cloudflare dashboard's Worker editor and paste `worker/src/index.js` as the Worker script, or use a browser-based development environment. Configure the Worker entry script to use module syntax.

Add a Worker secret named `GEMINI_API_KEY` using Cloudflare's Secrets settings. Get the key from Google AI Studio. Never paste it into `frontend/config.js`, HTML, JavaScript, GitHub, or chat messages.

After deployment, test:

- `https://YOUR-WORKER-URL/api/health`
- `https://YOUR-WORKER-URL/api/models`

### 3. Point the frontend at your Worker

Either set `WORKER_URL` in `frontend/config.js` before hosting, or open the app and enter the HTTPS Worker URL in Connection Settings. The UI saves it in that browser's local storage.

### 4. Optional Supabase setup

Create a Supabase project manually. Run `supabase/schema.sql` in its SQL Editor if you want the chat-history table. The initial frontend does not yet store messages in Supabase. Do not put a service-role key in any frontend file.

## Security checklist

- Keep Gemini API key in Worker Secrets.
- Never commit passwords or private keys.
- Keep Supabase RLS enabled.
- Add authentication before saving user-specific records.
- Restrict Worker CORS and add rate limits before sharing publicly.
