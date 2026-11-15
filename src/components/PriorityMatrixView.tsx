import type {
  ImpactUrgencyLevel,
  MatrixMode,
  PriorityLevel,
  PriorityMatrixGrid,
} from '../types/incident';
import {
  IMPACT_LEVELS,
  PRIORITY_MATRICES,
  PRIORITY_SLA_GUIDE,
  URGENCY_LEVELS,
} from '../lib/priorityMatrix';
import { PriorityBadge } from './PriorityTag';

interface PriorityMatrixViewProps {
  matrixMode: MatrixMode;
  onChangeMatrixMode: (mode: MatrixMode) => void;
  customMatrix: PriorityMatrixGrid;
  onChangeCustomCell: (
    impact: ImpactUrgencyLevel,
    urgency: ImpactUrgencyLevel,
    priority: PriorityLevel,
  ) => void;
  onReturnToTriage: () => void;
}

const PRIORITIES: PriorityLevel[] = ['P1', 'P2', 'P3', 'P4'];

export function PriorityMatrixView({
  matrixMode,
  onChangeMatrixMode,
  customMatrix,
  onChangeCustomCell,
  onReturnToTriage,
}: PriorityMatrixViewProps) {
  const activeGrid: PriorityMatrixGrid | null =
    matrixMode === 'unavailable'
      ? null
      : matrixMode === 'custom'
        ? customMatrix
        : matrixMode === 'strict'
          ? PRIORITY_MATRICES.strict.grid
          : PRIORITY_MATRICES.standard.grid;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ITIL 4 Priority Matrix & SLA Governance
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Impact and Urgency are evaluated independently before resolving Priority. Switch between organizational matrices or disable the matrix to observe provisional priority guidance.
          </p>
        </div>
        <button
          type="button"
          onClick={onReturnToTriage}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer"
        >
          Apply in Triage Workbench
        </button>
      </div>

      {/* Policy Mode Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => onChangeMatrixMode('standard')}
          className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
            matrixMode === 'standard'
              ? 'bg-white border-blue-700 ring-1 ring-blue-700'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-sm font-semibold text-slate-900">
            Standard Enterprise Matrix
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Calibrated against the 56 historical KB records.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChangeMatrixMode('strict')}
          className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
            matrixMode === 'strict'
              ? 'bg-white border-blue-700 ring-1 ring-blue-700'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-sm font-semibold text-slate-900">
            High-Sensitivity Peak Matrix
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Escalates High Impact × Medium Urgency directly to P1.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChangeMatrixMode('custom')}
          className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
            matrixMode === 'custom'
              ? 'bg-white border-blue-700 ring-1 ring-blue-700'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-sm font-semibold text-slate-900">
            Custom Editable Matrix
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Customize each Impact × Urgency cell for your tenant SLA.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onChangeMatrixMode('unavailable')}
          className={`text-left p-4 rounded-lg border transition-colors cursor-pointer ${
            matrixMode === 'unavailable'
              ? 'bg-white border-blue-700 ring-1 ring-blue-700'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-sm font-semibold text-slate-900">
            Matrix Unavailable (Provisional)
          </div>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Simulates missing matrix policy; generates provisional reasoning.
          </p>
        </button>
      </div>

      {/* Interactive 3x3 Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-6 items-start">
        <section className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Impact × Urgency Resolution Matrix
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {matrixMode === 'unavailable'
                ? 'No organizational matrix is currently active. Triage recommendations will be marked Provisional.'
                : matrixMode === 'custom'
                  ? 'Select priority values below to customize your active priority matrix.'
                  : 'Read-only preview of the selected organizational matrix.'}
            </p>
          </div>

          {activeGrid === null ? (
            <div className="p-6 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900 space-y-2">
              <div className="font-semibold">
                Priority Matrix Unavailable — Provisional Mode Active
              </div>
              <p className="text-xs leading-relaxed text-amber-800">
                Per ITIL 4 guidance, when an organizational priority matrix is unavailable, the analyst will evaluate Impact and Urgency separately, emit a provisional priority baseline, and require Incident Manager verification against local SLA agreements.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-slate-500">
                      Impact \ Urgency
                    </th>
                    {URGENCY_LEVELS.map((urgency) => (
                      <th
                        key={urgency}
                        className="py-3 px-4 text-center text-xs font-semibold text-slate-700"
                      >
                        {urgency} Urgency
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {IMPACT_LEVELS.map((impact) => (
                    <tr key={impact}>
                      <th className="py-4 px-4 text-left text-xs font-semibold text-slate-700 bg-slate-50/70">
                        {impact} Impact
                      </th>
                      {URGENCY_LEVELS.map((urgency) => {
                        const prio = activeGrid[impact][urgency];
                        return (
                          <td key={urgency} className="py-4 px-4 text-center">
                            {matrixMode === 'custom' ? (
                              <select
                                aria-label={`Priority for ${impact} impact and ${urgency} urgency`}
                                value={prio}
                                onChange={(e) =>
                                  onChangeCustomCell(
                                    impact,
                                    urgency,
                                    e.target.value as PriorityLevel,
                                  )
                                }
                                className="px-2.5 py-1.5 text-xs font-mono font-semibold border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-700"
                              >
                                {PRIORITIES.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <PriorityBadge priority={prio} />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* SLA & Escalation Thresholds Reference */}
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Priority SLA & Escalation Reference
          </h2>
          <div className="divide-y divide-slate-100">
            {PRIORITIES.map((prio) => {
              const info = PRIORITY_SLA_GUIDE[prio];
              return (
                <div key={prio} className="py-3.5 first:pt-1 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <PriorityBadge priority={prio} />
                    <span className="text-xs font-mono text-slate-600 tabular-nums">
                      Response: {info.responseTarget}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <strong>Cadence:</strong> {info.cadence}
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    <strong>Escalation:</strong> {info.escalationRule}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
