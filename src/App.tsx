import { useEffect, useMemo, useState } from 'react';
import type {
  ImpactUrgencyLevel,
  IncidentAnalysis,
  KnowledgeBaseRecord,
  MatrixMode,
  PriorityLevel,
  PriorityMatrixGrid,
  SamplePreset,
  TriageDecisionRecord,
} from './types/incident';
import {
  createInitialDecisionRecord,
  STANDARD_MATRIX_GRID,
} from './lib/priorityMatrix';
import { INITIAL_SAMPLE_ANALYSIS, SAMPLE_PRESETS } from './data/sampleIncidents';
import { TopBar, type WorkspaceTab } from './components/TopBar';
import { TriageWorkbench } from './components/TriageWorkbench';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { PriorityMatrixView } from './components/PriorityMatrixView';
import { DecisionLogView } from './components/DecisionLogView';
import { KbRecordDrawer } from './components/KbRecordDrawer';

const DECISIONS_STORAGE_KEY = 'sentinelops_triage_decisions_v1';
const MATRIX_STORAGE_KEY = 'sentinelops_custom_matrix_v1';

function loadStoredDecisions(): TriageDecisionRecord[] {
  try {
    const raw = localStorage.getItem(DECISIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fallback to initial baseline record
  }
  return [createInitialDecisionRecord(INITIAL_SAMPLE_ANALYSIS)];
}

function loadStoredCustomMatrix(): PriorityMatrixGrid {
  try {
    const raw = localStorage.getItem(MATRIX_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as PriorityMatrixGrid;
    }
  } catch {
    // Fallback to default standard grid
  }
  return structuredClone(STANDARD_MATRIX_GRID);
}

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('triage');
  const [kbRecords, setKbRecords] = useState<KnowledgeBaseRecord[]>([]);
  const [kbLoadError, setKbLoadError] = useState<string | null>(null);
  const [inspectedRecord, setInspectedRecord] =
    useState<KnowledgeBaseRecord | null>(null);

  // Triage Intake State
  const [description, setDescription] = useState<string>(
    SAMPLE_PRESETS[0].description,
  );
  const [serviceHint, setServiceHint] = useState<string>(
    SAMPLE_PRESETS[0].serviceHint,
  );
  const [environment, setEnvironment] = useState<string>(
    SAMPLE_PRESETS[0].environment,
  );
  const [reporterContext, setReporterContext] = useState<string>(
    SAMPLE_PRESETS[0].reporterContext,
  );

  // Priority Matrix Configuration State
  const [matrixMode, setMatrixMode] = useState<MatrixMode>('standard');
  const [customMatrix, setCustomMatrix] = useState<PriorityMatrixGrid>(
    loadStoredCustomMatrix,
  );

  // Triage Decisions & Active Analysis State
  const [decisions, setDecisions] =
    useState<TriageDecisionRecord[]>(loadStoredDecisions);
  const [activeDecisionId, setActiveDecisionId] = useState<string | null>(
    () => decisions[0]?.id ?? null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/knowledge-base')
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load knowledge base (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && Array.isArray(data.records)) {
          setKbRecords(data.records);
          setKbLoadError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setKbLoadError(
            err instanceof Error ? err.message : 'Unable to fetch knowledge base.',
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DECISIONS_STORAGE_KEY, JSON.stringify(decisions));
    } catch {
      // Ignore storage quota errors
    }
  }, [decisions]);

  useEffect(() => {
    try {
      localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(customMatrix));
    } catch {
      // Ignore storage quota errors
    }
  }, [customMatrix]);

  const categories = useMemo(() => {
    const unique = new Set(kbRecords.map((r) => r.category));
    return Array.from(unique).sort();
  }, [kbRecords]);

  const activeDecision = useMemo(() => {
    if (!activeDecisionId) return null;
    return decisions.find((d) => d.id === activeDecisionId) ?? null;
  }, [decisions, activeDecisionId]);

  const handleNewIncident = () => {
    setActiveTab('triage');
    setDescription('');
    setServiceHint('Auto');
    setEnvironment('');
    setReporterContext('');
    setAnalysisError(null);
    setActiveDecisionId(null);
    setTimeout(() => {
      document.getElementById('incident-description-input')?.focus();
    }, 50);
  };

  const handleLoadPreset = (preset: SamplePreset) => {
    setDescription(preset.description);
    setServiceHint(preset.serviceHint);
    setEnvironment(preset.environment);
    setReporterContext(preset.reporterContext);
    setAnalysisError(null);
  };

  const handleLoadKbRecordIntoTriage = (record: KnowledgeBaseRecord) => {
    setActiveTab('triage');
    setDescription(record.description);
    setServiceHint(record.category);
    setEnvironment('Production (Simulated from Historical Record)');
    setReporterContext(`Historical Benchmark ${record.incidentId}`);
    setAnalysisError(null);
  };

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          serviceHint,
          environment,
          reporterContext,
          matrixMode,
          customMatrix: matrixMode === 'custom' ? customMatrix : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Analysis failed with status ${response.status}`);
      }

      const analysis = data.analysis as IncidentAnalysis;
      const newDecision = createInitialDecisionRecord(analysis);
      setDecisions((prev) => [newDecision, ...prev]);
      setActiveDecisionId(newDecision.id);
    } catch (err) {
      setAnalysisError(
        err instanceof Error ? err.message : 'Unable to complete incident analysis.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateDecision = (updated: TriageDecisionRecord) => {
    setDecisions((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
    setActiveDecisionId(updated.id);
  };

  const handleChangeCustomCell = (
    impact: ImpactUrgencyLevel,
    urgency: ImpactUrgencyLevel,
    priority: PriorityLevel,
  ) => {
    setCustomMatrix((prev) => ({
      ...prev,
      [impact]: {
        ...prev[impact],
        [urgency]: priority,
      },
    }));
  };

  const handleOpenDecision = (record: TriageDecisionRecord) => {
    setActiveDecisionId(record.id);
    setDescription(record.analysis.inputDescription);
    setServiceHint(record.analysis.serviceHint || 'Auto');
    setEnvironment(record.analysis.environment || '');
    setReporterContext(record.analysis.reporterContext || '');
    setAnalysisError(null);
    setActiveTab('triage');
  };

  const handleClearLog = () => {
    const baseline = createInitialDecisionRecord(INITIAL_SAMPLE_ANALYSIS);
    setDecisions([baseline]);
    setActiveDecisionId(baseline.id);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewIncident={handleNewIncident}
        decisionCount={decisions.length}
      />

      {kbLoadError && (
        <div
          role="alert"
          className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4"
        >
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
            {kbLoadError}
          </div>
        </div>
      )}

      <main className="flex-1">
        {activeTab === 'triage' && (
          <TriageWorkbench
            kbRecords={kbRecords}
            categories={categories}
            description={description}
            onChangeDescription={setDescription}
            serviceHint={serviceHint}
            onChangeServiceHint={setServiceHint}
            environment={environment}
            onChangeEnvironment={setEnvironment}
            reporterContext={reporterContext}
            onChangeReporterContext={setReporterContext}
            matrixMode={matrixMode}
            onChangeMatrixMode={setMatrixMode}
            customMatrix={customMatrix}
            activeDecision={activeDecision}
            isAnalyzing={isAnalyzing}
            analysisError={analysisError}
            onRunAnalysis={handleRunAnalysis}
            onResetIntake={handleNewIncident}
            onLoadPreset={handleLoadPreset}
            onUpdateDecision={handleUpdateDecision}
            onInspectKbRecord={setInspectedRecord}
            onNavigateToMatrix={() => setActiveTab('matrix')}
          />
        )}

        {activeTab === 'kb' && (
          <KnowledgeBaseView
            records={kbRecords}
            onInspectRecord={setInspectedRecord}
          />
        )}

        {activeTab === 'matrix' && (
          <PriorityMatrixView
            matrixMode={matrixMode}
            onChangeMatrixMode={setMatrixMode}
            customMatrix={customMatrix}
            onChangeCustomCell={handleChangeCustomCell}
            onReturnToTriage={() => setActiveTab('triage')}
          />
        )}

        {activeTab === 'decisions' && (
          <DecisionLogView
            decisions={decisions}
            onOpenDecision={handleOpenDecision}
            onClearLog={handleClearLog}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            SentinelOps ITIL 4 Incident Triage Decision-Support Workbench
          </span>
          <span>
            Operational decisions, escalations, and incident closures require authorized human review.
          </span>
        </div>
      </footer>

      <KbRecordDrawer
        record={inspectedRecord}
        onClose={() => setInspectedRecord(null)}
        onLoadIntoTriage={handleLoadKbRecordIntoTriage}
      />
    </div>
  );
}
