export type WorkspaceTab = 'triage' | 'kb' | 'matrix' | 'decisions';

interface TopBarProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onNewIncident: () => void;
  decisionCount: number;
}

const NAV_ITEMS: Array<{ id: WorkspaceTab; label: string }> = [
  { id: 'triage', label: 'Triage Workbench' },
  { id: 'kb', label: 'Knowledge Base' },
  { id: 'matrix', label: 'Priority Matrix' },
  { id: 'decisions', label: 'Decision Log' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onNewIncident,
  decisionCount,
}: TopBarProps) {
  return (
    <header className="bg-white border-b border-slate-200 md:sticky md:top-0 z-30">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#triage"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('triage');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          SentinelOps
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary workspace navigation"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            const displayLabel =
              item.id === 'decisions' && decisionCount > 0
                ? `${item.label} (${decisionCount})`
                : item.label;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {displayLabel}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewIncident}
            className="px-3.5 py-2 text-xs sm:text-sm font-medium text-white bg-blue-700 rounded-md hover:bg-blue-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            New Incident
          </button>
        </div>
      </div>

      {/* Mobile navigation strip */}
      <nav
        aria-label="Mobile workspace navigation"
        className="md:hidden border-t border-slate-100 px-4 flex items-center justify-between gap-2 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          const mobileLabel =
            item.id === 'triage'
              ? 'Workbench'
              : item.id === 'kb'
                ? 'Knowledge'
                : item.id === 'matrix'
                  ? 'Matrix'
                  : decisionCount > 0
                    ? `Decisions (${decisionCount})`
                    : 'Decisions';
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`py-2 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-700 text-slate-900'
                  : 'border-transparent text-slate-600'
              }`}
            >
              {mobileLabel}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
