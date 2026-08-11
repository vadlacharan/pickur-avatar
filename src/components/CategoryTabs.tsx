import type { ControlGroup } from '../dicebear';
import type { Pins } from '../avatar';

interface Props {
  groups: ControlGroup[];
  active: string;
  pins: Pins;
  onSelect: (key: string) => void;
}

/** Does any control in this group currently hold a pinned enum/color value? */
function groupHasPin(group: ControlGroup, pins: Pins): boolean {
  return group.controls.some(
    (c) => (c.kind === 'enum' || c.kind === 'color') && c.key in pins,
  );
}

export default function CategoryTabs({ groups, active, pins, onSelect }: Props) {
  return (
    <nav className="tabs" aria-label="Avatar categories">
      {groups.map((group) => (
        <button
          key={group.key}
          type="button"
          className={`tab ${active === group.key ? 'is-active' : ''}`}
          aria-pressed={active === group.key}
          onClick={() => onSelect(group.key)}
        >
          {group.label}
          {groupHasPin(group, pins) && <span className="tab-dot" aria-hidden />}
        </button>
      ))}
    </nav>
  );
}
