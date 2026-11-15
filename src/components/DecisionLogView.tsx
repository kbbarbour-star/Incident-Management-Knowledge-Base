import { useMemo, useState } from 'react';
import { Check, Copy, Trash2 } from 'lucide-react';
import type { ApprovalStatus, TriageDecisionRecord } from '../types/incident';
import { PriorityBadge } from './PriorityTag';

interface DecisionLogViewProps {
  decisions: TriageDecisionRecord[];
  onOpenDecision: (record: TriageDecisionRecord) => void;
  onClearLog: () => void;
}

const STATUS_OPTIONS: Array<{ value: 'all' | ApprovalStatus; label: string }> = [
  { value: 'all', label: 'All Decisions' },
  { value: 'approved', label: 'Approved' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'returned_for_info', label: 'Returned for Info' },
];

export function DecisionLogView({
  decisions,
  onOpenDecision,
  onClearLog,
}: DecisionLogViewProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return decisions;
    return decisions.filter((d) => d.approvalStatus === statusFilter);
  }, [decisions, statusFilter]);

  const handleCopySummary = async (record: TriageDecisionRecord) => {
    const summary = [
      `Triage ID: ${record.analysis.id}`,
      `Status: ${record.approvalStatus}`,
      `Approved Priority: ${record.approvedPriority}`,
      `Major Incident Declared: ${record.majorIncidentApproved ? 'Yes' : 'No'}`,
      `Escalation Authorized: ${record.escalationApproved ? 'Yes' : 'No'}`,
      `Reviewer: ${record.reviewerName || 'Pending'}`,
      `Category: ${record.analysis.recommendedCategory.category}`,
      `Summary: ${record.analysis.incidentSummary.overview}`,
      `Executive Update: ${record.analysis.executiveCommunication.message}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(summary);
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Triage Decision & Audit Log
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Persistent record of incident assessments, human reviewer authorizations, and priority approvals.
          </p>
        </div>
        {decisions.length > 0 && (
          <button
            type="button"
            onClick={onClearLog}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reset Session Log</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {STATUS_OPTIONS.map((opt) => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
          <p className="text-sm font-medium text-slate-900">
            No triage decisions match this filter
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Run an incident analysis in the Triage Workbench and submit a human review decision to populate the audit trail.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-3 px-4 whitespace-nowrap">Triage ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Category</th>
                  <th className="py-3 px-4">Overview</th>
                  <th className="py-3 px-4 whitespace-nowrap">Priority</th>
                  <th className="py-3 px-4 whitespace-nowrap">Review Status</th>
                  <th className="py-3 px-4 whitespace-nowrap">Reviewer</th>
                  <th className="py-3 px-4 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((record) => {
                  const statusText =
                    record.approvalStatus === 'approved'
                      ? 'Approved'
                      : record.approvalStatus === 'returned_for_info'
                        ? 'Returned'
                        : 'Pending Review';
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {record.analysis.id}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {record.analysis.recommendedCategory.category}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 max-w-md">
                        <div className="line-clamp-2">
                          {record.analysis.incidentSummary.overview}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <PriorityBadge priority={record.approvedPriority} />
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700 whitespace-nowrap">
                        {statusText}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 whitespace-nowrap">
                        {record.reviewerName || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-right space-x-3">
                        <button
                          type="button"
                          onClick={() => handleCopySummary(record)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          {copiedId === record.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => onOpenDecision(record)}
                          className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
