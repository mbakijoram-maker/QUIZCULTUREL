// Assemble la version solo en UNE page HTML autonome (JS, CSS et illustrations
// intégrés), publiable telle quelle n'importe où, sans serveur.
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const assetsDir = path.join(root, 'dist-solo', 'assets');
const files = readdirSync(assetsDir);
const read = (ext) => {
  const name = files.find((f) => f.endsWith(ext));
  if (!name) throw new Error(`Aucun fichier ${ext} dans dist-solo/assets`);
  return readFileSync(path.join(assetsDir, name), 'utf8');
};

// Les images de public/ (illustrations, motifs, photos de masques) deviennent des data: URI.
const MIME = { svg: 'image/svg+xml', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' };
const dataUri = (dir, name) =>
  `data:${MIME[name.split('.').pop()]};base64,${readFileSync(path.join(root, 'public', dir, name)).toString('base64')}`;
const inlineSvgs = (code) =>
  code.replace(/(?:\.{0,2}\/)?(illustrations|patterns|masks|plants|textures)\/([\w-]+\.(?:svg|webp|png|jpg))/g, (_m, dir, name) =>
    dataUri(dir, name),
  );

const css = inlineSvgs(read('.css'));
const js = inlineSvgs(read('.js')).replace(/<\/script/gi, '<\\/script');

const html = `<title>Kin Quiz</title>
<meta name="theme-color" content="#2B1704">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Kenia&family=Manrope:wght@400..800&display=swap">
<style>:root{color-scheme:dark}html,body{background:#2B1704}${css}</style>
<div id="root"></div>
<script type="module">${js}</script>
`;

mkdirSync(path.join(root, 'build'), { recursive: true });
const out = path.join(root, 'build', 'kin-quiz-solo.html');
writeFileSync(out, html);
console.log(`Page solo autonome : ${path.relative(root, out)} (${(html.length / 1024).toFixed(0)} Ko)`);

