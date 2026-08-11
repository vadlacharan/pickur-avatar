import { useMemo } from 'react';
import type { Control, ControlGroup } from '../dicebear';
import { humanize } from '../dicebear';
import {
  thumbUri,
  autoThumbUri,
  noneThumbUri,
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
  // Probability / integer controls are intentionally not rendered — optional
  // features are driven by the "None" tile inside their enum grid instead.
  const enums = group.controls.filter((c) => c.kind === 'enum');
  const colors = group.controls.filter((c) => c.kind === 'color');

  return (
    <div className="editor">
      {enums.map((c) => (
        <EnumGrid
          key={c.key}
          control={c}
          style={style}
          options={options}
          pins={pins}
          onPin={onPin}
          onClear={onClear}
        />
      ))}

      {colors.map((c) => (
        <ColorRow
          key={c.key}
          control={c}
          style={style}
          options={options}
          value={typeof pins[c.key] === 'string' ? (pins[c.key] as string) : undefined}
          onPin={onPin}
          onClear={onClear}
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
  pins,
  onPin,
  onClear,
}: {
  control: Control;
  style: Style<Record<string, unknown>>;
  options: Options;
  pins: Pins;
  onPin: (key: string, value: PinValue) => void;
  onClear: (key: string) => void;
}) {
  const values = control.values ?? [];
  const probKey = control.probabilityKey;
  const probMax = control.probabilityMax ?? 100;

  const pinnedValue =
    typeof pins[control.key] === 'string' ? (pins[control.key] as string) : undefined;
  const isNone = probKey !== undefined && pins[probKey] === 0;
  const isAuto = !isNone && pinnedValue === undefined;

  // Value tiles should always *show* the feature, so force it on for previews.
  const tileBase = useMemo<Options>(
    () => (probKey ? { ...options, [probKey]: probMax } : options),
    [options, probKey, probMax],
  );

  // Rebuild previews only when the surrounding look changes (not when browsing
  // other categories).
  const baseSig = useMemo(() => {
    const clone: Options = { ...options };
    delete clone[control.key];
    return JSON.stringify(clone);
  }, [options, control.key]);

  const autoUri = useMemo(
    () => autoThumbUri(style, options, control.key, probKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, control.key, probKey, baseSig],
  );

  const noneUri = useMemo(
    () => (probKey ? noneThumbUri(style, options, control.key, probKey) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, control.key, probKey, baseSig],
  );

  const tiles = useMemo(
    () => values.map((v) => ({ v, uri: thumbUri(style, tileBase, control.key, v) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, control.key, baseSig, values, probKey, probMax],
  );

  const selectAuto = () => {
    onClear(control.key);
    if (probKey) onClear(probKey);
  };
  const selectNone = () => {
    onClear(control.key);
    if (probKey) onPin(probKey, 0);
  };
  const selectValue = (v: string) => {
    onPin(control.key, v);
    if (probKey) onPin(probKey, probMax);
  };

  return (
    <section className="enum-block">
      <h3 className="block-title">{control.label}</h3>
      <div className="grid">
        <button
          type="button"
          className={`tile tile-tag ${isAuto ? 'is-selected' : ''}`}
          title="Auto — let Shuffle decide"
          onClick={selectAuto}
        >
          <img src={autoUri} alt="Auto" loading="lazy" />
          <span className="tile-cap">🎲 Auto</span>
        </button>

        {probKey && (
          <button
            type="button"
            className={`tile tile-tag ${isNone ? 'is-selected' : ''}`}
            title="None — hide this feature"
            onClick={selectNone}
          >
            <img src={noneUri} alt="None" loading="lazy" />
            <span className="tile-cap">🚫 None</span>
          </button>
        )}

        {tiles.map(({ v, uri }) => (
          <button
            key={v}
            type="button"
            className={`tile ${pinnedValue === v && !isNone ? 'is-selected' : ''}`}
            title={humanize(v)}
            onClick={() => (pinnedValue === v && !isNone ? selectAuto() : selectValue(v))}
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
  const palette = control.palette ?? [];
  const isTransparent = value === 'transparent';
  const isCustom =
    value !== undefined && value !== 'transparent' && !palette.includes(value);
  const colorInputValue = isCustom ? `#${value}` : '#cc785c';

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
  const transparentUri = useMemo(
    () => (control.allowsTransparent ? thumbUri(style, options, control.key, 'transparent') : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, control.key, baseSig, control.allowsTransparent],
  );
  const tiles = useMemo(
    () => palette.map((hex) => ({ hex, uri: thumbUri(style, options, control.key, hex) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [style, control.key, baseSig, palette],
  );

  return (
    <section className="enum-block">
      <h3 className="block-title">{control.label}</h3>
      <div className="grid">
        <button
          type="button"
          className={`tile tile-tag ${value === undefined ? 'is-selected' : ''}`}
          title="Auto — let Shuffle decide"
          onClick={() => onClear(control.key)}
        >
          <img src={autoUri} alt="Auto" loading="lazy" />
          <span className="tile-cap">🎲 Auto</span>
        </button>

        {control.allowsTransparent && (
          <button
            type="button"
            className={`tile tile-checker tile-tag ${isTransparent ? 'is-selected' : ''}`}
            title="None — transparent"
            onClick={() =>
              isTransparent ? onClear(control.key) : onPin(control.key, 'transparent')
            }
          >
            <img src={transparentUri} alt="None" loading="lazy" />
            <span className="tile-cap">🚫 None</span>
          </button>
        )}

        {tiles.map(({ hex, uri }) => (
          <button
            key={hex}
            type="button"
            className={`tile tile-color ${value === hex ? 'is-selected' : ''}`}
            title={`#${hex}`}
            onClick={() => (value === hex ? onClear(control.key) : onPin(control.key, hex))}
          >
            <img src={uri} alt={hex} loading="lazy" />
            <span className="tile-chip" style={{ background: `#${hex}` }} aria-hidden />
          </button>
        ))}

        <label
          className={`tile tile-custom ${isCustom ? 'is-selected' : ''}`}
          title="Custom colour"
        >
          <input
            type="color"
            value={colorInputValue}
            onChange={(e) => onPin(control.key, e.target.value.replace('#', ''))}
          />
          <span className="tile-plus">+</span>
          <span className="tile-cap">Custom</span>
        </label>
      </div>
    </section>
  );
}
