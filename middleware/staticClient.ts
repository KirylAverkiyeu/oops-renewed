import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'path';
import fs from 'fs';

const clientDist = path.resolve(process.cwd(), 'dist/client');

export function mountClientApp(app: Hono): void {
  if (!fs.existsSync(clientDist)) {
    console.log(
      '[Server] dist/client not found — run `npm run build:client` for the dashboard UI.'
    );
    app.get('/', (c) =>
      c.text('Oops, Renewed! API is running. Build the client with `npm run build:client`.')
    );
    return;
  }

  console.log(`[Server] Serving static client build from: ${clientDist}`);
  app.use('/*', serveStatic({ root: './dist/client' }));

  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (c) => {
    if (c.req.path.startsWith('/api')) {
      return c.json({ error: 'Not Found' }, 404);
    }

    const indexPath = path.join(clientDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      return c.html(fs.readFileSync(indexPath, 'utf-8'));
    }

    return c.text('Oops, Renewed! UI is missing.', 404);
  });
}
