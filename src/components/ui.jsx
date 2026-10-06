// Briques visuelles du thème caramel & motifs africains.
import { MASKS, MASK_SOURCE } from '../masks.js';

// Photos de masques détourées (public/masks) ; le djembé reste une illustration SVG.
export const ILLUSTRATIONS = {
  masque: MASKS['pende-gambanda'].src,
  djembe: '/illustrations/djembe.svg',
  pretre: MASKS['songye-nkishi'].src,
  yuma: MASKS['bembe-emangungu'].src,
};

export function Illustration({ name, alt = '', className = '' }) {
  return (
    <img
      src={ILLUSTRATIONS[name] ?? MASKS[name]?.src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={`pointer-events-none select-none object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,0.5)] ${className}`}
    />
  );
}

/** Œuvre présentée comme en vitrine : halo de projecteur, ombre portée et cartel optionnel. */
// Décalage d'animation stable par œuvre, pour que les totems ne bougent pas à l'unisson.
const delayFor = (name) => `-${[...name].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 6}s`;

export function MaskFigure({ name, className = '', caption = false, decorative = false, still = false, sun = false }) {
  const mask = MASKS[name];
  return (
    <figure className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="mask-stage relative flex min-h-0 w-full flex-1 items-center justify-center">
        {sun && <span className="sunburst" aria-hidden />}
        <img
          src={mask.src}
          alt={decorative ? '' : `${mask.label}, art ${mask.people} (RDC)`}
          aria-hidden={decorative || undefined}
          draggable={false}
          style={still ? undefined : { animationDelay: delayFor(name) }}
          className={`relative z-10 max-h-full max-w-full select-none object-contain drop-shadow-[0_28px_32px_rgba(0,0,0,0.6)] ${still ? '' : 'totem'}`}
        />
      </div>
      {caption && (
        <figcaption className="museum-label">
          <span className="block font-semibold text-kin-cream/90">
            {mask.label} · {mask.people}, RDC
          </span>
          <span className="block">{MASK_SOURCE}</span>
        </figcaption>
      )}
    </figure>
  );
}

export function WoodButton({ tone = 1, className = '', children, ...props }) {
  return (
    <button type="button" className={`wood-btn wood-tone-${tone} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function AmberButton({ className = '', children, ...props }) {
  return (
    <button type="button" className={`btn-amber ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Panel({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`glass-panel ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function KubaBand({ className = '' }) {
  return <div aria-hidden className={`kuba-band ${className}`} />;
}

export function Logo({ size = 'md', tagline = 'Culture congolaise' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <span className={`grid shrink-0 place-items-center rounded-full bg-kin-bark ring-1 ring-kin-gold/40 ${big ? 'h-14 w-14' : 'h-11 w-11'}`}>
        <Illustration name="masque" className={big ? 'h-11 w-auto' : 'h-8 w-auto'} />
      </span>
      <div className="leading-none">
        <p className={`font-display tracking-tight text-kin-cream ${big ? 'text-3xl' : 'text-[1.4rem]'}`}>
          Kin <span className="text-kin-gold">Quiz</span>
        </p>
        <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.28em] text-kin-cream/55">{tagline}</p>
      </div>
    </div>
  );
}

export function ConnectionDot({ connected }) {
  return (
    <span className="chip" role="status">
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-kin-leaf' : 'animate-pulse bg-kin-terracotta'}`} />
      {connected ? 'En ligne' : 'Reconnexion…'}
    </span>
  );
}

export function Spinner({ className = '' }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-5 w-5 animate-spin rounded-full border-[3px] border-current border-r-transparent ${className}`}
    />
  );
}

export function Eyebrow({ children, className = '' }) {
  return (
    <p className={`text-xs font-bold uppercase tracking-[0.25em] text-kin-gold ${className}`}>{children}</p>
  );
}
