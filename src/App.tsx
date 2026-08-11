import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  STYLES,
  getStyleEntry,
  parseSchema,
  indexControls,
  type StyleKey,
} from './dicebear';
import {
  buildOptions,
  renderSvg,
  downloadSvg,
  downloadPng,
  randomSeed,
  randomizePins,
  defaultPins,
  type Pins,
  type PinValue,
} from './avatar';
import CategoryTabs from './components/CategoryTabs';
import CategoryEditor from './components/CategoryEditor';
import BaseGallery from './components/BaseGallery';
import type { ControlGroup } from './dicebear';

const DEFAULT_SEED = 'explorer';
const BASE_KEY = '__base__';

/** A stable starting gallery of base characters. */
const STARTER_SEEDS = [
  'Aria', 'Leo', 'Mia', 'Kai', 'Zoe', 'Max', 'Nia', 'Eli',
  'Luna', 'Finn', 'Ivy', 'Omar', 'Sara', 'Jack', 'Noor', 'Ravi',
  'Ada', 'Cleo', 'Theo', 'Remy', 'Yuki', 'Bo', 'Wren', 'Sol',
];

export default function App() {
  const [styleKey, setStyleKey] = useState<StyleKey>('avataaars');
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [pins, setPins] = useState<Pins>({});
  const [activeGroup, setActiveGroup] = useState(BASE_KEY);
  const [baseSeeds, setBaseSeeds] = useState<string[]>(STARTER_SEEDS);
  const [copied, setCopied] = useState(false);

  const entry = useMemo(() => getStyleEntry(styleKey), [styleKey]);
  const groups = useMemo(() => parseSchema(entry.style.schema), [entry]);
  const controls = useMemo(() => indexControls(groups), [groups]);

  // "Base" pseudo-category leads the tab list; the rest come from the schema.
  const tabGroups = useMemo<ControlGroup[]>(
    () => [{ key: BASE_KEY, label: 'Base', controls: [] }, ...groups],
    [groups],
  );

  // Keep a valid active category whenever the style (and thus groups) changes.
  useEffect(() => {
    if (activeGroup !== BASE_KEY && !groups.some((g) => g.key === activeGroup)) {
      setActiveGroup(BASE_KEY);
    }
  }, [groups, activeGroup]);

  const options = useMemo(
    () => buildOptions(seed, pins, controls),
    [seed, pins, controls],
  );
  const svg = useMemo(() => renderSvg(entry.style, options), [entry, options]);

  const current = groups.find((g) => g.key === activeGroup);
  const onBase = activeGroup === BASE_KEY;

  /* --- actions --------------------------------------------------------- */
  const handleStyleChange = useCallback((key: StyleKey) => {
    const nextEntry = getStyleEntry(key);
    const nextGroups = parseSchema(nextEntry.style.schema);
    setStyleKey(key);
    setPins(defaultPins(indexControls(nextGroups)));
    setActiveGroup(BASE_KEY);
  }, []);

  const handlePin = useCallback((key: string, value: PinValue) => {
    setPins((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleClear = useCallback((key: string) => {
    setPins((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleShuffle = useCallback(() => {
    setSeed(randomSeed());
    setPins((prev) => randomizePins(controls, prev));
  }, [controls]);

  const handleReset = useCallback(() => {
    setSeed(DEFAULT_SEED);
    setPins(defaultPins(controls));
  }, [controls]);

  const handleCopy = useCallback(async () => {
    const config = { style: styleKey, options };
    const text = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Copy the config below:', JSON.stringify(config));
    }
  }, [styleKey, options]);

  const handleDownloadPng = useCallback(() => {
    void downloadPng(entry.style, options);
  }, [entry, options]);

  const handleMoreBases = useCallback(() => {
    setBaseSeeds((prev) => [
      ...prev,
      ...Array.from({ length: 12 }, () => randomSeed()),
    ]);
  }, []);

  /* --- render ---------------------------------------------------------- */
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">🎲</span>
          <div>
            <h1>Avatar Studio</h1>
            <span className="tagline">powered by DiceBear · runs offline</span>
          </div>
        </div>

        <label className="style-select">
          <span>Style</span>
          <select
            value={styleKey}
            onChange={(e) => handleStyleChange(e.target.value as StyleKey)}
          >
            {STYLES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </header>

      <main className="studio">
        <section className="stage">
          <div
            className="avatar"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: svg }}
          />

          <div className="stage-actions">
            <button type="button" className="btn btn-primary" onClick={handleShuffle}>
              🎲 Shuffle
            </button>
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              ↺ Reset
            </button>
          </div>

          <div className="stage-downloads">
            <button type="button" className="chip" onClick={() => downloadSvg(svg)}>
              ⬇ SVG
            </button>
            <button type="button" className="chip" onClick={handleDownloadPng}>
              ⬇ PNG
            </button>
            <button type="button" className="chip" onClick={handleCopy}>
              {copied ? '✓ Copied' : '⧉ Copy config'}
            </button>
          </div>
        </section>

        <section className="picker">
          <CategoryTabs
            groups={tabGroups}
            active={activeGroup}
            pins={pins}
            onSelect={setActiveGroup}
          />

          <div className="picker-scroll">
            {onBase ? (
              <BaseGallery
                style={entry.style}
                options={options}
                seed={seed}
                seeds={baseSeeds}
                onPick={setSeed}
                onMore={handleMoreBases}
              />
            ) : current ? (
              <CategoryEditor
                group={current}
                style={entry.style}
                options={options}
                pins={pins}
                onPin={handlePin}
                onClear={handleClear}
              />
            ) : (
              <p className="empty">This style exposes no configurable options.</p>
            )}
            <p className="foot-note">
              {onBase ? (
                <>
                  Pick a <strong>base character</strong> to start from — it keeps any
                  features you&apos;ve already locked. Then use the tabs to customise.
                </>
              ) : (
                <>
                  Tap a face to <strong>lock</strong> that feature ·{' '}
                  <strong>🎲 Auto</strong> lets Shuffle decide · <strong>Skin</strong>{' '}
                  swatches set skin tone.
                </>
              )}
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
