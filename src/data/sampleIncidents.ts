import type { IncidentAnalysis, SamplePreset } from '../types/incident';

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'preset-checkout',
    label: 'Checkout HTTP 500 Surge',
    serviceHint: 'Application',
    environment: 'Production — Global',
    reporterContext: 'Automated APM Alert + 14 Support Escalations',
    description:
      'Multiple customers on the storefront are reporting HTTP 500 errors when submitting orders at checkout over the last 8 minutes. Support has received 14 tickets from US and EU shoppers. Payment gateway logs show elevated timeouts, though the exact percentage of failed transactions and whether mobile clients are affected is not yet confirmed.',
  },
  {
    id: 'preset-sso',
    label: 'Workforce SSO Login Rejections',
    serviceHint: 'Authentication',
    environment: 'Production — Enterprise IAM',
    reporterContext: 'IT Service Desk Spike',
    description:
      'IT Service Desk reports that staff across multiple departments are suddenly unable to sign into cloud tools via corporate Okta SSO, receiving SAML signature validation errors. Issue began around 16:45 UTC after no scheduled change window was announced. External customer login appears unaffected so far.',
  },
  {
    id: 'preset-replica-lag',
    label: 'Analytics Dashboard Stale Data',
    serviceHint: 'Database',
    environment: 'Production — BI & Reporting',
    reporterContext: 'Finance Ops Analyst',
    description:
      'Finance Operations reports that executive revenue and billing dashboards are showing data delayed by roughly 20 minutes compared to live order totals. Customer-facing checkout and order placement remain responsive. Database read replica metrics have not yet been attached to the ticket.',
  },
];

export const INITIAL_SAMPLE_ANALYSIS: IncidentAnalysis = {
  id: 'TRIAGE-2026-0841',
  analyzedAt: '2026-11-14T16:58:00Z',
  inputDescription: SAMPLE_PRESETS[0].description,
  serviceHint: SAMPLE_PRESETS[0].serviceHint,
  environment: SAMPLE_PRESETS[0].environment,
  reporterContext: SAMPLE_PRESETS[0].reporterContext,
  incidentSummary: {
    overview:
      'Storefront customers in US and EU regions are experiencing HTTP 500 errors during checkout submission over an 8-minute window, accompanied by payment gateway timeout telemetry and 14 support escalations.',
    confirmedFacts: [
      'HTTP 500 errors are occurring during checkout order submission over the last 8 minutes.',
      'Customer Support has logged 14 tickets spanning US and EU shoppers.',
      'Payment gateway logs show elevated timeout events.',
    ],
    assumptions: [
      'Checkout microservice worker thread exhaustion or payment gateway connection pool saturation may be contributing (unconfirmed without thread-pool metrics).',
      'Mobile app checkout flow impact is currently assumed possible but unverified.',
    ],
  },
  recommendedCategory: {
    category: 'Application',
    reasoning:
      'Primary failure occurs inside the customer checkout application transaction flow with payment gateway timeout symptoms, matching historical Application domain record INC-1001.',
  },
  recommendedImpact: {
    level: 'High',
    reasoning:
      'Disruption affects the primary revenue-generating customer checkout flow across multiple geographic regions (US and EU), risking immediate order abandonment.',
  },
  recommendedUrgency: {
    level: 'High',
    reasoning:
      'Errors are actively occurring in real time during live customer sessions with escalating support ticket volume (14 tickets in 8 minutes).',
  },
  recommendedPriority: {
    recommendedPriority: 'P1',
    basis: 'supplied_matrix',
    matrixLabel: 'ITIL 4 Standard Enterprise Matrix (KB-Aligned)',
    reasoning:
      'Determined from the supplied enterprise matrix at Impact = High × Urgency = High -> P1. Aligns with historical benchmark INC-1001, pending Incident Manager confirmation of transaction failure rate.',
  },
  potentialBusinessImpact: [
    'Direct revenue loss from interrupted customer order completions across US and EU storefronts.',
    'Elevated customer support contact volume and potential brand trust degradation if checkout remains unavailable.',
    'Risk of orphaned payment authorization states requiring downstream finance reconciliation.',
  ],
  potentiallyAffectedServices: [
    'Core Customer Checkout Service',
    'Payment Gateway Integration Tier',
    'Order Management & Fulfillment Pipeline',
    'Customer Support Ticketing & Status Channels',
  ],
  recommendedInvestigationSteps: [
    {
      step: 'Quantify exact checkout HTTP 500 failure rate (%) over the past 10 minutes across web and mobile clients.',
      rationale:
        'Determines whether failure rate exceeds the >10% for >5 minutes Major Incident threshold defined in INC-1001 without assuming severity.',
      ownerHint: 'SRE / Observability On-Call',
    },
    {
      step: 'Inspect checkout microservice worker thread pools and database/payment gateway connection pool saturation.',
      rationale:
        'Historical precedent INC-1001 traced HTTP 500 checkout surges to exhausted payment gateway worker threads and orphaned connection pools.',
      ownerHint: 'Tier 3 Checkout Application Support',
    },
    {
      step: 'Review recent deployments, feature flag toggles, and upstream payment processor status advisories in the last 60 minutes.',
      rationale:
        'Separates internal application regressions from external third-party payment gateway latency before attempting service restarts.',
      ownerHint: 'Release Engineering & Payments Squad',
    },
  ],
  escalationRecommendation: {
    recommended: true,
    targetTeams: [
      'Tier 3 Application Support',
      'On-Call Incident Commander',
      'Payments Infrastructure Squad',
    ],
    majorIncidentWatch: true,
    majorIncidentNote:
      'Candidate for Major Incident declaration under INC-1001 criteria (>10% customer transaction failure rate for >5 min). Do not declare automatically; await confirmed failure-rate telemetry and Incident Manager authorization.',
    reasoning:
      'Given potential revenue-critical outage across two regions and precedent INC-1001 escalation SLA (<=5 min to Tier 3 and Incident Commander), immediate reviewer escalation review is advised.',
    requiresHumanApproval: true,
  },
  missingInformation: [
    'Exact percentage of checkout requests failing with HTTP 500 vs. total checkout traffic.',
    'Whether mobile iOS/Android checkout paths are affected alongside web storefront.',
    'Correlation with any recent release, configuration change, or external payment processor incident.',
    'Specific error codes returned by the downstream payment gateway (e.g., 504 timeout vs. TLS/auth rejection).',
  ],
  executiveCommunication: {
    subject: 'Incident Advisory: Customer Checkout Errors Under Active Investigation',
    audience: 'Executive Leadership, Engineering VPs, & Customer Operations',
    cadenceSuggestion: 'Every 20 minutes until service stability is restored (per INC-1001 standard)',
    message:
      'Our operations team is investigating an active issue affecting customer order submissions on the storefront in North America and Europe. Some shoppers are encountering errors at checkout, and our engineering specialists are reviewing transaction volumes and payment processing connectivity to confirm scope and restore normal service. An authorized Incident Manager is reviewing priority and escalation status, and the next update will follow within 20 minutes.',
  },
  matchedRecordIds: ['INC-1001', 'INC-1029', 'INC-1007'],
  analysisSource: 'sample_record',
};
