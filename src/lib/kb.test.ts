import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  computeKbStats,
  filterKnowledgeBase,
  findRelevantIncidents,
  parseCsvRows,
  parseKnowledgeBaseCsv,
} from './kb';

test('parseCsvRows handles quoted commas and escaped quotes', () => {
  const raw = 'INC-1003,Application,"Queue stalled, backlog > 45,000 ""pending"" jobs",Medium,Medium,P3';
  const rows = parseCsvRows(raw);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][0], 'INC-1003');
  assert.equal(rows[0][2], 'Queue stalled, backlog > 45,000 "pending" jobs');
  assert.equal(rows[0][5], 'P3');
});

test('parseKnowledgeBaseCsv parses all 56 historical records and exact priority totals from the supplied CSV', () => {
  const csvPath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/Incident_Management_Knowledgebase_Prototype_6ef3ba14',
  );
  const csvText = fs.readFileSync(csvPath, 'utf-8');
  const parsed = parseKnowledgeBaseCsv(csvText);

  assert.equal(parsed.records.length, 56);
  const stats = computeKbStats(parsed.records);
  assert.equal(stats.total, 56);
  assert.equal(stats.byPriority.P1, 13);
  assert.equal(stats.byPriority.P2, 18);
  assert.equal(stats.byPriority.P3 + stats.byPriority.P4, 25);
  assert.equal(stats.categories.length, 8);
});

test('findRelevantIncidents ranks domain and symptom matches accurately', () => {
  const csvPath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/Incident_Management_Knowledgebase_Prototype_6ef3ba14',
  );
  const parsed = parseKnowledgeBaseCsv(fs.readFileSync(csvPath, 'utf-8'));

  const matches = findRelevantIncidents(
    'Okta SSO SAML signing certificate failure blocking employee cloud login across apps',
    parsed.records,
    { categoryHint: 'Authentication', limit: 3 },
  );

  assert.ok(matches.length >= 1);
  assert.equal(matches[0].record.incidentId, 'INC-1022');
});

test('filterKnowledgeBase filters by category, priority, and text query', () => {
  const csvPath = path.resolve(
    process.cwd(),
    'public/assets/aistudio/Incident_Management_Knowledgebase_Prototype_6ef3ba14',
  );
  const parsed = parseKnowledgeBaseCsv(fs.readFileSync(csvPath, 'utf-8'));

  const p1Security = filterKnowledgeBase(parsed.records, '', 'Security', 'P1');
  assert.equal(p1Security.length, 2);
  assert.deepEqual(
    p1Security.map((r) => r.incidentId),
    ['INC-1050', 'INC-1051'],
  );

  const cephOnly = filterKnowledgeBase(parsed.records, 'Ceph', 'All', 'All');
  assert.equal(cephOnly.length, 1);
  assert.equal(cephOnly[0].incidentId, 'INC-1043');
});
