(() => {
  const DATA = window.statementCalendarData;
  const ENGINE = window.StatementCalendarEngine;
  const accountById = new Map(DATA.accounts.map(a => [a.id, a]));
  const ownerById = new Map(DATA.owners.map(o => [o.id, o]));

  const statusMeta = {
    expected: { label: "Expected", color: "#64748b" },
    likely: { label: "Likely available", color: "#b7791f" },
    confirmed: { label: "Confirmed", color: "#c2410c" },
    uploaded: { label: "Uploaded", color: "#2563eb" },
    imported: { label: "Imported", color: "#15803d" },
    manual: { label: "Manual review", color: "#7e22ce" }
  };

  const els = {
    dashboard: document.getElementById("dashboard"),
    asOfDate: document.getElementById("asOfDate"),
    ownerFilter: document.getElementById("ownerFilter"),
    institutionFilter: document.getElementById("institutionFilter"),
    accountFilter: document.getElementById("accountFilter"),
    statusFilter: document.getElementById("statusFilter"),
    cadenceFilter: document.getElementById("cadenceFilter"),
    searchBox: document.getElementById("searchBox"),
    calendarGrid: document.getElementById("calendarGrid"),
    monthTitle: document.getElementById("monthTitle"),
    asOfSummary: document.getElementById("asOfSummary"),
    attentionList: document.getElementById("attentionList"),
    attentionCount: document.getElementById("attentionCount"),
    legend: document.getElementById("legend"),
    timelineAccount: document.getElementById("timelineAccount"),
    timelineMeta: document.getElementById("timelineMeta"),
    timelineList: document.getElementById("timelineList"),
    eventDialog: document.getElementById("eventDialog"),
    dialogEyebrow: document.getElementById("dialogEyebrow"),
    dialogTitle: document.getElementById("dialogTitle"),
    dialogBody: document.getElementById("dialogBody"),
    localStatusSelect: document.getElementById("localStatusSelect")
  };

  let viewDate = firstOfMonth(ENGINE.parseDate(DATA.meta.asOf));
  let activeEvent = null;
  let localOverrides = loadOverrides();

  init();

  function init() {
    els.asOfDate.value = DATA.meta.asOf;
    populateFilters();
    renderLegend();
    wireEvents();
    render();
  }

  function wireEvents() {
    document.getElementById("prevMonth").addEventListener("click", () => {
      viewDate = firstOfMonth(ENGINE.addMonths(viewDate, -1));
      render();
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
      viewDate = firstOfMonth(ENGINE.addMonths(viewDate, 1));
      render();
    });

    document.getElementById("todayBtn").addEventListener("click", () => {
      const today = new Date();
      els.asOfDate.value = ENGINE.iso(today);
      viewDate = firstOfMonth(today);
      render();
    });

    document.getElementById("exportBtn").addEventListener("click", exportOverrides);
    document.getElementById("saveLocalStatus").addEventListener("click", saveLocalStatus);

    [
      els.asOfDate,
      els.ownerFilter,
      els.institutionFilter,
      els.accountFilter,
      els.statusFilter,
      els.cadenceFilter,
      els.searchBox
    ].forEach(el => el.addEventListener("input", render));

    els.timelineAccount.addEventListener("change", renderTimeline);
  }

  function populateFilters() {
    els.ownerFilter.innerHTML = option("", "All owners") +
      DATA.owners.map(o => option(o.id, o.name)).join("");

    const institutions = [...new Set(DATA.accounts.map(a => a.institution))].sort();
    els.institutionFilter.innerHTML = option("", "All institutions") +
      institutions.map(v => option(v, v)).join("");

    els.accountFilter.innerHTML = option("", "All accounts") +
      DATA.accounts.map(a => option(a.id, accountLabel(a))).join("");

    els.statusFilter.innerHTML = option("", "All statuses") +
      Object.entries(statusMeta).map(([key, meta]) => option(key, meta.label)).join("");

    const cadences = [...new Set(DATA.accounts.map(a => a.cadence))].sort();
    els.cadenceFilter.innerHTML = option("", "All cadences") +
      cadences.map(v => option(v, titleCase(v))).join("");

    els.timelineAccount.innerHTML = DATA.accounts
      .map(a => option(a.id, accountLabel(a)))
      .join("");

    els.localStatusSelect.innerHTML =
      option("", "Automatic") +
      ["confirmed", "uploaded", "imported", "manual"]
        .map(key => option(key, statusMeta[key].label))
        .join("");
  }

  function renderLegend() {
    els.legend.innerHTML = Object.entries(statusMeta)
      .map(([key, meta]) =>
        `<div class="legend-item"><span class="legend-dot" style="--legend-color:${meta.color}"></span>${escapeHtml(meta.label)}</div>`
      ).join("");
  }

  function render() {
    const asOf = ENGINE.parseDate(els.asOfDate.value || DATA.meta.asOf);
    const calendarFrom = ENGINE.addMonths(firstOfMonth(viewDate), -2);
    const calendarTo = ENGINE.addMonths(lastOfMonth(viewDate), 2);
    const historyFrom = ENGINE.addMonths(asOf, -15);
    const historyTo = ENGINE.addMonths(asOf, 4);

    const calendarEvents = ENGINE.buildEvents(DATA, calendarFrom, calendarTo, asOf, localOverrides);
    const historyEvents = ENGINE.buildEvents(DATA, historyFrom, historyTo, asOf, localOverrides);

    renderDashboard(historyEvents, asOf);
    renderCalendar(calendarEvents, asOf);
    renderAttention(historyEvents, asOf);
    renderTimeline();
  }

  function renderDashboard(events, asOf) {
    const filtered = events.filter(matchesFilters);
    const summary = ENGINE.summarize(filtered, asOf);
    const cards = [
      ["Expected soon", summary.expectedSoon, "Within 30 days"],
      ["Likely available", summary.likely, "Expected date has passed"],
      ["Confirmed", summary.confirmed, "Notification or other evidence"],
      ["Waiting for upload", summary.waitingForUpload, "Likely or confirmed"],
      ["Imported", summary.imported, "Processing complete"],
      ["Missing / gaps", summary.gaps, "Past tolerance or manual overdue"]
    ];

    els.dashboard.innerHTML = cards.map(([label, value, hint]) =>
      `<article class="metric-card card">
        <div class="metric-label">${escapeHtml(label)}</div>
        <div class="metric-value">${value}</div>
        <div class="metric-hint">${escapeHtml(hint)}</div>
      </article>`
    ).join("");
  }

  function renderCalendar(events, asOf) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    els.monthTitle.textContent = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" })
      .format(new Date(year, month, 1));

    els.asOfSummary.textContent =
      `Evaluated as of ${fmtDate(asOf)} · demo data updated ${fmtDate(ENGINE.parseDate(DATA.meta.updatedAt))}`;

    const first = new Date(year, month, 1, 12);
    const mondayIndex = (first.getDay() + 6) % 7;
    const gridStart = ENGINE.addDays(first, -mondayIndex);
    const days = Array.from({ length: 42 }, (_, i) => ENGINE.addDays(gridStart, i));

    const occurrences = calendarOccurrences(events.filter(matchesFilters));

    els.calendarGrid.innerHTML = days.map(day => {
      const key = ENGINE.iso(day);
      const dayEvents = occurrences.filter(item => ENGINE.iso(item.date) === key);
      const outside = day.getMonth() !== month;
      const selectedAsOf = key === ENGINE.iso(asOf);

      return `<div class="day-cell ${outside ? "outside" : ""} ${selectedAsOf ? "asof-day" : ""}">
        <div class="day-number">
          <span>${day.getDate()}</span>
          ${selectedAsOf ? '<span class="dot" title="Selected as-of date"></span>' : ""}
        </div>
        <div class="day-events">
          ${dayEvents.slice(0, 4).map(item => eventChipHtml(item.event, item.kind)).join("")}
          ${dayEvents.length > 4 ? `<div class="more-link">+${dayEvents.length - 4} more</div>` : ""}
        </div>
      </div>`;
    }).join("");

    els.calendarGrid.querySelectorAll("[data-event-id]").forEach(node =>
      node.addEventListener("click", () => openEvent(node.dataset.eventId, events))
    );
  }

  function renderAttention(events, asOf) {
    const items = ENGINE.attentionEvents(events.filter(matchesFilters), asOf);
    els.attentionCount.textContent = items.length;

    els.attentionList.innerHTML = items.length ? items.map(event => {
      const account = accountById.get(event.accountId);
      const meta = statusMeta[event.status];
      const overdue = event.overdueDays ? `${event.overdueDays}d overdue` : "due now";
      const gap = event.isGap ? " · gap" : "";
      return `<button class="attention-item" data-attention-id="${escapeHtml(event.id)}">
        <div class="row">
          <div class="title">${escapeHtml(account.institution)} · ${escapeHtml(account.name)}</div>
          <span class="status-pill" style="--pill-color:${meta.color}">${escapeHtml(meta.label)}</span>
        </div>
        <div class="meta">${escapeHtml(ownerName(account))} · ${escapeHtml(overdue)}${gap}</div>
      </button>`;
    }).join("") : '<div class="empty-state">Nothing currently needs attention.</div>';

    els.attentionList.querySelectorAll("[data-attention-id]").forEach(node =>
      node.addEventListener("click", () => openEvent(node.dataset.attentionId, events))
    );
  }

  function renderTimeline() {
    const accountId = els.timelineAccount.value || DATA.accounts[0]?.id;
    const account = accountById.get(accountId);
    if (!account) return;

    const asOf = ENGINE.parseDate(els.asOfDate.value || DATA.meta.asOf);
    const from = ENGINE.addMonths(asOf, -15);
    const to = ENGINE.addMonths(asOf, 3);
    const events = ENGINE.buildEvents(DATA, from, to, asOf, localOverrides)
      .filter(e => e.accountId === accountId)
      .sort((a, b) => (b.periodEnd || b.calendarDate) - (a.periodEnd || a.calendarDate));

    els.timelineMeta.textContent =
      `${ownerName(account)} · ${account.institution} · ${titleCase(account.cadence)} · ${titleCase(account.confidence)} confidence · ${ENGINE.ruleLabel(account)}`;

    els.timelineList.innerHTML = events.length ? events.map(event => {
      const meta = statusMeta[event.status];
      const gapLabel = event.isGap
        ? '<span class="gap-badge">Missing / gap</span>'
        : event.manualOverdue
          ? '<span class="gap-badge">Manual overdue</span>'
          : "";

      return `<button class="timeline-row" data-timeline-event="${escapeHtml(event.id)}">
        <div>
          <strong>${escapeHtml(periodLabel(event))}</strong>
          <div class="muted small">
            expected ${fmtOptionalDate(event.expectedReleaseDate)}
            ${event.actualReleaseDate ? ` · actual ${fmtDate(event.actualReleaseDate)}` : ""}
          </div>
        </div>
        <div class="timeline-status">
          ${gapLabel}
          <span class="status-pill" style="--pill-color:${meta.color}">${escapeHtml(meta.label)}</span>
        </div>
      </button>`;
    }).join("") : '<div class="empty-state">No statement history in the selected window.</div>';

    els.timelineList.querySelectorAll("[data-timeline-event]").forEach(node =>
      node.addEventListener("click", () => openEvent(node.dataset.timelineEvent, events))
    );
  }

  function calendarOccurrences(events) {
    return events.flatMap(event => {
      const expected = event.expectedReleaseDate;
      const actual = event.actualReleaseDate;

      if (actual && expected && ENGINE.iso(actual) !== ENGINE.iso(expected)) {
        return [
          { event, date: expected, kind: "expected date" },
          { event, date: actual, kind: "actual date" }
        ];
      }

      return [{
        event,
        date: actual || expected || event.calendarDate,
        kind: actual ? "actual date" : "expected date"
      }];
    }).filter(item => item.date);
  }

  function eventChipHtml(event, occurrenceKind = "expected date") {
    const account = accountById.get(event.accountId);
    const meta = statusMeta[event.status];
    const marker = event.isGap ? " · gap" : "";
    const expectedClass = occurrenceKind === "expected date" && event.actualReleaseDate ? " expected-occurrence" : "";

    return `<button class="event-chip${expectedClass}" data-event-id="${escapeHtml(event.id)}" style="--event-color:${meta.color}">
      <strong>${escapeHtml(ownerName(account))} · ${escapeHtml(account.institution)}</strong>
      <span>${escapeHtml(account.name)} · ${escapeHtml(occurrenceKind)} · ${escapeHtml(meta.label)}${marker}</span>
    </button>`;
  }

  function matchesFilters(event) {
    const account = accountById.get(event.accountId);
    if (!account) return false;

    if (els.ownerFilter.value && account.owner !== els.ownerFilter.value) return false;
    if (els.institutionFilter.value && account.institution !== els.institutionFilter.value) return false;
    if (els.accountFilter.value && account.id !== els.accountFilter.value) return false;
    if (els.statusFilter.value && event.status !== els.statusFilter.value) return false;
    if (els.cadenceFilter.value && account.cadence !== els.cadenceFilter.value) return false;

    const query = els.searchBox.value.trim().toLowerCase();
    if (query) {
      const haystack = [
        ownerName(account),
        account.institution,
        account.name,
        account.suffix,
        account.cadence
      ].join(" ").toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  }

  function openEvent(id, events) {
    activeEvent = events.find(e => e.id === id);
    if (!activeEvent) return;

    const account = accountById.get(activeEvent.accountId);
    const meta = statusMeta[activeEvent.status];

    els.dialogEyebrow.textContent = `${ownerName(account)} · ${account.institution}`;
    els.dialogTitle.textContent = `${account.name}${account.suffix ? ` •${account.suffix}` : ""}`;

    els.dialogBody.innerHTML = [
      detail("Status", `<span class="status-pill" style="--pill-color:${meta.color}">${escapeHtml(meta.label)}</span>`),
      detail("Statement period", escapeHtml(periodLabel(activeEvent))),
      detail("Expected release", fmtOptionalDate(activeEvent.expectedReleaseDate)),
      detail("Actual release", fmtOptionalDate(activeEvent.actualReleaseDate)),
      detail("Confidence", escapeHtml(titleCase(account.confidence))),
      detail("Source / reason", escapeHtml(activeEvent.source || ENGINE.ruleLabel(account))),
      detail("Cadence", escapeHtml(titleCase(account.cadence))),
      detail("Prediction rule", escapeHtml(ENGINE.ruleLabel(account))),
      detail("Tolerance", `${activeEvent.toleranceDays || 0} day(s)`),
      detail("Gap state", activeEvent.isGap ? "Missing / gap detected" : activeEvent.manualOverdue ? "Manual review overdue" : "No gap detected"),
      detail("Notes", escapeHtml(activeEvent.notes || account.notes || "—"))
    ].join("");

    els.localStatusSelect.value = localOverrides[activeEvent.id]?.status || "";
    els.eventDialog.showModal();
  }

  function saveLocalStatus() {
    if (!activeEvent) return;
    const status = els.localStatusSelect.value;

    if (!status) delete localOverrides[activeEvent.id];
    else localOverrides[activeEvent.id] = { status, updatedAt: new Date().toISOString() };

    localStorage.setItem("statement-calendar-overrides", JSON.stringify(localOverrides));
    els.eventDialog.close();
    render();
  }

  function loadOverrides() {
    try {
      return JSON.parse(localStorage.getItem("statement-calendar-overrides") || "{}");
    } catch {
      return {};
    }
  }

  function exportOverrides() {
    const payload = {
      exportedAt: new Date().toISOString(),
      asOf: els.asOfDate.value,
      overrides: localOverrides
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-calendar-status-${els.asOfDate.value || DATA.meta.asOf}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function accountLabel(account) {
    return `${account.institution} · ${account.name}${account.suffix ? ` •${account.suffix}` : ""}`;
  }

  function ownerName(account) {
    return ownerById.get(account.owner)?.name || account.owner;
  }

  function periodLabel(event) {
    if (!event.periodStart || !event.periodEnd) return "Period not reliably known";
    return `${fmtDate(event.periodStart)} — ${fmtDate(event.periodEnd)}`;
  }

  function fmtDate(date) {
    return new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(date);
  }

  function fmtOptionalDate(date) {
    return date ? fmtDate(date) : "—";
  }

  function detail(label, value) {
    return `<dl class="detail-row"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></dl>`;
  }

  function titleCase(value = "") {
    return String(value).replace(/(^|[-_ ])([a-z])/g, (_, lead, char) => `${lead}${char.toUpperCase()}`);
  }

  function firstOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }

  function lastOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
  }

  function option(value, label) {
    return `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`;
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[char]);
  }
})();
