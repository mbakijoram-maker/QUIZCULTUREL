# Kin Quiz Live

Quiz live multijoueur sur la culture générale congolaise : React + Tailwind CSS (front) et Node.js + Express + Socket.io (serveur).

- **Écran admin / géant** : `https://<votre-domaine>/admin`
- **Joueurs (mobile)** : `https://<votre-domaine>/` (le lien `/?pin=123456` pré-remplit le PIN, pratique pour un QR code)

## Version solo (sans serveur)

Une partie individuelle qui tourne entièrement dans le navigateur, en 4 tours de difficulté croissante : Découverte, Connaisseur, Initié, Sage de Kin (`ROUNDS` dans `questions.js`). Chaque tour tire 10 questions parmi 15, en mélangeant les sujets et les formats : QCM, Vrai/Faux et œuvres à reconnaître en photo. Le pseudo est obligatoire. Des flashcards présentent les règles avant le premier tour. À la fin d'un tour, le joueur voit son badge et le détail de ses réponses, puis passe au tour suivant. On peut quitter un tour, mais il se termine alors : les questions restantes comptent 0 point.

Chaque tour ne se joue qu'une fois, et les tours se débloquent dans l'ordre. Un tour commencé est repris après un rechargement de la page : la question qui était affichée compte alors comme « temps écoulé ».

Les plantes (`public/plants/`) sont des illustrations botaniques du domaine public (rawpixel, CC0), dont l'arrière-plan a été supprimé. Les textures de bois (`public/textures/`) sont des photos Flickr en CC0. Les photos de masques et de statues (`public/masks/`) viennent de l'Open Access du Cleveland Museum of Art (CC0, domaine public). Leur arrière-plan a été supprimé, puis elles ont été converties en WebP. Leurs noms et origines sont dans `src/masks.js`.

- Sur le site complet : `/solo`
- En page HTML autonome : `npm run build:solo` produit `build/kin-quiz-solo.html` (JS, CSS et illustrations intégrés), publiable sur n'importe quel hébergement statique.

## Site en ligne (GitHub Pages)

La version solo est publiée depuis la branche `gh-pages` du dépôt.

Pour redéployer après une modification :

```
npm run build:pages
```

Puis poussez le contenu de `dist-solo/` sur la branche `gh-pages`. Les images y sont des fichiers séparés, ce qui permet au navigateur de les mettre en cache. Pour tester en local exactement comme sur GitHub : `node scripts/preview-pages.mjs`, puis ouvrez http://localhost:4173/QUIZCULTUREL/.

`npm run build:solo` produit quant à lui une page unique tout-en-un (`build/kin-quiz-solo.html`), pratique à partager comme simple fichier, mais plus lourde à charger. GitHub Pages ne sert que des fichiers statiques : la version multijoueur, qui a besoin du serveur Node, doit être hébergée ailleurs (voir « Mise en ligne (Render) »).

## En local

Tapez les commandes une par une dans PowerShell :

```
npm install
npm run dev
```

Puis ouvrez http://localhost:5173/admin. Le fichier `.npmrc` force l'installation des outils de build même si `NODE_ENV=production` est défini sur la machine.

Version production locale : `npm run build` puis `npm start` (port 3001, ou variable `PORT`).

## Mise en ligne (Render, gratuit)

Render accepte les WebSockets dans son offre gratuite, contrairement à Netlify ou Vercel.

1. Publiez ce dossier sur un dépôt GitHub.
2. Sur https://render.com : **New → Blueprint**, choisissez le dépôt. `render.yaml` configure tout (build, démarrage, health check).
3. L'appli est en ligne sur `https://kin-quiz-live.onrender.com` (ou votre domaine personnalisé).

Offre gratuite : le service s'endort après 15 min sans visite et met environ 1 min à se réveiller. Le jour J, ouvrez `/admin` quelques minutes avant. Pour éviter la mise en veille, passez à l'offre payante (environ 7 $/mois).

Alternatives qui marchent aussi : Railway, Fly.io, ou n'importe quel VPS avec Node 18+.

## Lien public temporaire depuis votre PC (test rapide)

Avec [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) installé, et `npm start` lancé dans un autre terminal :

```
cloudflared tunnel --url http://localhost:3001
```

Il affiche une adresse `https://xxxx.trycloudflare.com`, valable tant que le PC et la commande tournent.

## Règles

| Temps de réponse | Points |
|---|---|
| 0 – 5 s | 60 |
| 5 – 10 s | 50 |
| 10 – 15 s | 40 |
| 15 – 20 s | 30 |
| 20 – 25 s | 20 |
| 25 – 30 s | 10 |
| Mauvaise réponse / temps écoulé | 0 |

5 questions tirées au hasard dans `questions.js`, options mélangées à chaque partie. Égalité de score : le joueur le plus rapide (temps cumulé des bonnes réponses) passe devant.
Badge final : **GRAND PRÊTRE DE KIN** à partir de 150 pts (la moitié du max de 300), sinon **YUMA CERTIFIÉ**.

## Structure

```
server.js              Express + Socket.io : parties, timer, score, classement, sert dist/
questions.js           Banque de questions (la 1re option est la bonne réponse)
shared/scoring.js      Barème partagé serveur / client
tailwind.config.js     Palette kin-* (night, bark, caramel, gold, terracotta, cream…), animations
src/App.jsx            Routage /admin ↔ joueur
src/AdminView.jsx      Accueil, lobby (adresse du site + PIN + compteur), question, révélation + classement live, podium
src/PlayerView.jsx     Login → attente → question (timer + points) → résultat → badge final
src/components/        Timer, Leaderboard, AnswerSymbol, briques UI (bois, panneaux, frise kuba)
public/illustrations/  Masque, djembé, badges (SVG)
public/patterns/       Motifs bogolan et kuba (SVG)
```

### Personnaliser

- **Questions** : modifiez `questions.js` (catégorie, texte, 4 options dont la première est juste, anecdote « Le savais-tu ? »).
- **Illustrations PNG** : déposez vos fichiers dans `public/illustrations/` et changez les chemins dans `ILLUSTRATIONS` (`src/components/ui.jsx`).
- **Motifs** : classes `bg-motif-bogolan` et `bg-motif-kuba` disponibles partout ; `.bg-african` pose le motif de fond global.

## Robustesse

- Le temps de réponse est mesuré par le serveur (impossible de tricher avec l'horloge du téléphone) ; la bonne réponse n'est jamais envoyée avant la révélation.
- Les points sont crédités à la révélation, et la question se ferme d'elle-même dès que tous les joueurs connectés ont répondu.
- Les compteurs de l'écran admin sont regroupés (au plus toutes les 250 ms) pour tenir des centaines de réponses simultanées.
- Écran verrouillé, réseau mobile qui saute, page rechargée : joueurs et admin reprennent automatiquement la partie (jeton stocké en localStorage).
- L'état est en mémoire : redémarrer le serveur efface les parties en cours. Pour un seul stand, un seul processus Node suffit largement.
