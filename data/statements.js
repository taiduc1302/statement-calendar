window.statementCalendarData = {
  meta: {
    asOf: "2026-11-07",
    updatedAt: "2026-11-07",
    title: "Statement Calendar Demo",
    privacy: "Fictional demo metadata only. No real financial records."
  },

  owners: [
    { id: "alex", name: "Alex" },
    { id: "taylor", name: "Taylor" }
  ],

  accounts: [
    {
      id: "north-chequing",
      owner: "alex",
      institution: "North Bank",
      name: "Everyday Chequing",
      suffix: "1234",
      cadence: "monthly",
      confidence: "high",
      rule: { type: "calendarMonth", releaseDay: 2, toleranceDays: 3 },
      notes: "Demo calendar-month account."
    },
    {
      id: "north-rewards",
      owner: "alex",
      institution: "North Bank",
      name: "Rewards Credit Card",
      suffix: "5678",
      cadence: "monthly",
      confidence: "high",
      rule: { type: "fixedRange", startDay: 9, endDay: 8, releaseDay: 9, toleranceDays: 2 },
      notes: "Demo billing cycle that closes around the 8th."
    },
    {
      id: "maple-travel",
      owner: "taylor",
      institution: "Maple Credit Union",
      name: "Travel Credit Card",
      suffix: "2468",
      cadence: "monthly",
      confidence: "medium",
      rule: { type: "fixedRange", startDay: 21, endDay: 20, releaseDay: 21, toleranceDays: 3 },
      notes: "Demo statement cycle inferred from fictional history."
    },
    {
      id: "demo-brokerage",
      owner: "alex",
      institution: "Demo Brokerage",
      name: "Investment Account",
      suffix: "9012",
      cadence: "monthly",
      confidence: "high",
      rule: { type: "calendarMonth", releaseDay: 3, toleranceDays: 2 },
      notes: "Demo monthly brokerage statement."
    },
    {
      id: "maple-investment",
      owner: "taylor",
      institution: "Maple Credit Union",
      name: "Quarterly Investment Account",
      suffix: "3456",
      cadence: "quarterly",
      confidence: "high",
      rule: {
        type: "quarterly",
        quarterEndMonths: [3, 6, 9, 12],
        releaseMonthOffset: 1,
        releaseDay: 3,
        toleranceDays: 5
      },
      notes: "Demo quarterly statement."
    },
    {
      id: "demo-irregular",
      owner: "taylor",
      institution: "Demo Savings Co.",
      name: "Irregular Savings Account",
      suffix: "7788",
      cadence: "irregular",
      confidence: "low",
      rule: { type: "manual" },
      manualReviewDate: "2026-10-15",
      notes: "Fictional account with insufficient history for reliable prediction."
    }
  ],

  statements: [
    {
      id: "north-chequing-2026-08",
      accountId: "north-chequing",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      expectedReleaseDate: "2026-09-02",
      actualReleaseDate: "2026-09-02",
      status: "imported",
      source: "demo statement record",
      notes: "Processed in the demo history."
    },
    {
      id: "north-chequing-2026-09",
      accountId: "north-chequing",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      expectedReleaseDate: "2026-10-02",
      actualReleaseDate: "2026-10-02",
      status: "uploaded",
      source: "demo statement record"
    },
    {
      id: "north-rewards-2026-09",
      accountId: "north-rewards",
      periodStart: "2026-08-09",
      periodEnd: "2026-09-08",
      expectedReleaseDate: "2026-09-09",
      actualReleaseDate: "2026-09-09",
      status: "imported",
      source: "demo statement record"
    },
    {
      id: "north-rewards-2026-10",
      accountId: "north-rewards",
      periodStart: "2026-09-09",
      periodEnd: "2026-10-08",
      expectedReleaseDate: "2026-10-09",
      actualReleaseDate: "2026-10-10",
      status: "confirmed",
      source: "demo institution email"
    },
    {
      id: "maple-travel-2026-09",
      accountId: "maple-travel",
      periodStart: "2026-08-21",
      periodEnd: "2026-09-20",
      expectedReleaseDate: "2026-09-21",
      actualReleaseDate: "2026-09-22",
      status: "imported",
      source: "demo statement record"
    },
    {
      id: "brokerage-2026-09",
      accountId: "demo-brokerage",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      expectedReleaseDate: "2026-10-03",
      actualReleaseDate: "2026-10-03",
      status: "confirmed",
      source: "demo brokerage notification"
    },
    {
      id: "maple-investment-q3-2026",
      accountId: "maple-investment",
      periodStart: "2026-07-01",
      periodEnd: "2026-09-30",
      expectedReleaseDate: "2026-10-03",
      actualReleaseDate: "2026-10-04",
      status: "uploaded",
      source: "demo statement record"
    }
  ]
};
