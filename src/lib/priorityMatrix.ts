import type {
  ApprovalStatus,
  ImpactUrgencyLevel,
  IncidentAnalysis,
  MatrixMode,
  PriorityLevel,
  PriorityMatrixConfig,
  PriorityMatrixGrid,
  TriageDecisionRecord,
} from '../types/incident';

export const IMPACT_LEVELS: ImpactUrgencyLevel[] = ['High', 'Medium', 'Low'];
export const URGENCY_LEVELS: ImpactUrgencyLevel[] = ['High', 'Medium', 'Low'];

export const STANDARD_MATRIX_GRID: PriorityMatrixGrid = {
  High: { High: 'P1', Medium: 'P2', Low: 'P3' },
  Medium: { High: 'P2', Medium: 'P3', Low: 'P3' },
  Low: { High: 'P3', Medium: 'P4', Low: 'P4' },
};

export const STRICT_MATRIX_GRID: PriorityMatrixGrid = {
  High: { High: 'P1', Medium: 'P1', Low: 'P2' },
  Medium: { High: 'P2', Medium: 'P2', Low: 'P3' },
  Low: { High: 'P3', Medium: 'P3', Low: 'P4' },
};

export const PRIORITY_MATRICES: Record<Exclude<MatrixMode, 'unavailable' | 'custom'>, PriorityMatrixConfig> = {
  standard: {
    id: 'standard',
    name: 'ITIL 4 Standard Enterprise Matrix (KB-Aligned)',
    description:
      'Calibrated against the 56 historical incident records: High×High maps to P1 Critical; High×Medium and Medium×High map to P2 High; Medium×Medium/Low map to P3; Low×Medium/Low map to P4.',
    grid: STANDARD_MATRIX_GRID,
  },
  strict: {
    id: 'strict',
    name: 'High-Sensitivity Peak Operations Matrix',
    description:
      'Used during peak commercial events or change freezes where High Impact with Medium Urgency escalates immediately to P1.',
    grid: STRICT_MATRIX_GRID,
  },
};

export interface PriorityEvaluationResult {
  priority: PriorityLevel;
  basis: 'supplied_matrix' | 'provisional';
  matrixLabel: string;
  reasoning: string;
}

export function resolveActiveMatrix(
  mode: MatrixMode,
  customGrid?: PriorityMatrixGrid,
  customLabel?: string,
): { grid: PriorityMatrixGrid; label: string } | null {
  if (mode === 'unavailable') {
    return null;
  }
  if (mode === 'custom' && customGrid) {
    return {
      grid: customGrid,
      label: customLabel?.trim() || 'Custom Supplied Priority Matrix',
    };
  }
  const preset = mode === 'strict' ? PRIORITY_MATRICES.strict : PRIORITY_MATRICES.standard;
  return {
    grid: preset.grid,
    label: preset.name,
  };
}

export function calculateMatrixPriority(
  impact: ImpactUrgencyLevel,
  urgency: ImpactUrgencyLevel,
  matrix: { grid: PriorityMatrixGrid; label: string } | null,
): PriorityEvaluationResult {
  if (matrix) {
    const priority = matrix.grid[impact][urgency];
    return {
      priority,
      basis: 'supplied_matrix',
      matrixLabel: matrix.label,
      reasoning: `Determined directly from "${matrix.label}" at Impact=${impact} × Urgency=${urgency} -> ${priority}. Subject to Incident Manager approval.`,
    };
  }

  // Provisional ITIL 4 fallback when no matrix is supplied
  const provisionalGrid = STANDARD_MATRIX_GRID;
  const priority = provisionalGrid[impact][urgency];
  return {
    priority,
    basis: 'provisional',
    matrixLabel: 'No Priority Matrix Supplied (Provisional ITIL 4 Baseline)',
    reasoning: `No organizational priority matrix was supplied. Provisional ${priority} recommendation is derived from Impact=${impact} and Urgency=${urgency} using standard ITIL 4 triage alignment and requires Incident Manager confirmation against local SLA policy.`,
  };
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateIncidentInput(input: { description: string }): ValidationResult {
  const trimmed = input.description.trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'Enter an incident description or select a sample scenario before running triage analysis.',
    };
  }
  if (trimmed.length < 15) {
    return {
      valid: false,
      error: 'Incident description is too brief (minimum 15 characters) to evaluate impact, urgency, and affected services reliably.',
    };
  }
  return { valid: true };
}

export function createInitialDecisionRecord(analysis: IncidentAnalysis): TriageDecisionRecord {
  return {
    id: `DEC-${analysis.id}`,
    analysis,
    approvalStatus: 'pending_review',
    approvedPriority: analysis.recommendedPriority.recommendedPriority,
    majorIncidentApproved: false, // Never auto-declare major incident
    escalationApproved: false, // Requires explicit human authorization
    reviewerName: '',
    reviewerNotes: '',
  };
}

export function applyHumanReviewDecision(
  record: TriageDecisionRecord,
  decision: {
    approvalStatus: ApprovalStatus;
    approvedPriority: PriorityLevel;
    majorIncidentApproved: boolean;
    escalationApproved: boolean;
    reviewerName: string;
    reviewerNotes: string;
  },
  reviewedAt: string = new Date().toISOString(),
): { ok: true; record: TriageDecisionRecord } | { ok: false; error: string } {
  const reviewer = decision.reviewerName.trim();
  if (!reviewer) {
    return {
      ok: false,
      error: 'Authorized reviewer name or role is required to record an operational decision.',
    };
  }

  return {
    ok: true,
    record: {
      ...record,
      approvalStatus: decision.approvalStatus,
      approvedPriority: decision.approvedPriority,
      majorIncidentApproved: decision.majorIncidentApproved,
      escalationApproved: decision.escalationApproved,
      reviewerName: reviewer,
      reviewerNotes: decision.reviewerNotes.trim(),
      reviewedAt,
    },
  };
}

export const PRIORITY_SLA_GUIDE: Record<
  PriorityLevel,
  { label: string; responseTarget: string; cadence: string; escalationRule: string }
> = {
  P1: {
    label: 'P1 Critical',
    responseTarget: 'Immediate (<= 5 min)',
    cadence: 'Executive bridge & updates every 15–20 min',
    escalationRule: 'Tier 3 / Principal On-Call + Incident Commander; VP/Exec notification at 15 min (pending human approval).',
  },
  P2: {
    label: 'P2 High',
    responseTarget: 'Urgent (<= 15–20 min)',
    cadence: 'Operational channel updates every 30 min',
    escalationRule: 'Squad Lead + SRE On-Call; escalate to Director level if uncontained at 30–45 min.',
  },
  P3: {
    label: 'P3 Medium',
    responseTarget: 'Standard (<= 2 hours)',
    cadence: 'Ticketing & stakeholder updates every 90–120 min',
    escalationRule: 'Assign to owning Platform / Operations Team; escalate to Service Desk Manager if SLA approaches breach.',
  },
  P4: {
    label: 'P4 Low',
    responseTarget: 'Scheduled (Next business cycle)',
    cadence: 'Sprint / backlog tracking or direct requester update',
    escalationRule: 'Route to owning team backlog or Field Support; standard change window if needed.',
  },
};
