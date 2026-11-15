import { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  FileText,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import type {
  IncidentAnalysis,
  KnowledgeBaseRecord,
  MatrixMode,
  PriorityMatrixGrid,
  SamplePreset,
  TriageDecisionRecord,
} from '../types/incident';
import { findRelevantIncidents } from '../lib/kb';
import { validateIncidentInput } from '../lib/priorityMatrix';
import { SAMPLE_PRESETS } from '../data/sampleIncidents';
import { HumanApprovalGate } from './HumanApprovalGate';
import { LevelText, PriorityBadge } from './PriorityTag';

interface TriageWorkbenchProps {
  kbRecords: KnowledgeBaseRecord[];
  categories: string[];
  description: string;
  onChangeDescription: (val: string) => void;
  serviceHint: string;
  onChangeServiceHint: (val: string) => void;
  environment: string;
  onChangeEnvironment: (val: string) => void;
  reporterContext: string;
  onChangeReporterContext: (val: string) => void;
  matrixMode: MatrixMode;
  onChangeMatrixMode: (mode: MatrixMode) => void;
  customMatrix: PriorityMatrixGrid;
  activeDecision: TriageDecisionRecord | null;
  isAnalyzing: boolean;
  analysisError: string | null;
  onRunAnalysis: () => void;
  onResetIntake: () => void;
  onLoadPreset: (preset: SamplePreset) => void;
  onUpdateDecision: (updated: TriageDecisionRecord) => void;
  onInspectKbRecord: (record: KnowledgeBaseRecord) => void;
  onNavigateToMatrix: () => void;
}

export function TriageWorkbench({
  kbRecords,
  categories,
  description,
  onChangeDescription,
  serviceHint,
  onChangeServiceHint,
  environment,
  onChangeEnvironment,
  reporterContext,
  onChangeReporterContext,
  matrixMode,
  onChangeMatrixMode,
  activeDecision,
  isAnalyzing,
  analysisError,
  onRunAnalysis,
  onResetIntake,
  onLoadPreset,
  onUpdateDecision,
  onInspectKbRecord,
  onNavigateToMatrix,
}: TriageWorkbenchProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const [copiedExec, setCopiedExec] = useState(false);

  const liveMatches = useMemo(() => {
    return findRelevantIncidents(description, kbRecords, {
      categoryHint: serviceHint === 'Auto' ? undefined : serviceHint,
      limit: 4,
    });
  }, [description, kbRecords, serviceHint]);

  const recordLookup = useMemo(() => {
    const map = new Map<string, KnowledgeBaseRecord>();
    for (const rec of kbRecords) {
      map.set(rec.incidentId, rec);
    }
    return map;
  }, [kbRecords]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateIncidentInput({ description });
    if (!validation.valid) {
      setFormError(validation.error || 'Please provide a valid incident description.');
      return;
    }
    setFormError(null);
    onRunAnalysis();
  };

  const handleCopyExecutive = async (analysis: IncidentAnalysis) => {
    const payload = `Subject: ${analysis.executiveCommunication.subject}\nAudience: ${analysis.executiveCommunication.audience}\nCadence: ${analysis.executiveCommunication.cadenceSuggestion}\n\n${analysis.executiveCommunication.message}`;
    try {
      await navigator.clipboard.writeText(payload);
      setCopiedExec(true);
      setTimeout(() => setCopiedExec(false), 2000);
    } catch {
      setCopiedExec(false);
    }
  };

  const analysis = activeDecision?.analysis ?? null;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page Title & Operational Context */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            ITIL 4 Incident Triage Workbench
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Analyze incoming incident reports against the historical knowledge base and priority matrix. All recommendations remain advisory until authorized by a human reviewer.
          </p>
        </div>
        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="tabular-nums font-medium text-slate-700">
            {kbRecords.length} KB Records
          </span>
          <span aria-hidden="true">·</span>
          <span>8 Service Domains</span>
          <span aria-hidden="true">·</span>
          <span>Human Approval Required</span>
        </div>
      </div>

      {/* Main 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-[430px_1fr] gap-6 items-start">
        {/* Left Column: Incident Intake & Live KB Evidence */}
        <div className="space-y-5">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Incident Intake
              </h2>
              <button
                type="button"
                onClick={() => {
                  setFormError(null);
                  onResetIntake();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear Form</span>
              </button>
            </div>

            {/* Sample Scenario Loaders */}
            <div>
              <span className="block text-xs font-medium text-slate-600 mb-2">
                Load Sample Incident Report
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      onLoadPreset(preset);
                    }}
                    className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label
                htmlFor="incident-description-input"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Incident Description & Observed Symptoms
              </label>
              <textarea
                id="incident-description-input"
                rows={6}
                value={description}
                onChange={(e) => {
                  onChangeDescription(e.target.value);
                  if (formError) setFormError(null);
                }}
                placeholder="Describe observed symptoms, error codes, affected user groups, start time, and known scope..."
                className="w-full px-3 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-md leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-700 focus:border-blue-700"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="service-hint-select"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Service Domain Hint
                </label>
                <select
                  id="service-hint-select"
                  value={serviceHint}
                  onChange={(e) => onChangeServiceHint(e.target.value)}
                  className="w-full px-2.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
                >
                  <option value="Auto">Auto-classify from symptoms</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="environment-input"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Environment / Scope
                </label>
                <input
                  id="environment-input"
                  type="text"
                  value={environment}
                  onChange={(e) => onChangeEnvironment(e.target.value)}
                  placeholder="e.g., Production — US-East"
                  className="w-full px-2.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reporter-context-input"
                className="block text-xs font-medium text-slate-700 mb-1"
              >
                Reporter / Alert Source
              </label>
              <input
                id="reporter-context-input"
                type="text"
                value={reporterContext}
                onChange={(e) => onChangeReporterContext(e.target.value)}
                placeholder="e.g., PagerDuty APM Alert, Service Desk Escalation"
                className="w-full px-2.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="matrix-mode-select"
                  className="block text-xs font-medium text-slate-700"
                >
                  Priority Matrix Policy
                </label>
                <button
                  type="button"
                  onClick={onNavigateToMatrix}
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Configure Matrix
                </button>
              </div>
              <select
                id="matrix-mode-select"
                value={matrixMode}
                onChange={(e) => onChangeMatrixMode(e.target.value as MatrixMode)}
                className="w-full px-2.5 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
              >
                <option value="standard">
                  ITIL 4 Standard Enterprise Matrix (KB-Aligned)
                </option>
                <option value="strict">
                  High-Sensitivity Peak Operations Matrix
                </option>
                <option value="custom">Custom Supplied Matrix</option>
                <option value="unavailable">
                  Matrix Unavailable (Provisional Recommendation)
                </option>
              </select>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3 text-xs text-red-800 bg-red-50 border border-red-200 rounded-md flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{formError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAnalyzing}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 rounded-md transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  <span>Analyzing Against ITIL 4 Playbook...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Analyze Incident</span>
                </>
              )}
            </button>
          </form>

          {/* Live Historical KB Evidence Preview */}
          <section
            aria-label="Matching historical incidents"
            className="bg-white border border-slate-200 rounded-lg p-5"
          >
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                Historical KB Matches
              </h3>
              <span className="text-xs font-mono text-slate-500 tabular-nums">
                {liveMatches.length} matched
              </span>
            </div>

            {liveMatches.length === 0 ? (
              <p className="text-xs text-slate-500 pt-3 leading-relaxed">
                Enter symptom keywords (e.g., checkout, BGP, PostgreSQL, SAML, DNS, Ceph) to preview matching historical precedents from the 56-record repository.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 mt-1">
                {liveMatches.map(({ record }) => (
                  <li key={record.incidentId} className="py-3 first:pt-2 last:pb-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <span className="font-mono font-semibold text-slate-900">
                          {record.incidentId}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{record.category}</span>
                      </div>
                      <PriorityBadge priority={record.priority} />
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                      {record.description}
                    </p>
                    <button
                      type="button"
                      onClick={() => onInspectKbRecord(record)}
                      className="mt-1.5 text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                    >
                      View SOP & Resolution
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right Column: Structured 11-Section ITIL 4 Output & Approval Gate */}
        <div className="space-y-5">
          {analysisError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-sm text-red-900"
            >
              <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <div className="font-semibold">Analysis Request Failed</div>
                <p className="mt-0.5 text-red-800">{analysisError}</p>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div
              aria-live="polite"
              aria-label="Analyzing incident"
              className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 w-64 bg-slate-200 rounded animate-pulse" />
                <div className="h-5 w-24 bg-slate-200 rounded animate-pulse" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-slate-100">
                <div className="h-12 bg-slate-100 rounded animate-pulse" />
                <div className="h-12 bg-slate-100 rounded animate-pulse" />
                <div className="h-12 bg-slate-100 rounded animate-pulse" />
                <div className="h-12 bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
                <div className="h-20 w-full bg-slate-100 rounded animate-pulse" />
              </div>
              <div className="space-y-3">
                <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
                <div className="h-24 w-full bg-slate-100 rounded animate-pulse" />
              </div>
            </div>
          )}

          {!isAnalyzing && !analysis && (
            <div className="bg-white border border-slate-200 rounded-lg p-10 text-center">
              <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900">
                Ready for Incident Triage
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-md mx-auto">
                Enter an incident description or select a sample report on the left, then click Analyze Incident to generate the 11-section ITIL 4 assessment.
              </p>
            </div>
          )}

          {!isAnalyzing && analysis && activeDecision && (
            <>
              <article
                aria-label="ITIL 4 Analyst Recommendation"
                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
              >
                {/* Header & Safety Boundary */}
                <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                      <span className="font-mono font-semibold text-slate-900 tabular-nums">
                        {analysis.id}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        {new Date(analysis.analyzedAt).toLocaleString()}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {analysis.analysisSource === 'sample_record'
                          ? 'Seeded Baseline Case'
                          : 'Live Analyst Assessment'}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-slate-900">
                      ITIL 4 Structured Incident Recommendation
                    </h2>
                  </div>

                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-3 py-1.5">
                    Advisory Only · Requires Authorized Human Approval
                  </div>
                </div>

                {/* Sections 2, 3, 4, 5: Core Classification & Priority Matrix Strip */}
                <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/50">
                  <div className="p-4">
                    <div className="text-xs text-slate-500 mb-1">
                      02. Recommended Category
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      {analysis.recommendedCategory.category}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500 mb-1">
                      03. Recommended Impact
                    </div>
                    <LevelText level={analysis.recommendedImpact.level} />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500 mb-1">
                      04. Recommended Urgency
                    </div>
                    <LevelText level={analysis.recommendedUrgency.level} />
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-slate-500 mb-1">
                      05. Recommended Priority
                    </div>
                    <div className="flex items-center gap-2">
                      <PriorityBadge
                        priority={analysis.recommendedPriority.recommendedPriority}
                      />
                      <span className="text-xs text-slate-600">
                        {analysis.recommendedPriority.basis === 'provisional'
                          ? '(Provisional)'
                          : '(Matrix)'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-7">
                  {/* Section 1: Incident Summary (Confirmed Facts vs Assumptions) */}
                  <section>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2">
                      01. Incident Summary
                    </h3>
                    <p className="text-sm text-slate-700 leading-relaxed mb-4">
                      {analysis.incidentSummary.overview}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 mb-2">
                          Confirmed Facts (From Report)
                        </h4>
                        <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                          {analysis.incidentSummary.confirmedFacts.map((fact, idx) => (
                            <li key={idx}>{fact}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 mb-2">
                          Assumptions & Hypotheses (Unverified)
                        </h4>
                        {analysis.incidentSummary.assumptions.length === 0 ? (
                          <p className="text-sm text-slate-500">
                            No unverified assumptions flagged.
                          </p>
                        ) : (
                          <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                            {analysis.incidentSummary.assumptions.map((item, idx) => (
                              <li key={idx}>{item}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* Reasoning Breakdown for Category, Impact, Urgency, Priority */}
                  <section className="pt-5 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      Classification & Priority Reasoning
                    </h3>
                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                      <div className="pt-2 border-t border-slate-100">
                        <dt className="text-xs font-semibold text-slate-900 mb-1">
                          Category Rationale ({analysis.recommendedCategory.category})
                        </dt>
                        <dd className="text-slate-700 leading-relaxed">
                          {analysis.recommendedCategory.reasoning}
                        </dd>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <dt className="text-xs font-semibold text-slate-900 mb-1">
                          Priority Basis ({analysis.recommendedPriority.matrixLabel})
                        </dt>
                        <dd className="text-slate-700 leading-relaxed">
                          {analysis.recommendedPriority.reasoning}
                        </dd>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <dt className="text-xs font-semibold text-slate-900 mb-1">
                          Impact Evaluation ({analysis.recommendedImpact.level})
                        </dt>
                        <dd className="text-slate-700 leading-relaxed">
                          {analysis.recommendedImpact.reasoning}
                        </dd>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <dt className="text-xs font-semibold text-slate-900 mb-1">
                          Urgency Evaluation ({analysis.recommendedUrgency.level})
                        </dt>
                        <dd className="text-slate-700 leading-relaxed">
                          {analysis.recommendedUrgency.reasoning}
                        </dd>
                      </div>
                    </dl>
                  </section>

                  {/* Sections 6 & 7: Business Impact & Potentially Affected Services */}
                  <section className="pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">
                        06. Potential Business Impact
                      </h3>
                      <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                        {analysis.potentialBusinessImpact.map((impact, idx) => (
                          <li key={idx}>{impact}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">
                        07. Potentially Affected Services
                      </h3>
                      <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                        {analysis.potentiallyAffectedServices.map((svc, idx) => (
                          <li key={idx}>{svc}</li>
                        ))}
                      </ul>
                    </div>
                  </section>

                  {/* Section 8: Recommended Investigation Steps */}
                  <section className="pt-5 border-t border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      08. Recommended Investigation Steps
                    </h3>
                    <ol className="divide-y divide-slate-100 border-t border-slate-100">
                      {analysis.recommendedInvestigationSteps.map((item, idx) => (
                        <li key={idx} className="py-3 first:pt-2.5 last:pb-0">
                          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                            <span className="text-sm font-medium text-slate-900">
                              <span className="font-mono text-xs text-slate-500 mr-2 tabular-nums">
                                0{idx + 1}.
                              </span>
                              {item.step}
                            </span>
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              Suggested Owner: {item.ownerHint}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed pl-6">
                            {item.rationale}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>

                  {/* Section 9 & 10: Escalation Recommendation & Missing Information */}
                  <section className="pt-5 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">
                        09. Escalation Recommendation
                      </h3>
                      <div className="text-sm text-slate-700 space-y-2.5">
                        <div>
                          <span className="font-medium text-slate-900">
                            Recommended Action:{' '}
                          </span>
                          <span>
                            {analysis.escalationRecommendation.recommended
                              ? 'Escalate to specialized response teams (pending human authorization)'
                              : 'Manage within owning Tier 1/2 queue unless scope widens'}
                          </span>
                        </div>
                        {analysis.escalationRecommendation.targetTeams.length > 0 && (
                          <div>
                            <span className="font-medium text-slate-900">
                              Target Teams:{' '}
                            </span>
                            <span>
                              {analysis.escalationRecommendation.targetTeams.join(', ')}
                            </span>
                          </div>
                        )}
                        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                          <strong>Major Incident Guidance: </strong>
                          {analysis.escalationRecommendation.majorIncidentNote}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          {analysis.escalationRecommendation.reasoning}
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 mb-2">
                        10. Missing Information & Evidence Gaps
                      </h3>
                      {analysis.missingInformation.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No critical information gaps identified.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 text-sm text-slate-700 list-disc pl-4">
                          {analysis.missingInformation.map((gap, idx) => (
                            <li key={idx}>{gap}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </section>

                  {/* Section 11: Executive Communication */}
                  <section className="pt-5 border-t border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                      <h3 className="text-sm font-semibold text-slate-900">
                        11. Executive Communication Draft
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopyExecutive(analysis)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        {copiedExec ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                            <span>Copied Draft</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Copy Executive Update</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="border border-slate-200 rounded-md bg-slate-50 p-4 space-y-2">
                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
                        <span>
                          <strong>Subject:</strong> {analysis.executiveCommunication.subject}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <strong>Audience:</strong> {analysis.executiveCommunication.audience}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          <strong>Cadence:</strong>{' '}
                          {analysis.executiveCommunication.cadenceSuggestion}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed pt-2 border-t border-slate-200">
                        {analysis.executiveCommunication.message}
                      </p>
                    </div>
                  </section>

                  {/* Grounded Historical Record Citations */}
                  {analysis.matchedRecordIds.length > 0 && (
                    <section className="pt-5 border-t border-slate-200">
                      <h3 className="text-xs font-semibold text-slate-700 mb-2">
                        Cited Historical Records & Procedures
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {analysis.matchedRecordIds.map((incId) => {
                          const rec = recordLookup.get(incId);
                          return (
                            <button
                              key={incId}
                              type="button"
                              disabled={!rec}
                              onClick={() => rec && onInspectKbRecord(rec)}
                              className="px-3 py-1.5 text-xs font-mono font-medium text-slate-800 bg-white border border-slate-300 rounded-md hover:border-blue-700 hover:text-blue-700 transition-colors cursor-pointer"
                            >
                              {incId}
                              {rec ? ` · ${rec.category} (${rec.priority})` : ''}
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>
              </article>

              {/* Mandatory Human Approval Decision Gate */}
              <HumanApprovalGate
                decisionRecord={activeDecision}
                onUpdateDecision={onUpdateDecision}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
