import { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import type {
  ApprovalStatus,
  PriorityLevel,
  TriageDecisionRecord,
} from '../types/incident';
import { applyHumanReviewDecision } from '../lib/priorityMatrix';
import { PriorityBadge } from './PriorityTag';

interface HumanApprovalGateProps {
  decisionRecord: TriageDecisionRecord;
  onUpdateDecision: (updated: TriageDecisionRecord) => void;
}

const PRIORITIES: PriorityLevel[] = ['P1', 'P2', 'P3', 'P4'];

const STATUS_LABELS: Record<ApprovalStatus, { text: string; classes: string }> = {
  pending_review: {
    text: 'Pending Human Approval',
    classes: 'text-amber-800 bg-amber-50 border-amber-200',
  },
  approved: {
    text: 'Approved by Reviewer',
    classes: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  },
  returned_for_info: {
    text: 'Returned for Missing Information',
    classes: 'text-slate-800 bg-slate-100 border-slate-300',
  },
};

export function HumanApprovalGate({
  decisionRecord,
  onUpdateDecision,
}: HumanApprovalGateProps) {
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel>(
    decisionRecord.approvedPriority,
  );
  const [majorIncidentApproved, setMajorIncidentApproved] = useState<boolean>(
    decisionRecord.majorIncidentApproved,
  );
  const [escalationApproved, setEscalationApproved] = useState<boolean>(
    decisionRecord.escalationApproved,
  );
  const [reviewerName, setReviewerName] = useState<string>(
    decisionRecord.reviewerName,
  );
  const [reviewerNotes, setReviewerNotes] = useState<string>(
    decisionRecord.reviewerNotes,
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPriority(decisionRecord.approvedPriority);
    setMajorIncidentApproved(decisionRecord.majorIncidentApproved);
    setEscalationApproved(decisionRecord.escalationApproved);
    setReviewerName(decisionRecord.reviewerName);
    setReviewerNotes(decisionRecord.reviewerNotes);
    setValidationError(null);
  }, [decisionRecord]);

  const handleDecision = (status: ApprovalStatus) => {
    const result = applyHumanReviewDecision(decisionRecord, {
      approvalStatus: status,
      approvedPriority: selectedPriority,
      majorIncidentApproved,
      escalationApproved,
      reviewerName,
      reviewerNotes,
    });

    if (!result.ok) {
      setValidationError(result.error);
      return;
    }

    setValidationError(null);
    onUpdateDecision(result.record);
  };

  const statusMeta = STATUS_LABELS[decisionRecord.approvalStatus];

  return (
    <section
      aria-labelledby="human-approval-heading"
      className="bg-white border border-slate-200 rounded-lg p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0" aria-hidden="true" />
            <h3
              id="human-approval-heading"
              className="text-base font-semibold text-slate-900"
            >
              Human Governance & Approval Gate
            </h3>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Priority assignment, escalation dispatch, and Major Incident declarations require explicit authorization by an Incident Manager.
          </p>
        </div>

        <span
          data-testid="approval-status-label"
          className={`px-2.5 py-1 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${statusMeta.classes}`}
        >
          {statusMeta.text}
        </span>
      </div>

      {decisionRecord.approvalStatus === 'approved' && decisionRecord.reviewedAt && (
        <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-md flex flex-wrap items-center justify-between gap-3 text-sm text-emerald-900">
          <div>
            Authorized by <strong>{decisionRecord.reviewerName}</strong>
            {' · '}
            Priority <PriorityBadge priority={decisionRecord.approvedPriority} />
            {' · '}
            <span>
              Escalation: {decisionRecord.escalationApproved ? 'Authorized' : 'Held'}
            </span>
            {' · '}
            <span>
              Major Incident:{' '}
              {decisionRecord.majorIncidentApproved ? 'Declared' : 'Not Declared'}
            </span>
          </div>
          <span className="font-mono text-xs text-emerald-800 tabular-nums">
            {new Date(decisionRecord.reviewedAt).toLocaleString()}
          </span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-2">
            Authorized Incident Priority
          </label>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Select authorized priority">
            {PRIORITIES.map((prio) => {
              const active = selectedPriority === prio;
              return (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setSelectedPriority(prio)}
                  aria-pressed={active}
                  className={`py-2 px-3 text-xs font-mono font-semibold rounded-md border transition-colors cursor-pointer ${
                    active
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {prio}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label
            htmlFor="reviewer-name-input"
            className="block text-xs font-medium text-slate-700 mb-2"
          >
            Authorized Reviewer Name / Role
          </label>
          <input
            id="reviewer-name-input"
            type="text"
            value={reviewerName}
            onChange={(e) => {
              setReviewerName(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g., Jordan Reyes, On-Call Incident Manager"
            className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-md bg-slate-50 cursor-pointer hover:bg-slate-100/70 transition-colors">
          <input
            type="checkbox"
            checked={escalationApproved}
            onChange={(e) => setEscalationApproved(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-700"
          />
          <span className="text-sm text-slate-800">
            <span className="font-medium block">Authorize Escalation Dispatch</span>
            <span className="text-xs text-slate-600">
              Approve paging recommended target response teams.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-md bg-slate-50 cursor-pointer hover:bg-slate-100/70 transition-colors">
          <input
            type="checkbox"
            checked={majorIncidentApproved}
            onChange={(e) => setMajorIncidentApproved(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-red-700 focus:ring-red-700"
          />
          <span className="text-sm text-slate-800">
            <span className="font-medium block">Declare Major Incident (MIM)</span>
            <span className="text-xs text-slate-600">
              Never auto-declared; check only after verifying Major Incident criteria.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4">
        <label
          htmlFor="reviewer-notes-input"
          className="block text-xs font-medium text-slate-700 mb-1.5"
        >
          Reviewer Rationale & Verification Notes
        </label>
        <textarea
          id="reviewer-notes-input"
          rows={2}
          value={reviewerNotes}
          onChange={(e) => setReviewerNotes(e.target.value)}
          placeholder="Document evidence checked, SLA overrides, or missing data requested from Service Desk..."
          className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
        />
      </div>

      {validationError && (
        <div
          role="alert"
          className="mt-3 p-3 text-sm text-red-800 bg-red-50 border border-red-200 rounded-md flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{validationError}</span>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => handleDecision('returned_for_info')}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap cursor-pointer"
        >
          Return for Missing Info
        </button>
        <button
          type="button"
          onClick={() => handleDecision('approved')}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap cursor-pointer"
        >
          Approve Triage Decision
        </button>
      </div>
    </section>
  );
}
