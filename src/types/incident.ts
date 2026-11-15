export type ImpactUrgencyLevel = 'High' | 'Medium' | 'Low';
export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type MatrixMode = 'standard' | 'strict' | 'unavailable' | 'custom';

export type PriorityMatrixGrid = Record<
  ImpactUrgencyLevel,
  Record<ImpactUrgencyLevel, PriorityLevel>
>;

export interface PriorityMatrixConfig {
  id: MatrixMode;
  name: string;
  description: string;
  grid: PriorityMatrixGrid;
}

export interface KnowledgeBaseRecord {
  incidentId: string;
  category: string;
  description: string;
  impact: ImpactUrgencyLevel;
  urgency: ImpactUrgencyLevel;
  priority: PriorityLevel;
  majorIncidentCriteria: string;
  escalationProcedures: string;
  communicationStandards: string;
  resolution: string;
}

export interface KnowledgeBaseMatch {
  record: KnowledgeBaseRecord;
  score: number;
  matchedTerms: string[];
  domainMatched: boolean;
}

export interface IncidentAnalysisRequest {
  description: string;
  serviceHint?: string;
  environment?: string;
  reporterContext?: string;
  matrixMode: MatrixMode;
  customMatrix?: PriorityMatrixGrid;
  customMatrixLabel?: string;
}

export interface IncidentSummarySection {
  overview: string;
  confirmedFacts: string[];
  assumptions: string[];
}

export interface DimensionAssessment {
  level: ImpactUrgencyLevel;
  reasoning: string;
}

export interface PriorityAssessment {
  recommendedPriority: PriorityLevel;
  basis: 'supplied_matrix' | 'provisional';
  matrixLabel: string;
  reasoning: string;
}

export interface InvestigationStep {
  step: string;
  rationale: string;
  ownerHint: string;
}

export interface EscalationAssessment {
  recommended: boolean;
  targetTeams: string[];
  majorIncidentWatch: boolean;
  majorIncidentNote: string;
  reasoning: string;
  requiresHumanApproval: true;
}

export interface ExecutiveCommunication {
  subject: string;
  audience: string;
  cadenceSuggestion: string;
  message: string;
}

export interface IncidentAnalysis {
  id: string;
  analyzedAt: string;
  inputDescription: string;
  serviceHint?: string;
  environment?: string;
  reporterContext?: string;
  incidentSummary: IncidentSummarySection;
  recommendedCategory: {
    category: string;
    reasoning: string;
  };
  recommendedImpact: DimensionAssessment;
  recommendedUrgency: DimensionAssessment;
  recommendedPriority: PriorityAssessment;
  potentialBusinessImpact: string[];
  potentiallyAffectedServices: string[];
  recommendedInvestigationSteps: InvestigationStep[];
  escalationRecommendation: EscalationAssessment;
  missingInformation: string[];
  executiveCommunication: ExecutiveCommunication;
  matchedRecordIds: string[];
  analysisSource: 'gemini' | 'sample_record';
}

export type ApprovalStatus = 'pending_review' | 'approved' | 'returned_for_info';

export interface TriageDecisionRecord {
  id: string;
  analysis: IncidentAnalysis;
  approvalStatus: ApprovalStatus;
  approvedPriority: PriorityLevel;
  majorIncidentApproved: boolean;
  escalationApproved: boolean;
  reviewerName: string;
  reviewerNotes: string;
  reviewedAt?: string;
}

export interface SamplePreset {
  id: string;
  label: string;
  serviceHint: string;
  environment: string;
  reporterContext: string;
  description: string;
}
