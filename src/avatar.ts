/** Avatar generation + export helpers. Everything runs locally via @dicebear/core. */
import { createAvatar } from '@dicebear/core';
import type { Style } from '@dicebear/core';
import type { Control } from './dicebear';

export type PinValue = string | number;
export type Pins = Record<string, PinValue>;
export type Options = Record<string, unknown>;

type AnyStyle = Style<Record<string, unknown>>;

/**
 * Build the exact options object passed to createAvatar.
 * Enum/color pins become single-element arrays (this *locks* the feature to the
 * chosen value); probability/integer pins are passed as plain numbers. Anything
 * left unpinned is omitted so DiceBear's schema defaults + the seed decide it.
 */
export function buildOptions(
  seed: string,
  pins: Pins,
  controls: Record<string, Control>,
): Options {
  const options: Options = { seed };
  for (const [key, value] of Object.entries(pins)) {
    const control = controls[key];
    if (!control) continue;
    if (control.kind === 'enum' || control.kind === 'color') {
      options[key] = [value];
    } else {
      options[key] = value;
    }
  }
  return options;
}

export function renderSvg(style: AnyStyle, options: Options): string {
  return createAvatar(style, options).toString();
}

/* ---------------------------------------------------------------------------
 * Thumbnails: render each option ON TOP of the current avatar (so the grid
 * previews look like the user's actual avatar, Snapchat-style), overriding just
 * the one option being previewed.
 * ------------------------------------------------------------------------- */
export function thumbUri(
  style: AnyStyle,
  baseOptions: Options,
  optionKey: string,
  value: string,
  size = 90,
): string {
  return createAvatar(style, {
    ...baseOptions,
    size,
    [optionKey]: [value],
  }).toDataUri();
}

/** A preview of a whole "base character" — the current look under a given seed. */
export function seedThumbUri(
  style: AnyStyle,
  baseOptions: Options,
  seed: string,
  size = 96,
): string {
  return createAvatar(style, { ...baseOptions, seed, size }).toDataUri();
}

/** The "auto" preview: what the seed produces when this feature is left free. */
export function autoThumbUri(
  style: AnyStyle,
  baseOptions: Options,
  optionKey: string,
  probabilityKey?: string,
  size = 90,
): string {
  const opts: Options = { ...baseOptions, size };
  delete opts[optionKey];
  if (probabilityKey) delete opts[probabilityKey];
  return createAvatar(style, opts).toDataUri();
}

/** The "none" preview: the feature forced off (probability 0). */
export function noneThumbUri(
  style: AnyStyle,
  baseOptions: Options,
  optionKey: string,
  probabilityKey: string,
  size = 90,
): string {
  const opts: Options = { ...baseOptions, size };
  delete opts[optionKey];
  opts[probabilityKey] = 0;
  return createAvatar(style, opts).toDataUri();
}

/* ---------------------------------------------------------------------------
 * Randomization
 * ------------------------------------------------------------------------- */
export function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Randomize = new seed + a random valid value for every enum/color. Optional
 * features (those with a linked probability) are randomly either turned off
 * ("None") or forced on with a random value, so avatars get real variety.
 */
export function randomizePins(controls: Record<string, Control>): Pins {
  const next: Pins = {};
  for (const control of Object.values(controls)) {
    if (control.kind === 'enum' && control.values?.length) {
      if (control.probabilityKey) {
        if (Math.random() < 0.5) {
          next[control.probabilityKey] = 0; // None
        } else {
          next[control.key] = pick(control.values);
          next[control.probabilityKey] = control.probabilityMax ?? 100;
        }
      } else {
        next[control.key] = pick(control.values);
      }
    } else if (control.kind === 'color' && control.palette?.length) {
      next[control.key] = pick(control.palette);
    }
  }
  return next;
}

/**
 * Reset = clear every pin, so the avatar returns to the style's out-of-the-box
 * look (schema defaults + seed decide everything).
 */
export function defaultPins(_controls: Record<string, Control>): Pins {
  return {};
}

/* ---------------------------------------------------------------------------
 * Downloads
 * ------------------------------------------------------------------------- */
function triggerDownload(url: string, filename: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function downloadSvg(svg: string, filename = 'avatar.svg'): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, filename);
  URL.revokeObjectURL(url);
}

/** Rasterize an SVG string to a PNG via a canvas. */
export function downloadPng(
  style: AnyStyle,
  options: Options,
  size = 512,
  filename = 'avatar.png',
): Promise<void> {
  // Regenerate at an explicit pixel size so width/height are present for the canvas.
  const svg = renderSvg(style, { ...options, size });
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D context unavailable');
        ctx.drawImage(img, 0, 0, size, size);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) {
            reject(new Error('PNG encoding failed'));
            return;
          }
          const pngUrl = URL.createObjectURL(pngBlob);
          triggerDownload(pngUrl, filename);
          URL.revokeObjectURL(pngUrl);
          resolve();
        }, 'image/png');
      } catch (err) {
        reject(err);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not load SVG for rasterization'));
    };
    img.src = url;
  });
}
