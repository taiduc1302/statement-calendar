(() => {
  const DATA = window.statementCalendarData;
  const accountById = new Map(DATA.accounts.map(a => [a.id, a]));
  const ownerById = new Map(DATA.owners.map(o => [o.id, o]));
  const statusMeta = {
    imported: { label: "Processed", color: "#1c8b55" },
    uploaded: { label: "Uploaded", color: "#2d68c4" },
    confirmed: { label: "Confirmed available", color: "#d75130" },
    likely: { label: "Likely available", color: "#c48310" },
    expected: { label: "Expected", color: "#718096" },
    manual: { label: "Check manually", color: "#7a57b4" },
    unknown: { label: "Unknown", color: "#8a94a6" }
  };

  const els = {
    asOfDate: document.getElementById("asOfDate"),
    ownerFilter: document.getElementById("ownerFilter"),
    bankFilter: document.getElementById("bankFilter"),
    statusFilter: document.getElementById("statusFilter"),
    searchBox: document.getElementById("searchBox"),
    calendarGrid: document.getElementById("calendarGrid"),
    monthTitle: document.getElementById("monthTitle"),
    asOfSummary: document.getElementById("asOfSummary"),
    attentionList: document.getElementById("attentionList"),
    attentionCount: document.getElementById("attentionCount"),
    legend: document.getElementById("legend"),
    eventDialog: document.getElementById("eventDialog"),
    dialogEyebrow: document.getElementById("dialogEyebrow"),
    dialogTitle: document.getElementById("dialogTitle"),
    dialogBody: document.getElementById("dialogBody"),
    localStatusSelect: document.getElementById("localStatusSelect")
  };

  let viewDate = new Date(DATA.meta.asOf + "T12:00:00");
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
      viewDate = addMonths(viewDate, -1);
      render();
    });
    document.getElementById("nextMonth").addEventListener("click", () => {
      viewDate = addMonths(viewDate, 1);
      render();
    });
    document.getElementById("todayBtn").addEventListener("click", () => {
      const d = parseDate(DATA.meta.asOf);
      viewDate = new Date(d.getFullYear(), d.getMonth(), 1);
      els.asOfDate.value = DATA.meta.asOf;
      render();
    });
    document.getElementById("exportBtn").addEventListener("click", exportOverrides);
    [els.asOfDate, els.ownerFilter, els.bankFilter, els.statusFilter, els.searchBox]
      .forEach(el => el.addEventListener("input", render));
    document.getElementById("saveLocalStatus").addEventListener("click", saveLocalStatus);
  }

  function populateFilters() {
    els.ownerFilter.innerHTML =
      '<option value="">All owners</option>' +
      DATA.owners.map(o => `<option value="${o.id}">${escapeHtml(o.name)}</option>`).join("");

    const banks = [...new Set(DATA.accounts.map(a => a.bank))].sort();
    els.bankFilter.innerHTML =
      '<option value="">All institutions</option>' +
      banks.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");

    els.statusFilter.innerHTML =
      '<option value="">All statuses</option>' +
      Object.entries(statusMeta)
        .map(([k, v]) => `<option value="${k}">${escapeHtml(v.label)}</option>`)
        .join("");

    els.localStatusSelect.innerHTML =
      '<option value="">Automatic</option>' +
      ["confirmed", "uploaded", "imported", "manual"]
        .map(k => `<option value="${k}">${escapeHtml(statusMeta[k].label)}</option>`)
        .join("");
  }

  function renderLegend() {
    els.legend.innerHTML = ["imported", "uploaded", "confirmed", "likely", "expected", "manual"]
      .map(k => `<div class="legend-item"><span class="legend-dot" style="--legend-color:${statusMeta[k].color}"></span>${escapeHtml(statusMeta[k].label)}</div>`)
      .join("");
  }

  function render() {
    const asOf = parseDate(els.asOfDate.value || DATA.meta.asOf);
    const events = buildEventsForRange(addMonths(viewDate, -2), addMonths(viewDate, 2), asOf);
    renderCalendar(events, asOf);
    renderAttention(events, asOf);
  }

  function renderCalendar(events, asOf) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    els.monthTitle.textContent = new Intl.DateTimeFormat("en-CA", { month: "long", year: "numeric" })
      .format(new Date(year, month, 1));
    els.asOfSummary.textContent = `Evaluated as of ${fmtDate(asOf)} · dataset updated ${fmtDate(parseDate(DATA.meta.updatedAt))}`;

    const first = new Date(year, month, 1);
    const mondayIndex = (first.getDay() + 6) % 7;
    const gridStart = addDays(first, -mondayIndex);
    const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

    els.calendarGrid.innerHTML = cells.map(day => {
      const key = iso(day);
      const dayEvents = events.filter(e => iso(e.releaseDate) === key && matchesFilters(e));
      const outside = day.getMonth() !== month;
      const today = key === DATA.meta.asOf;
      const visible = dayEvents.slice(0, 4);

      return `<div class="day-cell ${outside ? "outside" : ""} ${today ? "today" : ""}">
        <div class="day-number"><span>${day.getDate()}</span>${today ? '<span class="dot" title="Dataset date"></span>' : ""}</div>
        <div class="day-events">
          ${visible.map(eventChipHtml).join("")}
          ${dayEvents.length > 4 ? `<div class="more-link">+${dayEvents.length - 4} more</div>` : ""}
        </div>
      </div>`;
    }).join("");

    els.calendarGrid.querySelectorAll("[data-event-id]").forEach(el =>
      el.addEventListener("click", () => openEvent(el.dataset.eventId, events))
    );
  }

  function renderAttention(events, asOf) {
    const items = events
      .filter(matchesFilters)
      .filter(e => e.releaseDate <= asOf)
      .filter(e => ["confirmed", "likely", "manual"].includes(e.status))
      .sort((a, b) => b.releaseDate - a.releaseDate);

    els.attentionCount.textContent = items.length;
    els.attentionList.innerHTML = items.length
      ? items.map(e => {
          const acc = accountById.get(e.accountId);
          const status = statusMeta[e.status];
          return `<div class="attention-item" data-attention-id="${e.id}">
            <div class="row">
              <div class="title">${escapeHtml(acc.bank)} · ${escapeHtml(acc.name)}${acc.suffix ? " •" + escapeHtml(acc.suffix) : ""}</div>
              <span class="status-pill" style="--pill-color:${status.color}">${escapeHtml(status.label)}</span>
            </div>
            <div class="meta">${escapeHtml(ownerById.get(acc.owner)?.name || acc.owner)} · ${periodLabel(e)} · release ${fmtDate(e.releaseDate)}</div>
          </div>`;
        }).join("")
      : '<div class="empty-state">Nothing currently needs attention.</div>';

    els.attentionList.querySelectorAll("[data-attention-id]").forEach(el =>
      el.addEventListener("click", () => openEvent(el.dataset.attentionId, events))
    );
  }

  function eventChipHtml(e) {
    const acc = accountById.get(e.accountId);
    const meta = statusMeta[e.status] || statusMeta.unknown;
    return `<button class="event-chip" data-event-id="${e.id}" style="--event-color:${meta.color}" title="${escapeHtml(meta.label)}">
      <strong>${escapeHtml(acc.bank)} ${acc.suffix ? "•" + escapeHtml(acc.suffix) : escapeHtml(acc.name)}</strong>
      <span>${escapeHtml(ownerById.get(acc.owner)?.name || acc.owner)} · ${shortPeriodLabel(e)}</span>
    </button>`;
  }

  function buildEventsForRange(from, to, asOf) {
    const generated = [];
    DATA.accounts.forEach(acc => generated.push(...generateAccountEvents(acc, from, to)));

    const actualByKey = new Map();
    DATA.statements.forEach(s => {
      actualByKey.set(statementKey(s.accountId, s.periodEnd, s.expectedReleaseDate), s);
    });

    const merged = [];
    generated.forEach(g => {
      const key = statementKey(
        g.accountId,
        g.periodEnd ? iso(g.periodEnd) : null,
        iso(g.releaseDate)
      );
      const actual = actualByKey.get(key);
      merged.push(actual ? normalizeActual(actual, asOf) : resolveGeneratedStatus(g, asOf));
    });

    DATA.statements.forEach(s => {
      const normalized = normalizeActual(s, asOf);
      if (normalized.releaseDate < from || normalized.releaseDate > addMonths(to, 1)) return;
      if (!merged.some(e => e.id === normalized.id)) merged.push(normalized);
    });

    return merged.map(applyOverride).sort((a, b) => a.releaseDate - b.releaseDate);
  }

  function generateAccountEvents(acc, from, to) {
    const rule = acc.rule || { type: "manual" };
    const out = [];
    if (rule.type === "manual") return out;

    const cursor = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    const endCursor = new Date(to.getFullYear(), to.getMonth() + 1, 1);

    while (cursor <= endCursor) {
      const y = cursor.getFullYear();
      const m = cursor.getMonth();
      let event = null;

      if (rule.type === "calendarMonth") {
        event = makeGeneratedEvent(
          acc,
          new Date(y, m, 1),
          new Date(y, m + 1, 0),
          new Date(y, m + 1, rule.releaseDay || 2)
        );
      }

      if (rule.type === "fixedRange") {
        const periodEnd = safeDate(y, m, rule.endDay);
        const startMonth = rule.startDay > rule.endDay ? m - 1 : m;
        event = makeGeneratedEvent(
          acc,
          safeDate(y, startMonth, rule.startDay),
          periodEnd,
          safeDate(y, m, rule.releaseDay || rule.endDay + 1)
        );
      }

      if (rule.type === "releaseDayOnly") {
        event = makeGeneratedEvent(acc, null, null, safeDate(y, m, rule.releaseDay || 27));
      }

      if (rule.type === "quarterly" && [2, 5, 8, 11].includes(m)) {
        event = makeGeneratedEvent(
          acc,
          new Date(y, m - 2, 1),
          new Date(y, m + 1, 0),
          new Date(y, m + 1, rule.releaseDay || 3)
        );
      }

      if (event && event.releaseDate >= from && event.releaseDate <= addMonths(to, 1)) {
        out.push(event);
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }

  function makeGeneratedEvent(acc, periodStart, periodEnd, releaseDate) {
    const token = periodEnd ? iso(periodEnd) : iso(releaseDate);
    return {
      id: `pred-${acc.id}-${token}`,
      accountId: acc.id,
      periodStart,
      periodEnd,
      releaseDate,
      status: "expected",
      source: "cycle rule",
      generated: true
    };
  }

  function normalizeActual(s, asOf) {
    const acc = accountById.get(s.accountId);
    const releaseDate = parseDate(s.actualReleaseDate || s.expectedReleaseDate);
    const periodStart = s.periodStart ? parseDate(s.periodStart) : null;
    const periodEnd = s.periodEnd ? parseDate(s.periodEnd) : null;
    let status = s.status || "unknown";
    if (!["imported", "uploaded", "confirmed"].includes(status)) {
      status = resolvePredictedStatus(acc, releaseDate, asOf);
    }
    return { ...s, periodStart, periodEnd, releaseDate, status, generated: false };
  }

  function resolveGeneratedStatus(e, asOf) {
    const acc = accountById.get(e.accountId);
    return { ...e, status: resolvePredictedStatus(acc, e.releaseDate, asOf) };
  }

  function resolvePredictedStatus(acc, releaseDate, asOf) {
    if (releaseDate > asOf) return "expected";
    if (acc.rule?.type === "manual" || acc.confidence === "low") return "manual";
    return "likely";
  }

  function matchesFilters(e) {
    const acc = accountById.get(e.accountId);
    if (!acc) return false;
    if (els.ownerFilter.value && acc.owner !== els.ownerFilter.value) return false;
    if (els.bankFilter.value && acc.bank !== els.bankFilter.value) return false;
    if (els.statusFilter.value && e.status !== els.statusFilter.value) return false;

    const q = els.searchBox.value.trim().toLowerCase();
    if (q) {
      const haystack = `${acc.bank} ${acc.name} ${acc.suffix} ${ownerById.get(acc.owner)?.name || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }

  function openEvent(id, events) {
    activeEvent = events.find(e => e.id === id);
    if (!activeEvent) return;

    const acc = accountById.get(activeEvent.accountId);
    const stat = statusMeta[activeEvent.status] || statusMeta.unknown;

    els.dialogEyebrow.textContent = `${ownerById.get(acc.owner)?.name || acc.owner} · ${acc.bank}`;
    els.dialogTitle.textContent = `${acc.name}${acc.suffix ? " •" + acc.suffix : ""}`;
    els.dialogBody.innerHTML = [
      detail("Status", `<span class="status-pill" style="--pill-color:${stat.color}">${escapeHtml(stat.label)}</span>`),
      detail("Statement period", periodLabel(activeEvent)),
      detail("Release date", fmtDate(activeEvent.releaseDate)),
      detail("Cadence", cadenceLabel(acc.cadence)),
      detail("Prediction confidence", confidenceLabel(acc.confidence)),
      detail("Status source", escapeHtml(activeEvent.source || "cycle rule")),
      detail("Notes", escapeHtml(acc.notes || "—"))
    ].join("");

    els.localStatusSelect.value = localOverrides[activeEvent.id]?.status || "";
    els.eventDialog.showModal();
  }

  function saveLocalStatus() {
    if (!activeEvent) return;
    const status = els.localStatusSelect.value;
    if (!status) delete localOverrides[activeEvent.id];
    else localOverrides[activeEvent.id] = { status, updatedAt: iso(new Date()) };

    localStorage.setItem("statement-calendar-overrides", JSON.stringify(localOverrides));
    els.eventDialog.close();
    render();
  }

  function applyOverride(e) {
    const override = localOverrides[e.id];
    return override?.status ? { ...e, status: override.status, localOverride: true } : e;
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

  function statementKey(accountId, periodEnd, releaseDate) {
    return `${accountId}|${periodEnd || "unknown"}|${releaseDate || "unknown"}`;
  }

  function detail(key, value) {
    return `<dl class="detail-row"><dt>${escapeHtml(key)}</dt><dd>${value}</dd></dl>`;
  }

  function periodLabel(e) {
    if (!e.periodStart || !e.periodEnd) return "Exact period should be confirmed from source statement";
    return `${fmtDate(e.periodStart)} — ${fmtDate(e.periodEnd)}`;
  }

  function shortPeriodLabel(e) {
    if (!e.periodStart || !e.periodEnd) return "period pending";
    return `${shortDate(e.periodStart)}–${shortDate(e.periodEnd)}`;
  }

  function cadenceLabel(value) {
    return ({ monthly: "Monthly", quarterly: "Quarterly", unknown: "Not confirmed" })[value] || value;
  }

  function confidenceLabel(value) {
    return ({ high: "High", medium: "Medium", low: "Low" })[value] || value;
  }

  function fmtDate(d) {
    return new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "short", year: "numeric" }).format(d);
  }

  function shortDate(d) {
    return new Intl.DateTimeFormat("en-CA", { day: "2-digit", month: "short" }).format(d);
  }

  function parseDate(s) {
    return new Date(`${s}T12:00:00`);
  }

  function iso(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function safeDate(year, month, day) {
    return new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()));
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function addMonths(d, n) {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n);
    return x;
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[c]);
  }
})();
