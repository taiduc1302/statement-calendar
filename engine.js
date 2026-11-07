(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.StatementCalendarEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TERMINAL_STATUSES = new Set(["confirmed", "uploaded", "imported", "manual"]);

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return new Date(value.getTime());
    return new Date(`${value}T12:00:00`);
  }

  function iso(value) {
    const d = parseDate(value);
    if (!d || Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function addDays(value, amount) {
    const d = parseDate(value);
    d.setDate(d.getDate() + amount);
    return d;
  }

  function addMonths(value, amount) {
    const d = parseDate(value);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + amount);
    d.setDate(Math.min(day, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()));
    return d;
  }

  function safeDate(year, monthIndex, day) {
    const last = new Date(year, monthIndex + 1, 0).getDate();
    return new Date(year, monthIndex, Math.min(day, last), 12, 0, 0, 0);
  }

  function daysBetween(aValue, bValue) {
    const a = parseDate(aValue);
    const b = parseDate(bValue);
    if (!a || !b) return 0;
    return Math.floor((b - a) / 86400000);
  }

  function ruleLabel(account) {
    const rule = account.rule || { type: "manual" };
    if (rule.type === "calendarMonth") {
      return `Calendar month; expected around day ${rule.releaseDay || 2} of the following month`;
    }
    if (rule.type === "fixedRange") {
      return `Cycle day ${rule.startDay} to ${rule.endDay}; expected around day ${rule.releaseDay || rule.endDay + 1}`;
    }
    if (rule.type === "releaseDayOnly") {
      return `Expected around day ${rule.releaseDay || 27}; exact statement period must be confirmed`;
    }
    if (rule.type === "quarterly") {
      return `Quarterly; expected around day ${rule.releaseDay || 3} after each quarter end`;
    }
    return "Manual review; no reliable prediction rule";
  }

  function generatedEvent(account, periodStart, periodEnd, expectedReleaseDate) {
    const token = periodEnd ? iso(periodEnd) : iso(expectedReleaseDate);
    return {
      id: `pred-${account.id}-${token}`,
      accountId: account.id,
      periodStart,
      periodEnd,
      expectedReleaseDate,
      actualReleaseDate: null,
      calendarDate: expectedReleaseDate,
      status: "expected",
      source: `rule:${account.rule?.type || "manual"}`,
      notes: "",
      generated: true
    };
  }

  function generateAccountEvents(account, fromValue, toValue) {
    const rule = account.rule || { type: "manual" };
    const from = parseDate(fromValue);
    const to = parseDate(toValue);

    if (rule.type === "manual") {
      if (!account.manualReviewDate) return [];
      const reviewDate = parseDate(account.manualReviewDate);
      if (reviewDate < from || reviewDate > to) return [];
      return [{
        id: `manual-${account.id}-${iso(reviewDate)}`,
        accountId: account.id,
        periodStart: null,
        periodEnd: null,
        expectedReleaseDate: reviewDate,
        actualReleaseDate: null,
        calendarDate: reviewDate,
        status: "manual",
        source: "manual review date",
        notes: account.notes || "",
        generated: true
      }];
    }

    const events = [];
    const cursor = new Date(from.getFullYear(), from.getMonth() - 4, 1, 12);
    const endCursor = new Date(to.getFullYear(), to.getMonth() + 2, 1, 12);

    while (cursor <= endCursor) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      let event = null;

      if (rule.type === "calendarMonth") {
        event = generatedEvent(
          account,
          new Date(y, m, 1, 12),
          new Date(y, m + 1, 0, 12),
          safeDate(y, m + 1, rule.releaseDay || 2)
        );
      } else if (rule.type === "fixedRange") {
        const periodEnd = safeDate(y, m, rule.endDay);
        const startMonth = rule.startDay > rule.endDay ? m - 1 : m;
        const releaseDay = rule.releaseDay || rule.endDay + 1;
        const releaseMonth = releaseDay < rule.endDay ? m + 1 : m;
        event = generatedEvent(
          account,
          safeDate(y, startMonth, rule.startDay),
          periodEnd,
          safeDate(y, releaseMonth, releaseDay)
        );
      } else if (rule.type === "releaseDayOnly") {
        event = generatedEvent(account, null, null, safeDate(y, m, rule.releaseDay || 27));
      } else if (rule.type === "quarterly") {
        const quarterEndMonths = rule.quarterEndMonths || [3, 6, 9, 12];
        if (quarterEndMonths.includes(m + 1)) {
          event = generatedEvent(
            account,
            new Date(y, m - 2, 1, 12),
            new Date(y, m + 1, 0, 12),
            safeDate(y, m + (rule.releaseMonthOffset ?? 1), rule.releaseDay || 3)
          );
        }
      }

      if (event && event.expectedReleaseDate >= from && event.expectedReleaseDate <= to) events.push(event);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return events;
  }

  function resolvePredictedStatus(account, expectedValue, asOfValue) {
    const expected = parseDate(expectedValue);
    const asOf = parseDate(asOfValue);
    if (!expected || account.rule?.type === "manual" || account.cadence === "irregular") return "manual";
    return expected > asOf ? "expected" : "likely";
  }

  function statementMatchKey(accountId, periodEnd, expectedReleaseDate) {
    if (periodEnd) return `${accountId}|period|${iso(periodEnd)}`;
    return `${accountId}|release|${iso(expectedReleaseDate) || "unknown"}`;
  }

  function normalizeStatement(statement, account, asOfValue) {
    const periodStart = parseDate(statement.periodStart);
    const periodEnd = parseDate(statement.periodEnd);
    const expectedReleaseDate = parseDate(statement.expectedReleaseDate);
    const actualReleaseDate = parseDate(statement.actualReleaseDate);
    const calendarDate = actualReleaseDate || expectedReleaseDate;
    let status = statement.status || "expected";

    if (!TERMINAL_STATUSES.has(status)) {
      status = resolvePredictedStatus(account, expectedReleaseDate || calendarDate, asOfValue);
    }

    return {
      ...statement,
      periodStart,
      periodEnd,
      expectedReleaseDate,
      actualReleaseDate,
      calendarDate,
      status,
      generated: false
    };
  }

  function decorateEvent(event, account, asOfValue) {
    const asOf = parseDate(asOfValue);
    const expected = event.expectedReleaseDate;
    const toleranceDays = account.rule?.toleranceDays ?? 0;
    const dueDate = expected || event.calendarDate;
    const overdueDays = dueDate && dueDate <= asOf ? daysBetween(dueDate, asOf) : 0;
    const inferredStatus = event.status === "manual"
      ? "manual"
      : event.generated
        ? resolvePredictedStatus(account, expected, asOf)
        : event.status;

    const isGap = Boolean(
      event.generated &&
      inferredStatus === "likely" &&
      expected &&
      addDays(expected, toleranceDays) < asOf &&
      ["monthly", "quarterly"].includes(account.cadence)
    );

    return {
      ...event,
      status: inferredStatus,
      overdueDays,
      toleranceDays,
      isGap,
      manualOverdue: Boolean(inferredStatus === "manual" && dueDate && dueDate < asOf)
    };
  }

  function buildEvents(data, fromValue, toValue, asOfValue, overrides = {}) {
    const from = parseDate(fromValue);
    const to = parseDate(toValue);
    const asOf = parseDate(asOfValue);
    const accounts = new Map(data.accounts.map(account => [account.id, account]));
    const generated = data.accounts.flatMap(account => generateAccountEvents(account, from, to));
    const actualByKey = new Map();

    for (const statement of data.statements || []) {
      actualByKey.set(
        statementMatchKey(statement.accountId, statement.periodEnd, statement.expectedReleaseDate),
        statement
      );
    }

    const usedActualIds = new Set();
    const merged = generated.map(event => {
      const match = actualByKey.get(
        statementMatchKey(
          event.accountId,
          event.periodEnd ? iso(event.periodEnd) : null,
          event.expectedReleaseDate ? iso(event.expectedReleaseDate) : null
        )
      );
      if (!match) return event;
      usedActualIds.add(match.id);
      return normalizeStatement(match, accounts.get(match.accountId), asOf);
    });

    for (const statement of data.statements || []) {
      if (usedActualIds.has(statement.id)) continue;
      const account = accounts.get(statement.accountId);
      if (!account) continue;
      const normalized = normalizeStatement(statement, account, asOf);
      const anchor = normalized.calendarDate || normalized.expectedReleaseDate;
      if (anchor && anchor >= from && anchor <= to) merged.push(normalized);
    }

    return merged.map(event => {
      const account = accounts.get(event.accountId);
      let decorated = decorateEvent(event, account, asOf);
      const override = overrides[event.id];
      if (override?.status) {
        const due = decorated.expectedReleaseDate || decorated.calendarDate;
        decorated = {
          ...decorated,
          status: override.status,
          localOverride: true,
          isGap: false,
          manualOverdue: Boolean(override.status === "manual" && due && due < asOf)
        };
      }
      return decorated;
    }).sort((a, b) => {
      const ad = a.calendarDate || a.expectedReleaseDate;
      const bd = b.calendarDate || b.expectedReleaseDate;
      return ad - bd;
    });
  }

  function summarize(events, asOfValue, soonDays = 30) {
    const asOf = parseDate(asOfValue);
    const soonLimit = addDays(asOf, soonDays);
    return {
      expectedSoon: events.filter(e => e.status === "expected" && e.expectedReleaseDate >= asOf && e.expectedReleaseDate <= soonLimit).length,
      likely: events.filter(e => e.status === "likely").length,
      confirmed: events.filter(e => e.status === "confirmed").length,
      waitingForUpload: events.filter(e => ["likely", "confirmed"].includes(e.status)).length,
      imported: events.filter(e => e.status === "imported").length,
      gaps: events.filter(e => e.isGap || e.manualOverdue).length
    };
  }

  function attentionEvents(events, asOfValue) {
    const asOf = parseDate(asOfValue);
    return events.filter(event => {
      const due = event.expectedReleaseDate || event.calendarDate;
      if (!due || due > asOf) return false;
      return event.status === "likely" || event.status === "confirmed" || event.manualOverdue;
    }).sort((a, b) => {
      const byAge = (b.overdueDays || 0) - (a.overdueDays || 0);
      if (byAge !== 0) return byAge;
      return (a.expectedReleaseDate || a.calendarDate) - (b.expectedReleaseDate || b.calendarDate);
    });
  }

  return {
    parseDate,
    iso,
    addDays,
    addMonths,
    safeDate,
    daysBetween,
    ruleLabel,
    generateAccountEvents,
    resolvePredictedStatus,
    buildEvents,
    summarize,
    attentionEvents
  };
});
