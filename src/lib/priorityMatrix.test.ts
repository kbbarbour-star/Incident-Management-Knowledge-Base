import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyHumanReviewDecision,
  calculateMatrixPriority,
  createInitialDecisionRecord,
  resolveActiveMatrix,
  validateIncidentInput,
} from './priorityMatrix';
import type { IncidentAnalysis } from '../types/incident';

test('calculateMatrixPriority resolves supplied standard matrix and provisional mode accurately', () => {
  const standard = resolveActiveMatrix('standard');
  assert.ok(standard);

  const p1 = calculateMatrixPriority('High', 'High', standard);
  assert.equal(p1.priority, 'P1');
  assert.equal(p1.basis, 'supplied_matrix');

  const p2 = calculateMatrixPriority('High', 'Medium', standard);
  assert.equal(p2.priority, 'P2');

  const strict = resolveActiveMatrix('strict');
  assert.equal(calculateMatrixPriority('High', 'Medium', strict).priority, 'P1');

  const unavailable = resolveActiveMatrix('unavailable');
  assert.equal(unavailable, null);

  const provisional = calculateMatrixPriority('High', 'Medium', unavailable);
  assert.equal(provisional.priority, 'P2');
  assert.equal(provisional.basis, 'provisional');
  assert.match(provisional.reasoning, /Provisional P2 recommendation/i);
});

test('validateIncidentInput rejects empty and overly brief descriptions', () => {
  assert.equal(validateIncidentInput({ description: '' }).valid, false);
  assert.equal(validateIncidentInput({ description: '   ' }).valid, false);
  assert.equal(validateIncidentInput({ description: 'broken' }).valid, false);
  assert.equal(
    validateIncidentInput({
      description: 'Customer checkout returning HTTP 500 errors across EU region.',
    }).valid,
    true,
  );
});

test('human review gate never auto-declares major incident and requires reviewer identity', () => {
  const mockAnalysis: IncidentAnalysis = {
    id: 'TEST-1',
    analyzedAt: '2026-11-14T17:00:00Z',
    inputDescription: 'Checkout failures across EU region.',
    incidentSummary: {
      overview: 'Checkout failures reported.',
      confirmedFacts: ['HTTP 500 errors reported on checkout.'],
      assumptions: ['Payment gateway capacity may be constrained.'],
    },
    recommendedCategory: { category: 'Application', reasoning: 'Checkout service symptom.' },
    recommendedImpact: { level: 'High', reasoning: 'Revenue-critical path.' },
    recommendedUrgency: { level: 'High', reasoning: 'Active customer errors.' },
    recommendedPriority: {
      recommendedPriority: 'P1',
      basis: 'supplied_matrix',
      matrixLabel: 'Standard',
      reasoning: 'High × High maps to P1.',
    },
    potentialBusinessImpact: ['Checkout conversion drop'],
    potentiallyAffectedServices: ['Customer Checkout Service'],
    recommendedInvestigationSteps: [
      { step: 'Inspect checkout thread pool', rationale: 'Verify worker exhaustion', ownerHint: 'SRE' },
    ],
    escalationRecommendation: {
      recommended: true,
      targetTeams: ['Tier 3 App Support', 'On-Call Incident Commander'],
      majorIncidentWatch: true,
      majorIncidentNote: 'Matches INC-1001 major incident threshold criteria pending verification.',
      reasoning: 'Potential customer transaction failure > 10%.',
      requiresHumanApproval: true,
    },
    missingInformation: ['Exact error rate percentage'],
    executiveCommunication: {
      subject: 'Incident Advisory: Customer Checkout Degradation',
      audience: 'Executive Leadership & Operations',
      cadenceSuggestion: 'Every 20 minutes until mitigated',
      message: 'Engineering teams are investigating elevated checkout errors.',
    },
    matchedRecordIds: ['INC-1001'],
    analysisSource: 'sample_record',
  };

  const initial = createInitialDecisionRecord(mockAnalysis);
  assert.equal(initial.approvalStatus, 'pending_review');
  assert.equal(initial.majorIncidentApproved, false);
  assert.equal(initial.escalationApproved, false);

  const missingReviewer = applyHumanReviewDecision(initial, {
    approvalStatus: 'approved',
    approvedPriority: 'P1',
    majorIncidentApproved: true,
    escalationApproved: true,
    reviewerName: '   ',
    reviewerNotes: 'Confirmed',
  });
  assert.equal(missingReviewer.ok, false);

  const approved = applyHumanReviewDecision(
    initial,
    {
      approvalStatus: 'approved',
      approvedPriority: 'P1',
      majorIncidentApproved: true,
      escalationApproved: true,
      reviewerName: 'M. Vance (Incident Manager)',
      reviewerNotes: 'Verified > 12% checkout 5xx rate in Datadog.',
    },
    '2026-11-14T17:05:00Z',
  );
  assert.equal(approved.ok, true);
  if (approved.ok) {
    assert.equal(approved.record.approvalStatus, 'approved');
    assert.equal(approved.record.majorIncidentApproved, true);
    assert.equal(approved.record.reviewedAt, '2026-11-14T17:05:00Z');
  }
});
