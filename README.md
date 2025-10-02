# BulBulBlog

A realtime, frosted-glass themed blog app built with React + Vite on the client and Express on the server. Supports live updates via Server-Sent Events (SSE), image uploads, and simple in-memory storage out of the box.

## Features

- Realtime updates (SSE) for post create/update/delete/like
- In-memory storage for quick start (no DB required)
- Image uploads with validation (JPEG/PNG/WebP) saved to `uploads/`
- Modern UI: React 18, Tailwind utilities, shadcn/ui components, Wouter routing
- Strong frosted-glass design on the blog page
- Like and auto-view counting with client-side safeguards

## Tech stack

- Client: React 18, Vite, TanStack Query, Wouter, Tailwind, Radix UI/shadcn
- Server: Express, Multer for uploads, SSE for realtime
- Types & schema: Drizzle (for types/migrations only), Zod

## Requirements

- Node.js 18+ (recommended)
- npm (or pnpm/yarn)

## Getting started (development)

1. Install dependencies

```powershell
npm install
```

2. Start the server in dev mode (Windows PowerShell)

```powershell
# Easiest: run TS entry directly
npx tsx server/index.ts
```

This starts both the API and the client (via Vite in dev) on the same port. By default it listens on `127.0.0.1:5000` or the value of `PORT` if set.

Optional: If you prefer using package scripts that set NODE_ENV, PowerShell syntax is:

```powershell
$env:NODE_ENV = "development"; npx tsx server/index.ts
```

3. Open the app

- http://127.0.0.1:5000/

## Production build & run

1. Build client and bundle server

```powershell
npm run build
```

This produces the client in `dist/public` and bundles the server to `dist/index.js`.

2. Run the server (Windows PowerShell)

```powershell
$env:NODE_ENV = "production"; node dist/index.js
```

Optionally set a custom port:

```powershell
$env:PORT = "8080"; node dist/index.js
```

## Storage & uploads

- By default, posts are stored in-memory (no database). Restarting the server clears posts.
- Uploaded images are stored on disk under `uploads/` and are served from `/uploads/...`.
- The server ensures the `uploads/` directory exists on startup.

If you want to use a database, the schema is defined in `shared/schema.ts` (Drizzle). Migrations require `DATABASE_URL` to be set; this is not required to run the app in-memory.

## API overview

Base URL: `http://127.0.0.1:5000`

- GET `/api/posts`
  - List all posts (most recent first)
- GET `/api/posts/:id`
  - Get a single post
- POST `/api/posts` (multipart/form-data)
  - Fields: `title` (string), `content` (string), `author` (string), `published` (boolean optional), `image` (file: jpeg/png/webp optional)
  - Response: created post
- PUT `/api/posts/:id` (multipart/form-data)
  - Same fields as create; if a new `image` is provided, the old image is deleted
- DELETE `/api/posts/:id`
  - Deletes the post and its image (if any)
- POST `/api/posts/:id/view`
  - Increments view count
- POST `/api/posts/:id/like`
  - Increments like count (simple toggle-like behavior on server currently adds 1)
- GET `/api/stats`
  - Returns `{ totalPosts, totalViews, totalLikes }`
- GET `/api/events`
  - Server-Sent Events stream for realtime updates

### Realtime events

SSE messages are JSON strings with `{ type, data }`, for example:

```json
{"type":"post_created","data":{ /* post */ }}
{"type":"post_updated","data":{ /* post */ }}
{"type":"post_deleted","data":{"id":"..."}}
{"type":"post_liked","data":{ /* post */ }}
```

## Project structure

```
BulBulBlog/
  client/              # Vite React app (root for client build)
    src/
      pages/public/blog.tsx   # Public blog page (frosted UI)
  server/
    index.ts           # Express bootstrap & Vite dev integration
    routes.ts          # API routes & SSE
    storage.ts         # In-memory storage + file uploads
  shared/
    schema.ts          # Drizzle schema & Zod insert schema
  uploads/             # Uploaded images (created automatically)
  vite.config.ts       # Vite configuration (client root = client/)
  package.json         # Scripts & deps
```

## Scripts (npm)

- `npm run dev` — Starts server with tsx (POSIX style env var). On Windows, prefer `npx tsx server/index.ts`.
- `npm run build` — Builds client and bundles server to `dist/`.
- `npm start` — Runs `node dist/index.js` with `NODE_ENV=production` (POSIX style). On Windows, use the PowerShell command shown above.
- `npm run check` — Type-check with `tsc`.
- `npm run db:push` — Drizzle push (requires `DATABASE_URL`). Not needed for in-memory storage.

## Configuration

Environment variables:

- `PORT` — Port to listen on (default `5000`).
- `NODE_ENV` — `development`/`production` (affects dev vs static serving).
- `DATABASE_URL` — Required only for Drizzle migrations (`npm run db:push`). Not needed to run the in-memory app.

## Troubleshooting

- Windows env vars in scripts: The package scripts use POSIX env var syntax. In PowerShell, use `$env:NAME = "value"; <command>` as shown above, or run `npx tsx server/index.ts` for dev.
- Port already in use: Change the port via `$env:PORT = "5001"; ...`.
- Images not appearing: Ensure the server process has write access to `uploads/`. The server serves images from `/uploads/...`.
- Empty posts after restart: The default storage is in-memory; posts are not persisted across restarts.

## License

MIT
