import type {
  ImpactUrgencyLevel,
  KnowledgeBaseMatch,
  KnowledgeBaseRecord,
  PriorityLevel,
} from '../types/incident';

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'across', 'over',
  'under', 'due', 'during', 'causing', 'cause', 'after', 'before', 'without',
  'users', 'user', 'system', 'service', 'services', 'issue', 'error', 'errors',
  'report', 'reported', 'being', 'have', 'has', 'are', 'was', 'were', 'not',
  'can', 'cannot', 'unable', 'all', 'some', 'more', 'than', 'minutes', 'hours',
]);

/**
 * Parses an RFC-4180 CSV string into rows of string cells, handling quoted commas,
 * escaped quotes (""), and CRLF/LF line endings.
 */
export function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          currentCell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      currentRow.push(currentCell);
      currentCell = '';
    } else if (ch === '\n') {
      currentRow.push(currentCell);
      rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }

  return rows;
}

function normalizeLevel(value: string): ImpactUrgencyLevel {
  const clean = value.trim().toLowerCase();
  if (clean === 'high') return 'High';
  if (clean === 'medium') return 'Medium';
  return 'Low';
}

function normalizePriority(value: string): PriorityLevel {
  const clean = value.trim().toUpperCase();
  if (clean === 'P1' || clean === 'P2' || clean === 'P3' || clean === 'P4') {
    return clean;
  }
  return 'P3';
}

export interface ParsedKnowledgeBase {
  title: string;
  subtitle: string;
  records: KnowledgeBaseRecord[];
}

export function parseKnowledgeBaseCsv(csvText: string): ParsedKnowledgeBase {
  const rows = parseCsvRows(csvText);
  const title = rows[0]?.[0]?.trim() || 'Incident Management Knowledge Base';
  const subtitle =
    rows[1]?.[0]?.trim() || 'ITIL v4 Operational Triage Playbook & Historical Incident Repository';

  const headerIndex = rows.findIndex(
    (row) => row[0]?.trim() === 'Incident ID' && row[1]?.trim() === 'Incident Category',
  );

  if (headerIndex === -1) {
    return { title, subtitle, records: [] };
  }

  const records: KnowledgeBaseRecord[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const incidentId = row[0]?.trim();
    if (!incidentId || !incidentId.startsWith('INC-')) continue;

    records.push({
      incidentId,
      category: row[1]?.trim() || 'General',
      description: row[2]?.trim() || '',
      impact: normalizeLevel(row[3] || 'Medium'),
      urgency: normalizeLevel(row[4] || 'Medium'),
      priority: normalizePriority(row[5] || 'P3'),
      majorIncidentCriteria: row[6]?.trim() || 'None documented.',
      escalationProcedures: row[7]?.trim() || '',
      communicationStandards: row[8]?.trim() || '',
      resolution: row[9]?.trim() || '',
    });
  }

  return { title, subtitle, records };
}

export function tokenizeOperationalText(input: string): string[] {
  const raw = input
    .toLowerCase()
    .replace(/[^a-z0-9./_-]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^[./_-]+|[./_-]+$/g, ''))
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));

  return Array.from(new Set(raw));
}

export function findRelevantIncidents(
  description: string,
  records: KnowledgeBaseRecord[],
  options: { categoryHint?: string; limit?: number } = {},
): KnowledgeBaseMatch[] {
  const limit = options.limit ?? 5;
  const queryTokens = tokenizeOperationalText(description);
  const hint = options.categoryHint?.trim().toLowerCase() || '';

  if (queryTokens.length === 0 && !hint) {
    return [];
  }

  const scored: KnowledgeBaseMatch[] = records.map((record) => {
    const searchable = [
      record.category,
      record.description,
      record.majorIncidentCriteria,
      record.escalationProcedures,
      record.resolution,
    ]
      .join(' ')
      .toLowerCase();

    const matchedTerms: string[] = [];
    let score = 0;

    for (const token of queryTokens) {
      if (searchable.includes(token)) {
        matchedTerms.push(token);
        score += record.description.toLowerCase().includes(token) ? 3 : 1.5;
      }
    }

    const domainMatched =
      Boolean(hint) && record.category.toLowerCase() === hint;
    if (domainMatched) {
      score += 4;
    }

    // Bonus when category name appears naturally in description
    if (description.toLowerCase().includes(record.category.toLowerCase())) {
      score += 2;
    }

    return {
      record,
      score,
      matchedTerms: matchedTerms.slice(0, 6),
      domainMatched,
    };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.record.incidentId.localeCompare(b.record.incidentId))
    .slice(0, limit);
}

export function filterKnowledgeBase(
  records: KnowledgeBaseRecord[],
  query: string,
  category: string,
  priority: string,
): KnowledgeBaseRecord[] {
  const normalizedQuery = query.trim().toLowerCase();
  return records.filter((record) => {
    if (category !== 'All' && record.category !== category) {
      return false;
    }
    if (priority !== 'All' && record.priority !== priority) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const haystack = [
      record.incidentId,
      record.category,
      record.description,
      record.majorIncidentCriteria,
      record.escalationProcedures,
      record.communicationStandards,
      record.resolution,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export interface KnowledgeBaseStats {
  total: number;
  byPriority: Record<PriorityLevel, number>;
  categories: Array<{ name: string; count: number }>;
}

export function computeKbStats(records: KnowledgeBaseRecord[]): KnowledgeBaseStats {
  const byPriority: Record<PriorityLevel, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  const categoryMap = new Map<string, number>();

  for (const record of records) {
    byPriority[record.priority] += 1;
    categoryMap.set(record.category, (categoryMap.get(record.category) ?? 0) + 1);
  }

  const categories = Array.from(categoryMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    total: records.length,
    byPriority,
    categories,
  };
}
