import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import {
  computeKbStats,
  findRelevantIncidents,
  parseKnowledgeBaseCsv,
} from './src/lib/kb';
import {
  calculateMatrixPriority,
  resolveActiveMatrix,
  validateIncidentInput,
} from './src/lib/priorityMatrix';
import type {
  ImpactUrgencyLevel,
  IncidentAnalysis,
  IncidentAnalysisRequest,
  KnowledgeBaseRecord,
} from './src/types/incident';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KB_CSV_PATH = path.resolve(
  __dirname,
  'public/assets/aistudio/Incident_Management_Knowledgebase_Prototype_6ef3ba14',
);

function loadKnowledgeBase(): {
  title: string;
  subtitle: string;
  records: KnowledgeBaseRecord[];
} {
  const csvText = fs.readFileSync(KB_CSV_PATH, 'utf-8');
  return parseKnowledgeBaseCsv(csvText);
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured in the server environment. Configure it in Settings > Secrets.',
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ITIL_SYSTEM_INSTRUCTION = `You are an experienced ITIL 4 Incident Management Analyst supporting an enterprise IT Operations team.
Your objective is to analyze incident descriptions and provide structured, evidence-based recommendations to assist Incident Managers.

CORE ANALYSIS RULES (STRICT):
1. Distinguish confirmed facts from assumptions explicitly.
2. Never invent missing incident information, metrics, error rates, timestamps, or root causes that were not stated.
3. Identify information gaps clearly in missingInformation.
4. Explain the reasoning behind category, impact, urgency, priority, and escalation recommendations.
5. Use the supplied historical records and procedures when relevant, citing exact Incident IDs (e.g., INC-1001) ONLY from the supplied historical context.
6. Do not claim a root cause is confirmed unless supporting evidence is provided in the incident report.
7. Do not automatically declare a major incident. You may flag majorIncidentWatch=true if symptoms resemble Major Incident Criteria, while explicitly stating human authorization is required.
8. Assess Impact and Urgency separately before priority evaluation.
9. If a Priority Matrix is supplied, reference it; if the Priority Matrix is unavailable, explain that the priority recommendation is provisional.
10. Communication Style: Use concise, professional IT operations language. Avoid unnecessary technical jargon in executiveCommunication.message so non-technical leadership can act on it immediately.
11. Safety: You are a decision-support assistant. Never state that production changes were executed, incidents were closed, or escalations were authorized.`;

const ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    incidentSummary: {
      type: Type.OBJECT,
      properties: {
        overview: { type: Type.STRING },
        confirmedFacts: { type: Type.ARRAY, items: { type: Type.STRING } },
        assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['overview', 'confirmedFacts', 'assumptions'],
    },
    recommendedCategory: {
      type: Type.OBJECT,
      properties: {
        category: {
          type: Type.STRING,
          description:
            'Primary ITIL category (prefer matching one of: Application, Network, Database, Authentication, API, DNS, Storage, Security when applicable).',
        },
        reasoning: { type: Type.STRING },
      },
      required: ['category', 'reasoning'],
    },
    recommendedImpact: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
        reasoning: { type: Type.STRING },
      },
      required: ['level', 'reasoning'],
    },
    recommendedUrgency: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
        reasoning: { type: Type.STRING },
      },
      required: ['level', 'reasoning'],
    },
    priorityReasoning: {
      type: Type.STRING,
      description:
        'Explanation combining the separate impact and urgency evaluations and referencing the supplied priority matrix or provisional guidance.',
    },
    potentialBusinessImpact: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    potentiallyAffectedServices: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    recommendedInvestigationSteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          step: { type: Type.STRING },
          rationale: { type: Type.STRING },
          ownerHint: { type: Type.STRING },
        },
        required: ['step', 'rationale', 'ownerHint'],
      },
    },
    escalationRecommendation: {
      type: Type.OBJECT,
      properties: {
        recommended: { type: Type.BOOLEAN },
        targetTeams: { type: Type.ARRAY, items: { type: Type.STRING } },
        majorIncidentWatch: { type: Type.BOOLEAN },
        majorIncidentNote: { type: Type.STRING },
        reasoning: { type: Type.STRING },
      },
      required: [
        'recommended',
        'targetTeams',
        'majorIncidentWatch',
        'majorIncidentNote',
        'reasoning',
      ],
    },
    missingInformation: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    executiveCommunication: {
      type: Type.OBJECT,
      properties: {
        subject: { type: Type.STRING },
        audience: { type: Type.STRING },
        cadenceSuggestion: { type: Type.STRING },
        message: { type: Type.STRING },
      },
      required: ['subject', 'audience', 'cadenceSuggestion', 'message'],
    },
  },
  required: [
    'incidentSummary',
    'recommendedCategory',
    'recommendedImpact',
    'recommendedUrgency',
    'priorityReasoning',
    'potentialBusinessImpact',
    'potentiallyAffectedServices',
    'recommendedInvestigationSteps',
    'escalationRecommendation',
    'missingInformation',
    'executiveCommunication',
  ],
};

