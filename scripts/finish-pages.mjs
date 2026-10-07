// Prépare dist-solo/ pour un hébergement statique (GitHub Pages) :
// solo.html devient index.html, et .nojekyll désactive le traitement Jekyll.
import { renameSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = path.join(path.dirname(path.dirname(fileURLToPath(import.meta.url))), 'dist-solo');
if (existsSync(path.join(dist, 'solo.html'))) renameSync(path.join(dist, 'solo.html'), path.join(dist, 'index.html'));
writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('Site statique prêt : dist-solo/ (index.html + assets)');
