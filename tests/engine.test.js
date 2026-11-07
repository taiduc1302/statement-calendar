const assert = require("assert");
const engine = require("../engine.js");

const account = {
  id: "demo",
  cadence: "monthly",
  confidence: "high",
  rule: { type: "calendarMonth", releaseDay: 2, toleranceDays: 3 }
};

const generated = engine.generateAccountEvents(
  account,
  "2026-09-01",
  "2026-11-30"
);

assert(generated.length >= 2, "calendar-month rule should generate future cycles");

const octoberRelease = generated.find(event =>
  engine.iso(event.expectedReleaseDate) === "2026-10-02"
);

assert(octoberRelease, "September period should predict an October 2 release");
assert.strictEqual(engine.iso(octoberRelease.periodStart), "2026-09-01");
assert.strictEqual(engine.iso(octoberRelease.periodEnd), "2026-09-30");

assert.strictEqual(
  engine.resolvePredictedStatus(account, "2026-11-10", "2026-11-07"),
  "expected"
);

assert.strictEqual(
  engine.resolvePredictedStatus(account, "2026-11-01", "2026-11-07"),
  "likely"
);

const data = {
  owners: [{ id: "alex", name: "Alex" }],
  accounts: [account],
  statements: []
};

const events = engine.buildEvents(
  data,
  "2026-09-01",
  "2026-11-30",
  "2026-10-10"
);

const overdue = events.find(event =>
  engine.iso(event.expectedReleaseDate) === "2026-10-02"
);

assert(overdue, "predicted event should exist");
assert.strictEqual(overdue.status, "likely");
assert.strictEqual(overdue.isGap, true, "event should be a gap after tolerance");

const quarterly = {
  id: "quarterly",
  cadence: "quarterly",
  confidence: "high",
  rule: {
    type: "quarterly",
    quarterEndMonths: [3, 6, 9, 12],
    releaseMonthOffset: 1,
    releaseDay: 3,
    toleranceDays: 5
  }
};

const qEvents = engine.generateAccountEvents(
  quarterly,
  "2026-08-01",
  "2026-11-30"
);

const q3 = qEvents.find(event => engine.iso(event.periodEnd) === "2026-09-30");
assert(q3, "Q3 statement should be generated");
assert.strictEqual(engine.iso(q3.expectedReleaseDate), "2026-10-03");

const actualData = {
  owners: [{ id: "alex", name: "Alex" }],
  accounts: [account],
  statements: [{
    id: "actual-september",
    accountId: "demo",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    expectedReleaseDate: "2026-10-02",
    actualReleaseDate: "2026-10-03",
    status: "uploaded",
    source: "demo"
  }]
};

const merged = engine.buildEvents(
  actualData,
  "2026-09-01",
  "2026-11-30",
  "2026-10-10"
);

const actual = merged.find(event => event.id === "actual-september");
assert(actual, "actual statement should replace its prediction");
assert.strictEqual(actual.status, "uploaded");
assert.strictEqual(engine.iso(actual.actualReleaseDate), "2026-10-03");
assert.strictEqual(actual.isGap, false);

const fixedRange = {
  id: "fixed",
  cadence: "monthly",
  confidence: "high",
  rule: { type: "fixedRange", startDay: 9, endDay: 8, releaseDay: 9, toleranceDays: 2 }
};

const fixedEvents = engine.generateAccountEvents(
  fixedRange,
  "2026-08-01",
  "2026-10-31"
);

const septemberCycle = fixedEvents.find(event => engine.iso(event.periodEnd) === "2026-09-08");
assert(septemberCycle, "fixed-range cycle should be generated");
assert.strictEqual(engine.iso(septemberCycle.periodStart), "2026-08-09");
assert.strictEqual(engine.iso(septemberCycle.expectedReleaseDate), "2026-09-09");

const manualData = {
  owners: [{ id: "taylor", name: "Taylor" }],
  accounts: [{
    id: "manual",
    cadence: "irregular",
    confidence: "low",
    manualReviewDate: "2026-10-15",
    rule: { type: "manual" }
  }],
  statements: []
};

const manualEvents = engine.buildEvents(
  manualData,
  "2026-10-01",
  "2026-10-31",
  "2026-10-20"
);

assert.strictEqual(manualEvents.length, 1);
assert.strictEqual(manualEvents[0].status, "manual");
assert.strictEqual(manualEvents[0].manualOverdue, true);

const summary = engine.summarize(merged, "2026-10-10");
assert.deepStrictEqual(
  Object.keys(summary).sort(),
  ["confirmed", "expectedSoon", "gaps", "imported", "likely", "waitingForUpload"].sort()
);
assert.strictEqual(typeof summary.gaps, "number");

console.log("engine.test.js: all assertions passed");
