// Aperçu local du site statique, servi sous /QUIZCULTUREL/ comme sur GitHub Pages.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT) || 4173;
const app = express();
app.use('/QUIZCULTUREL', express.static(path.join(root, 'dist-solo')));
app.listen(port, () => console.log(`Aperçu : http://localhost:${port}/QUIZCULTUREL/`));
