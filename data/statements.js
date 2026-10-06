window.statementCalendarData = {
  meta: {
    asOf: "2026-10-06",
    updatedAt: "2026-10-06",
    title: "Statement Calendar Demo",
    privacy: "Demo metadata only. No real balances or transaction details."
  },
  owners: [
    { id: "alex", name: "Alex" },
    { id: "taylor", name: "Taylor" }
  ],
  accounts: [
    {
      id: "bank-a-chequing",
      bank: "Bank A",
      owner: "alex",
      name: "Chequing",
      suffix: "1234",
      cadence: "monthly",
      confidence: "high",
      rule: { type: "calendarMonth", releaseDay: 2, toleranceDays: 3 },
      notes: "Calendar-month statement."
    },
    {
      id: "bank-a-card",
      bank: "Bank A",
      owner: "alex",
      name: "Rewards Card",
      suffix: "5678",
      cadence: "monthly",
      confidence: "high",
      rule: { type: "fixedRange", startDay: 9, endDay: 8, releaseDay: 9, toleranceDays: 2 },
      notes: "Closes around the 8th."
    },
    {
      id: "bank-b-card",
      bank: "Bank B",
      owner: "taylor",
      name: "Travel Card",
      suffix: "2468",
      cadence: "monthly",
      confidence: "medium",
      rule: { type: "fixedRange", startDay: 21, endDay: 20, releaseDay: 21, toleranceDays: 2 },
      notes: "Predicted from observed statement history."
    },
    {
      id: "broker-x",
      bank: "Broker X",
      owner: "alex",
      name: "Investment Account",
      suffix: "9012",
      cadence: "monthly",
      confidence: "high",
      rule: { type: "calendarMonth", releaseDay: 3, toleranceDays: 2 },
      notes: "Monthly activity statement."
    },
    {
      id: "investment-fhsa",
      bank: "Bank C",
      owner: "taylor",
      name: "Investment Account",
      suffix: "",
      cadence: "quarterly",
      confidence: "high",
      rule: { type: "quarterly", releaseDay: 3, toleranceDays: 5 },
      notes: "Quarterly statement."
    },
    {
      id: "manual-account",
      bank: "Bank D",
      owner: "alex",
      name: "New Account",
      suffix: "",
      cadence: "unknown",
      confidence: "low",
      rule: { type: "manual" },
      notes: "Not enough source history to predict a cadence."
    }
  ],
  statements: [
    {
      id: "bank-a-cheq-2026-08",
      accountId: "bank-a-chequing",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      expectedReleaseDate: "2026-09-02",
      status: "imported",
      source: "demo source statement"
    },
    {
      id: "bank-a-card-2026-09",
      accountId: "bank-a-card",
      periodStart: "2026-08-09",
      periodEnd: "2026-09-08",
      expectedReleaseDate: "2026-09-09",
      actualReleaseDate: "2026-09-09",
      status: "uploaded",
      source: "demo source statement"
    },
    {
      id: "bank-b-card-2026-09",
      accountId: "bank-b-card",
      periodStart: "2026-08-21",
      periodEnd: "2026-09-20",
      expectedReleaseDate: "2026-09-21",
      actualReleaseDate: "2026-09-22",
      status: "confirmed",
      source: "demo institution notification"
    },
    {
      id: "broker-x-2026-09",
      accountId: "broker-x",
      periodStart: "2026-09-01",
      periodEnd: "2026-09-30",
      expectedReleaseDate: "2026-10-03",
      actualReleaseDate: "2026-10-03",
      status: "confirmed",
      source: "demo broker notification"
    }
  ]
};
