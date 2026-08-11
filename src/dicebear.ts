/**
 * Style registry + schema-driven control model.
 *
 * The whole UI is generated from each style's JSON Schema (`style.schema`) that
 * ships inside the DiceBear npm packages. Nothing about the available options is
 * hardcoded here — we read the schema at runtime and classify every property.
 */
import * as collection from '@dicebear/collection';
import type { Style } from '@dicebear/core';
import type { JSONSchema7, JSONSchema7Definition } from 'json-schema';

export type StyleKey =
  | 'avataaars'
  | 'adventurer'
  | 'personas'
  | 'big-smile'
  | 'lorelei';

export interface StyleEntry {
  key: StyleKey;
  label: string;
  style: Style<Record<string, unknown>>;
}

/** The human-figure styles we expose in the dropdown. */
export const STYLES: StyleEntry[] = [
  { key: 'avataaars', label: 'Avataaars', style: collection.avataaars },
  { key: 'adventurer', label: 'Adventurer', style: collection.adventurer },
  { key: 'personas', label: 'Personas', style: collection.personas },
  { key: 'big-smile', label: 'Big Smile', style: collection.bigSmile },
  { key: 'lorelei', label: 'Lorelei', style: collection.lorelei },
];

export function getStyleEntry(key: StyleKey): StyleEntry {
  return STYLES.find((s) => s.key === key) ?? STYLES[0];
}

export type ControlKind = 'enum' | 'color' | 'probability' | 'integer';

export interface Control {
  /** The raw schema option key, e.g. "facialHairColor". */
  key: string;
  label: string;
  kind: ControlKind;
  /** enum: the full set of allowed values, straight from the schema. */
  values?: string[];
  /** color: suggested swatches (the schema's default palette). */
  palette?: string[];
  /** color: whether "transparent" is a legal value. */
  allowsTransparent?: boolean;
  /** integer / probability bounds. */
  min?: number;
  max?: number;
  /** The schema default (used by Reset and as the slider starting point). */
  default?: unknown;
  /**
   * enum only: the key of the linked `…Probability` option, if the feature is
   * optional. Its presence means the grid should offer a "None" tile that hides
   * the feature (probability 0) instead of exposing a probability control.
   */
  probabilityKey?: string;
  /** enum only: the probability value that forces the feature to always show. */
  probabilityMax?: number;
}

export interface ControlGroup {
  key: string;
  label: string;
  controls: Control[];
}

const HEX_PATTERN_MARKER = 'a-fA-F';

/** camelCase / kebab option key -> "Title Case" label. */
export function humanize(key: string): string {
  return key
    .replace(/[-_]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Group root: strip a trailing "Color" / "Probability" / "Graphic" qualifier. */
function rootOf(key: string): string {
  const m = key.match(/^(.*?)(Color|Probability|Graphic|Type|Rotation)$/);
  const root = m && m[1] ? m[1] : key;
  return root;
}

function asSchema(def: JSONSchema7Definition | undefined): JSONSchema7 | undefined {
  return def && typeof def === 'object' ? def : undefined;
}

/** Turn one schema property into a Control, or null if we can't render it. */
function classify(key: string, prop: JSONSchema7): Control | null {
  const label = humanize(key);

  if (prop.type === 'integer' || prop.type === 'number') {
    const isProbability = /probability$/i.test(key);
    return {
      key,
      label,
      kind: isProbability ? 'probability' : 'integer',
      min: typeof prop.minimum === 'number' ? prop.minimum : 0,
      max: typeof prop.maximum === 'number' ? prop.maximum : 100,
      default: prop.default,
    };
  }

  if (prop.type === 'array') {
    const items = asSchema(prop.items as JSONSchema7Definition | undefined);
    if (!items) return null;

    // Enumerable option: a finite list of allowed string values.
    if (Array.isArray(items.enum) && items.enum.length > 0) {
      const values = items.enum.filter((v): v is string => typeof v === 'string');
      // A single-choice enum (e.g. base:["default"]) offers no real control.
      if (values.length < 2) return null;
      return { key, label, kind: 'enum', values, default: prop.default };
    }

    // Color option: items constrained to a hex-colour pattern.
    if (typeof items.pattern === 'string' && items.pattern.includes(HEX_PATTERN_MARKER)) {
      const palette = Array.isArray(prop.default)
        ? (prop.default as unknown[]).filter((v): v is string => typeof v === 'string')
        : [];
      return {
        key,
        label,
        kind: 'color',
        palette,
        allowsTransparent: items.pattern.includes('transparent'),
        default: prop.default,
      };
    }
  }

  return null;
}

/** Order controls within a group so the main feature comes first. */
const KIND_ORDER: Record<ControlKind, number> = {
  enum: 0,
  color: 1,
  probability: 2,
  integer: 3,
};

/**
 * Parse a style schema into grouped controls. Controls that share a root
 * (e.g. `hair`, `hairColor`, `hairProbability`) are grouped together.
 */
export function parseSchema(schema: JSONSchema7 | undefined): ControlGroup[] {
  const props = (schema?.properties ?? {}) as Record<string, JSONSchema7Definition>;

  const groups = new Map<string, ControlGroup>();
  const order: string[] = [];

  for (const [key, def] of Object.entries(props)) {
    const prop = asSchema(def);
    if (!prop) continue;
    const control = classify(key, prop);
    if (!control) continue;

    const root = rootOf(key);
    if (!groups.has(root)) {
      groups.set(root, { key: root, label: humanize(root), controls: [] });
      order.push(root);
    }
    groups.get(root)!.controls.push(control);
  }

  for (const g of groups.values()) {
    g.controls.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);

    // Link an optional feature's probability to its enum so the grid can offer
    // a "None" tile. The probability itself is no longer rendered as a control.
    const prob = g.controls.find((c) => c.kind === 'probability');
    const firstEnum = g.controls.find((c) => c.kind === 'enum');
    if (prob && firstEnum) {
      firstEnum.probabilityKey = prob.key;
      firstEnum.probabilityMax = typeof prob.max === 'number' ? prob.max : 100;
    }
  }

  return order.map((r) => groups.get(r)!);
}

/** Flatten groups into a key -> Control lookup. */
export function indexControls(groups: ControlGroup[]): Record<string, Control> {
  const out: Record<string, Control> = {};
  for (const g of groups) for (const c of g.controls) out[c.key] = c;
  return out;
}
