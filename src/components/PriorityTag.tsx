import type { ImpactUrgencyLevel, PriorityLevel } from '../types/incident';

const PRIORITY_STYLES: Record<PriorityLevel, { label: string; classes: string }> = {
  P1: {
    label: 'P1 Critical',
    classes: 'text-red-700 bg-red-50 border-red-200',
  },
  P2: {
    label: 'P2 High',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  P3: {
    label: 'P3 Medium',
    classes: 'text-sky-800 bg-sky-50 border-sky-200',
  },
  P4: {
    label: 'P4 Low',
    classes: 'text-slate-700 bg-slate-100 border-slate-200',
  },
};

export function PriorityBadge({ priority }: { priority: PriorityLevel }) {
  const style = PRIORITY_STYLES[priority];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-semibold rounded border whitespace-nowrap shrink-0 tabular-nums ${style.classes}`}
    >
      {style.label}
    </span>
  );
}

const LEVEL_STYLES: Record<ImpactUrgencyLevel, string> = {
  High: 'text-red-700 font-semibold',
  Medium: 'text-amber-700 font-semibold',
  Low: 'text-slate-700 font-medium',
};

export function LevelText({ level }: { level: ImpactUrgencyLevel }) {
  return <span className={`font-mono text-sm ${LEVEL_STYLES[level]}`}>{level}</span>;
}
