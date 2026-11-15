import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { KnowledgeBaseRecord } from '../types/incident';
import { computeKbStats, filterKnowledgeBase } from '../lib/kb';
import { LevelText, PriorityBadge } from './PriorityTag';

interface KnowledgeBaseViewProps {
  records: KnowledgeBaseRecord[];
  onInspectRecord: (record: KnowledgeBaseRecord) => void;
}

const PRIORITY_FILTERS = ['All', 'P1', 'P2', 'P3', 'P4'] as const;

export function KnowledgeBaseView({
  records,
  onInspectRecord,
}: KnowledgeBaseViewProps) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState<string>('All');

  const stats = useMemo(() => computeKbStats(records), [records]);

  const filtered = useMemo(
    () => filterKnowledgeBase(records, query, selectedCategory, selectedPriority),
    [records, query, selectedCategory, selectedPriority],
  );

  const categoryOptions = useMemo(
    () => ['All', ...stats.categories.map((c) => c.name)],
    [stats.categories],
  );

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header & Summary Counts */}
      <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Incident Management Knowledge Base
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Historical incident repository, Major Incident criteria, escalation playbooks, and verified postmortem resolutions.
          </p>
        </div>
      </div>

      {/* 4-column Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-lg bg-white divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        <div className="p-4">
          <div className="text-xs text-slate-500">Total Historical Records</div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1">
            {stats.total}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Across {stats.categories.length} service domains
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">P1 Critical</div>
          <div className="text-2xl font-bold font-mono text-red-700 tabular-nums mt-1">
            {stats.byPriority.P1}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Immediate exec escalation
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">P2 High</div>
          <div className="text-2xl font-bold font-mono text-amber-700 tabular-nums mt-1">
            {stats.byPriority.P2}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Major incident team watch
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500">P3 / P4 Standard</div>
          <div className="text-2xl font-bold font-mono text-slate-900 tabular-nums mt-1">
            {stats.byPriority.P3 + stats.byPriority.P4}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Standard operational triage
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
              aria-hidden="true"
            />
            <label htmlFor="kb-search-input" className="sr-only">
              Search knowledge base
            </label>
            <input
              id="kb-search-input"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Incident ID, symptom, resolution, or SOP..."
              className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-700"
            />
          </div>

          <div
            className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start"
            role="group"
            aria-label="Filter by priority"
          >
            {PRIORITY_FILTERS.map((prio) => {
              const active = selectedPriority === prio;
              return (
                <button
                  key={prio}
                  type="button"
                  onClick={() => setSelectedPriority(prio)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {prio}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100"
          role="group"
          aria-label="Filter by service domain"
        >
          {categoryOptions.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* High-Density Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span className="tabular-nums">
            Showing <strong className="text-slate-900">{filtered.length}</strong> of{' '}
            <strong className="text-slate-900">{records.length}</strong> historical records
          </span>
          <span>Select any row to inspect full escalation SOP and resolution</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-900">
              No matching incident records found
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Adjust your search keywords or clear the domain and priority filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedCategory('All');
                setSelectedPriority('All');
              }}
              className="mt-4 px-3.5 py-2 text-xs font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-4 whitespace-nowrap">Incident ID</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Domain</th>
                  <th className="py-2.5 px-4">Symptom Description</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Impact</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Urgency</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Priority</th>
                  <th className="py-2.5 px-4 whitespace-nowrap text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filtered.map((record) => (
                  <tr
                    key={record.incidentId}
                    className="hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="py-2.5 px-4 font-mono text-xs font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {record.incidentId}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                      {record.category}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-700 max-w-md">
                      <div className="line-clamp-2">{record.description}</div>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <LevelText level={record.impact} />
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <LevelText level={record.urgency} />
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <PriorityBadge priority={record.priority} />
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => onInspectRecord(record)}
                        className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                      >
                        Inspect SOP
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
