import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};

export function startServer(port = 8123) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const relative = decodeURIComponent(url.pathname === '/' ? '/render.html' : url.pathname);
    const target = path.resolve(root, `.${relative}`);

    if (!target.startsWith(root)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    try {
      const body = await readFile(target);
      res.writeHead(200, {
        'Content-Type': mime[path.extname(target)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8123);
  startServer(port).then(() => {
    console.log(`Buka http://127.0.0.1:${port}/ di browser`);
  });
}
