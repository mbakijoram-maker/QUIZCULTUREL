// Feuilles de palmier et plantes tropicales au premier plan.
// Illustrations botaniques CC0 (rawpixel, domaine public), arrière-plan supprimé.

const PLANT = {
  palm: '/plants/palm-botanical.webp',
  monstera: '/plants/monstera.webp',
  fronds: '/plants/fronds-fern.webp',
  ravenala: '/plants/ravenala.webp',
  fern: '/plants/fern-leaf.webp',
  banana: '/plants/banana.webp',
  elephantEar: '/plants/elephant-ear.webp',
};

// Sur les bords de l'écran (fixes, au-dessus du contenu, sans bloquer les clics).
const EDGE_PLANTS = [
  { src: PLANT.palm, delay: '0s', style: { left: '-6.5rem', top: '4.5rem', width: 'clamp(7rem, 15vw, 15rem)', transform: 'rotate(-30deg)' } },
  { src: PLANT.monstera, delay: '-2s', style: { right: '-5rem', top: '3.5rem', width: 'clamp(7rem, 16vw, 16rem)', transform: 'rotate(22deg)' } },
  { src: PLANT.fronds, delay: '-4s', style: { left: '-4rem', bottom: '-4rem', width: 'clamp(7rem, 15vw, 14rem)', transform: 'rotate(30deg)' } },
  { src: PLANT.ravenala, delay: '-1s', style: { right: '-4rem', bottom: '-3.5rem', width: 'clamp(8rem, 18vw, 17rem)', transform: 'rotate(-10deg)' } },
];

// Verdure supplémentaire sur le côté gauche, à hauteur des questions (grands écrans).
const LEFT_THICKET = [
  { src: PLANT.fern, delay: '-3s', style: { left: '-2.5rem', top: '24%', width: 'clamp(5rem, 7vw, 7.5rem)', transform: 'rotate(68deg)' } },
  { src: PLANT.elephantEar, delay: '-5s', style: { left: '-4.5rem', top: '36%', width: 'clamp(8rem, 13vw, 14rem)', transform: 'rotate(14deg)' } },
  { src: PLANT.banana, delay: '-1.5s', style: { left: '-3.5rem', top: '58%', width: 'clamp(8rem, 12vw, 13rem)', transform: 'rotate(-12deg)' } },
  { src: PLANT.palm, delay: '-6s', style: { left: '-5rem', top: '72%', width: 'clamp(6rem, 10vw, 11rem)', transform: 'rotate(-58deg) scaleX(-1)' } },
];

export function Foliage({ dense = false }) {
  return (
    <div aria-hidden>
      {EDGE_PLANTS.map((p) => (
        <img key={p.src} src={p.src} alt="" draggable={false} className="plant" style={{ ...p.style, animationDelay: p.delay }} />
      ))}
      {dense &&
        LEFT_THICKET.map((p, i) => (
          <img
            key={`thicket-${i}`}
            src={p.src}
            alt=""
            draggable={false}
            className="plant hidden xl:block"
            style={{ ...p.style, animationDelay: p.delay }}
          />
        ))}
    </div>
  );
}

// Feuilles qui débordent des coins d'un panneau de bois (le parent doit être en position relative).
export function BoardLeaves() {
  return (
    <div aria-hidden>
      <img
        src={PLANT.palm}
        alt=""
        draggable={false}
        className="leaf-fg -right-8 -top-14 w-24 rotate-[58deg] sm:-right-14 sm:-top-16 sm:w-32"
      />
      <img
        src={PLANT.fern}
        alt=""
        draggable={false}
        className="leaf-fg -bottom-12 -right-6 w-16 rotate-[155deg] sm:-bottom-14 sm:-right-10 sm:w-20"
      />
      <img
        src={PLANT.banana}
        alt=""
        draggable={false}
        className="leaf-fg -left-16 top-1/4 hidden w-24 rotate-[-78deg] lg:block"
      />
    </div>
  );
}
