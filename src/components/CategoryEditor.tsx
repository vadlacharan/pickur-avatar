import { useMemo } from 'react';
import type { Control, ControlGroup } from '../dicebear';
import { humanize } from '../dicebear';
import {
  thumbUri,
  autoThumbUri,
  type Options,
  type PinValue,
  type Pins,
} from '../avatar';
import type { Style } from '@dicebear/core';

interface Props {
  group: ControlGroup;
  style: Style<Record<string, unknown>>;
  options: Options;
  pins: Pins;
  onPin: (key: string, value: PinValue) => void;
  onClear: (key: string) => void;
}

export default function CategoryEditor({
  group,
  style,
  options,
  pins,
  onPin,
  onClear,
}: Props) {
  const enums = group.controls.filter((c) => c.kind === 'enum');
  const colors = group.controls.filter((c) => c.kind === 'color');
  const ranges = group.controls.filter(
    (c) => c.kind === 'probability' || c.kind === 'integer',
  );

  return (
    <div className="editor">
      {enums.map((c) => (
        <EnumGrid
          key={c.key}
          control={c}
          style={style}
          options={options}
          value={typeof pins[c.key] === 'string' ? (pins[c.key] as string) : undefined}
          onPin={onPin}
          onClear={onClear}
        />
      ))}

      {colors.map((c) => (
        <ColorRow
          key={c.key}
          control={c}
          value={typeof pins[c.key] === 'string' ? (pins[c.key] as string) : undefined}
          onPin={onPin}
          onClear={onClear}
        />
      ))}

      {ranges.map((c) => (
        <ToggleRow
          key={c.key}
          control={c}
          value={
            typeof pins[c.key] === 'number'
              ? (pins[c.key] as number)
              : (c.default as number) ?? c.min ?? 0
          }
          onPin={onPin}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function EnumGrid({
  control,
  style,
  options,
  value,
  onPin,
  onClear,
}: {
  control: Control;
  style: Style<Record<string, unknown>>;
  options: Options;
  value: string | undefined;
  onPin: (key: string, value: PinValue) => void;
  onClear: (key: string) => void;
}) {
  const values = control.values ?? [];

  // Regenerate previews only when the base look (everything except this option)
  // or the option key changes, so browsing other categories doesn't rebuild.
  const baseSig = useMemo(() => {
    const clone: Options = { ...options };
    delete clone[control.key];
    return JSON.stringify(clone);
  }, [options, control.key]);

  const autoUri = useMemo(
    () => autoThumbUri(style, options, control.key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, control.key, baseSig],
  );

  const tiles = useMemo(
    () =>
      values.map((v) => ({ v, uri: thumbUri(style, options, control.key, v) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, control.key, baseSig, values],
  );

  return (
    <section className="enum-block">
      <h3 className="block-title">{control.label}</h3>
      <div className="grid">
        <button
          type="button"
          className={`tile tile-auto ${value === undefined ? 'is-selected' : ''}`}
          title="Auto — let the shuffle decide"
          onClick={() => onClear(control.key)}
        >
          <img src={autoUri} alt="Auto" loading="lazy" />
          <span className="tile-cap">🎲 Auto</span>
        </button>

        {tiles.map(({ v, uri }) => (
          <button
            key={v}
            type="button"
            className={`tile ${value === v ? 'is-selected' : ''}`}
            title={humanize(v)}
            onClick={() => (value === v ? onClear(control.key) : onPin(control.key, v))}
          >
            <img src={uri} alt={v} loading="lazy" />
          </button>
        ))}
      </div>
    </section>
  );
}

function ColorRow({
  control,
  value,
  onPin,
  onClear,
}: {
  control: Control;
  value: string | undefined;
  onPin: (key: string, value: PinValue) => void;
  onClear: (key: string) => void;
}) {
  const palette = control.palette ?? [];
  const isTransparent = value === 'transparent';
  const colorInputValue = value && value !== 'transparent' ? `#${value}` : '#cc785c';

  return (
    <section className="color-block">
      <h3 className="block-title">{control.label}</h3>
      <div className="swatch-row">
        {palette.map((hex) => (
          <button
            key={hex}
            type="button"
            className={`swatch ${value === hex ? 'is-selected' : ''}`}
            style={{ background: `#${hex}` }}
            title={`#${hex}`}
            onClick={() => (value === hex ? onClear(control.key) : onPin(control.key, hex))}
          />
        ))}

        {control.allowsTransparent && (
          <button
            type="button"
            className={`swatch swatch-transparent ${isTransparent ? 'is-selected' : ''}`}
            title="transparent"
            onClick={() =>
              isTransparent ? onClear(control.key) : onPin(control.key, 'transparent')
            }
          />
        )}

        <label className="swatch swatch-custom" title="Custom colour">
          <input
            type="color"
            value={colorInputValue}
            onChange={(e) => onPin(control.key, e.target.value.replace('#', ''))}
          />
          <span>+</span>
        </label>
      </div>
    </section>
  );
}

function ToggleRow({
  control,
  value,
  onPin,
}: {
  control: Control;
  value: number;
  onPin: (key: string, value: PinValue) => void;
}) {
  const min = control.min ?? 0;
  const max = control.max ?? 100;
  const isProbability = control.kind === 'probability';
  const on = value > min;

  return (
    <section className="range-block">
      <div className="range-head">
        <h3 className="block-title">{control.label}</h3>
        {isProbability ? (
          <button
            type="button"
            className={`switch ${on ? 'is-on' : ''}`}
            role="switch"
            aria-checked={on}
            onClick={() => onPin(control.key, on ? 0 : 100)}
          >
            <span className="switch-knob" />
          </button>
        ) : (
          <span className="range-value">{value}</span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onPin(control.key, Number(e.target.value))}
      />
    </section>
  );
}
