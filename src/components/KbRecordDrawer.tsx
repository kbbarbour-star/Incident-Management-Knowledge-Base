import { X, ArrowUpRight } from 'lucide-react';
import type { KnowledgeBaseRecord } from '../types/incident';
import { LevelText, PriorityBadge } from './PriorityTag';

interface KbRecordDrawerProps {
  record: KnowledgeBaseRecord | null;
  onClose: () => void;
  onLoadIntoTriage: (record: KnowledgeBaseRecord) => void;
}

export function KbRecordDrawer({
  record,
  onClose,
  onLoadIntoTriage,
}: KbRecordDrawerProps) {
  if (!record) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kb-drawer-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <aside className="relative w-full max-w-xl bg-white h-full border-l border-slate-200 overflow-y-auto flex flex-col">
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
              <span className="font-mono font-semibold text-slate-900">
                {record.incidentId}
              </span>
              <span aria-hidden="true">·</span>
              <span>{record.category}</span>
            </div>
            <h2
              id="kb-drawer-title"
              className="text-lg font-semibold text-slate-900 leading-snug"
            >
              Historical Incident SOP & Postmortem
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={`Close ${record.incidentId} details`}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="grid grid-cols-3 gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-xs text-slate-500 mb-1">Impact</div>
              <LevelText level={record.impact} />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Urgency</div>
              <LevelText level={record.urgency} />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">Priority</div>
              <PriorityBadge priority={record.priority} />
            </div>
          </div>

          <section>
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
              Incident Symptoms & Context
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {record.description}
            </p>
          </section>

          <section className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
              Major Incident Criteria
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {record.majorIncidentCriteria}
            </p>
          </section>

          <section className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
              Escalation Procedures
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {record.escalationProcedures}
            </p>
          </section>

          <section className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
              Communication Standards
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {record.communicationStandards}
            </p>
          </section>

          <section className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
              Verified Resolution
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {record.resolution}
            </p>
          </section>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onLoadIntoTriage(record);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer"
          >
            <span>Simulate in Triage Workbench</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}
