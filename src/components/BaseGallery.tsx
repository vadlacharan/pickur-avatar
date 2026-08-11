import { useMemo } from 'react';
import { seedThumbUri, type Options } from '../avatar';
import type { Style } from '@dicebear/core';

interface Props {
  style: Style<Record<string, unknown>>;
  options: Options;
  seed: string;
  seeds: string[];
  onPick: (seed: string) => void;
  onMore: () => void;
}

export default function BaseGallery({
  style,
  options,
  seed,
  seeds,
  onPick,
  onMore,
}: Props) {
  // Always show the current character first, then the rest of the gallery.
  const list = useMemo(
    () => [seed, ...seeds.filter((s) => s !== seed)],
    [seed, seeds],
  );

  const optionsSig = JSON.stringify(options);
  const tiles = useMemo(
    () => list.map((s) => ({ s, uri: seedThumbUri(style, options, s) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, list, optionsSig],
  );

  return (
    <section className="enum-block">
      <h3 className="block-title">Base character</h3>
      <div className="grid">
        {tiles.map(({ s, uri }, i) => (
          <button
            key={s}
            type="button"
            className={`tile ${s === seed ? 'is-selected' : ''}`}
            title={i === 0 ? 'Current character' : `Base “${s}”`}
            onClick={() => onPick(s)}
          >
            <img src={uri} alt={s} loading="lazy" />
            {i === 0 && <span className="tile-cap">✓ Current</span>}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-ghost more-btn" onClick={onMore}>
        🎲 More characters
      </button>
    </section>
  );
}