function normalizeImpactUrgency(value: string | undefined): ImpactUrgencyLevel {
  if (value === 'High' || value === 'Medium' || value === 'Low') return value;
  return 'Medium';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    try {
      const kb = loadKnowledgeBase();
      res.json({
        status: 'ok',
        kbCount: kb.records.length,
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  });

  app.get('/api/knowledge-base', (_req, res) => {
    try {
      const kb = loadKnowledgeBase();
      const stats = computeKbStats(kb.records);
      res.json({
        title: kb.title,
        subtitle: kb.subtitle,
        stats,
        records: kb.records,
      });
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load Knowledge Base CSV.',
      });
    }
  });

  app.post('/api/analyze', async (req, res) => {
    const body = (req.body || {}) as Partial<IncidentAnalysisRequest>;
    const description = typeof body.description === 'string' ? body.description : '';
    const validation = validateIncidentInput({ description });

    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    try {
      const kb = loadKnowledgeBase();
      const serviceHint =
        typeof body.serviceHint === 'string' && body.serviceHint !== 'Auto'
          ? body.serviceHint.trim()
          : undefined;
      const environment =
        typeof body.environment === 'string' && body.environment.trim()
          ? body.environment.trim()
          : undefined;
      const reporterContext =
        typeof body.reporterContext === 'string' && body.reporterContext.trim()
          ? body.reporterContext.trim()
          : undefined;

      const matrixMode = body.matrixMode ?? 'standard';
      const activeMatrix = resolveActiveMatrix(
        matrixMode,
        body.customMatrix,
        body.customMatrixLabel,
      );

      const matches = findRelevantIncidents(description, kb.records, {
        categoryHint: serviceHint,
        limit: 5,
      });

      const historicalContext =
        matches.length > 0
          ? matches
              .map(
                (m) =>
                  `- ${m.record.incidentId} [${m.record.category} | Impact=${m.record.impact}, Urgency=${m.record.urgency}, Priority=${m.record.priority}]\n  Symptoms: ${m.record.description}\n  Major Incident Criteria: ${m.record.majorIncidentCriteria}\n  Escalation Procedure: ${m.record.escalationProcedures}\n  Communication Standard: ${m.record.communicationStandards}\n  Historical Resolution: ${m.record.resolution}`,
              )
              .join('\n')
          : 'No closely matching historical incidents were found in the supplied 56-record repository.';

      const matrixContext = activeMatrix
        ? `Supplied Priority Matrix ("${activeMatrix.label}"):\n${JSON.stringify(activeMatrix.grid, null, 2)}`
        : 'Priority Matrix Status: UNAVAILABLE. No matrix was supplied; provide a provisional priority recommendation and explain the provisional reasoning.';

      const prompt = [
        'INCIDENT INTAKE RECORD:',
        `Description: ${description.trim()}`,
        serviceHint ? `Reported Service Domain Hint: ${serviceHint}` : 'Reported Service Domain Hint: Not specified',
        environment ? `Environment / Scope: ${environment}` : 'Environment / Scope: Not specified',
        reporterContext ? `Reporter / Alert Source: ${reporterContext}` : 'Reporter / Alert Source: Not specified',
        '',
        matrixContext,
        '',
        'SUPPLIED HISTORICAL KNOWLEDGE BASE MATCHES:',
        historicalContext,
      ].join('\n');

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: ITIL_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: ANALYSIS_RESPONSE_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        },
      });

      const rawText = response.text?.trim();
      if (!rawText) {
        throw new Error('Model returned an empty analysis payload.');
      }

      const parsed = JSON.parse(rawText);
      const impactLevel = normalizeImpactUrgency(parsed.recommendedImpact?.level);
      const urgencyLevel = normalizeImpactUrgency(parsed.recommendedUrgency?.level);
      const matrixEvaluation = calculateMatrixPriority(
        impactLevel,
        urgencyLevel,
        activeMatrix,
      );

      const analysis: IncidentAnalysis = {
        id: `TRIAGE-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`,
        analyzedAt: new Date().toISOString(),
        inputDescription: description.trim(),
        serviceHint,
        environment,
        reporterContext,
        incidentSummary: {
          overview: parsed.incidentSummary?.overview || '',
          confirmedFacts: Array.isArray(parsed.incidentSummary?.confirmedFacts)
            ? parsed.incidentSummary.confirmedFacts
            : [],
          assumptions: Array.isArray(parsed.incidentSummary?.assumptions)
            ? parsed.incidentSummary.assumptions
            : [],
        },
        recommendedCategory: {
          category: parsed.recommendedCategory?.category || serviceHint || 'Application',
          reasoning: parsed.recommendedCategory?.reasoning || '',
        },
        recommendedImpact: {
          level: impactLevel,
          reasoning: parsed.recommendedImpact?.reasoning || '',
        },
        recommendedUrgency: {
          level: urgencyLevel,
          reasoning: parsed.recommendedUrgency?.reasoning || '',
        },
        recommendedPriority: {
          recommendedPriority: matrixEvaluation.priority,
          basis: matrixEvaluation.basis,
          matrixLabel: matrixEvaluation.matrixLabel,
          reasoning: `${matrixEvaluation.reasoning} ${parsed.priorityReasoning || ''}`.trim(),
        },
        potentialBusinessImpact: Array.isArray(parsed.potentialBusinessImpact)
          ? parsed.potentialBusinessImpact
          : [],
        potentiallyAffectedServices: Array.isArray(parsed.potentiallyAffectedServices)
          ? parsed.potentiallyAffectedServices
          : [],
        recommendedInvestigationSteps: Array.isArray(
          parsed.recommendedInvestigationSteps,
        )
          ? parsed.recommendedInvestigationSteps
          : [],
        escalationRecommendation: {
          recommended: Boolean(parsed.escalationRecommendation?.recommended),
          targetTeams: Array.isArray(parsed.escalationRecommendation?.targetTeams)
            ? parsed.escalationRecommendation.targetTeams
            : [],
          majorIncidentWatch: Boolean(
            parsed.escalationRecommendation?.majorIncidentWatch,
          ),
          majorIncidentNote:
            parsed.escalationRecommendation?.majorIncidentNote ||
            'Requires human Incident Manager review before any Major Incident declaration.',
          reasoning: parsed.escalationRecommendation?.reasoning || '',
          requiresHumanApproval: true,
        },
        missingInformation: Array.isArray(parsed.missingInformation)
          ? parsed.missingInformation
          : [],
        executiveCommunication: {
          subject: parsed.executiveCommunication?.subject || 'Incident Status Update',
          audience:
            parsed.executiveCommunication?.audience || 'Executive & Operations Stakeholders',
          cadenceSuggestion:
            parsed.executiveCommunication?.cadenceSuggestion || 'Every 30 minutes',
          message: parsed.executiveCommunication?.message || '',
        },
        matchedRecordIds: matches.map((m) => m.record.incidentId),
        analysisSource: 'gemini',
      };

      res.json({ analysis, matches });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to analyze incident.';
      res.status(502).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`SentinelOps ITIL 4 Triage server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup failed:', err);
  process.exit(1);
});
