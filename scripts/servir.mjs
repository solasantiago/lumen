#!/usr/bin/env node
// Servidor estático para ver la web en local: node scripts/servir.mjs [puerto]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { RAIZ } from './datos.mjs';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.md': 'text/markdown; charset=utf-8',
};
const puerto = Number(process.argv[2] ?? 8000);

createServer(async (req, res) => {
  const ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const archivo = join(RAIZ, normalize(ruta).replace(/^([/\\])+/, ''), ruta.endsWith('/') ? 'index.html' : '');
  if (!archivo.startsWith(RAIZ)) return res.writeHead(403).end();
  try {
    const cuerpo = await readFile(archivo);
    res.writeHead(200, { 'Content-Type': TIPOS[extname(archivo)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(cuerpo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado');
  }
}).listen(puerto, () => console.log(`Lumen en http://localhost:${puerto}`));
