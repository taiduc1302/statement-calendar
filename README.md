# Statement Calendar

Statement Calendar is a small local-first web app for tracking when bank, credit-card and investment statements are expected, likely available, confirmed, uploaded and imported.

It is intentionally generic: the repository contains **fictional demo data only** and can be cloned and adapted for a person, household or small finance workflow.

## What it does

- Month calendar with expected and actual statement release occurrences.
- User-selectable **as-of date**.
- Rule-based future statement prediction.
- **Needs Attention** queue for likely, confirmed and overdue manual items.
- Filters for owner, institution, account, status and cadence.
- Statement detail panel with expected vs actual release dates.
- Account timeline showing statement history and missing cycles.
- Dashboard cards for:
  - Expected soon
  - Likely available
  - Confirmed
  - Waiting for upload
  - Imported
  - Missing / gaps
- Browser-local status overrides with JSON export.

## Privacy model

This is a public example repository.

The committed data must remain fictional. Do not commit:

- real names;
- real account numbers or real account suffixes;
- balances;
- transactions;
- addresses;
- real statement PDFs;
- identifying statement cycles;
- credentials, secrets, API keys or tokens.

For real use, copy or fork the project into a **private repository** and keep the public repository as a sanitized demo.

## Demo data

The example configuration uses fictional identities and institutions such as:

- Alex
- Taylor
- North Bank
- Maple Credit Union
- Demo Brokerage

The demo suffixes and statement dates are invented for this project.

## Run locally

No build step is required.

You can open `index.html` directly, or serve the directory:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Tests

Node.js is only used for the dependency-free test suite.

```bash
npm test
```

The tests cover the prediction engine and a basic public-demo privacy guard.

No GitHub Actions workflow is required.

## Data model

Edit:

```text
data/statements.js
```

### Account

Each account defines:

```js
{
  id: "north-chequing",
  owner: "alex",
  institution: "North Bank",
  name: "Everyday Chequing",
  suffix: "1234",
  cadence: "monthly",
  confidence: "high",
  rule: {
    type: "calendarMonth",
    releaseDay: 2,
    toleranceDays: 3
  },
  notes: "Demo calendar-month account."
}
```

Supported cadence values in the demo:

- `monthly`
- `quarterly`
- `irregular`

### Statement

Known statements use:

```js
{
  id: "north-chequing-2026-09",
  accountId: "north-chequing",
  periodStart: "2026-09-01",
  periodEnd: "2026-09-30",
  expectedReleaseDate: "2026-10-02",
  actualReleaseDate: "2026-10-02",
  status: "uploaded",
  source: "demo statement record",
  notes: "Optional note"
}
```

## Status model

- `expected` — expected release date is still in the future.
- `likely` — expected release date has passed and no stronger evidence is recorded.
- `confirmed` — a notification or other evidence confirms availability.
- `uploaded` — the source PDF has been obtained.
- `imported` — the statement has been processed/imported.
- `manual` — the statement cycle is not reliable enough for automatic prediction.

## Prediction engine

Prediction logic lives in `engine.js`, separate from the browser UI.

Supported rules:

### Calendar month

```js
rule: {
  type: "calendarMonth",
  releaseDay: 2,
  toleranceDays: 3
}
```

A calendar-month statement covers the first through last day of a month and is expected on a configured day in the following month.

### Fixed range

```js
rule: {
  type: "fixedRange",
  startDay: 9,
  endDay: 8,
  releaseDay: 9,
  toleranceDays: 2
}
```

Useful for credit cards with a recurring billing-cycle closing day.

### Quarterly

```js
rule: {
  type: "quarterly",
  quarterEndMonths: [3, 6, 9, 12],
  releaseMonthOffset: 1,
  releaseDay: 3,
  toleranceDays: 5
}
```

### Release day only

Use when the release day is predictable but the precise statement period is not.

### Manual

```js
rule: { type: "manual" }
```

Use this instead of inventing a pattern when the cycle is uncertain.

## Gap detection

A generated monthly or quarterly statement becomes a **missing / gap** candidate when:

1. its expected release date has passed;
2. the configured `toleranceDays` has also elapsed; and
3. no matching known statement has replaced the prediction.

This keeps gap detection rule-driven instead of hardcoding every future month.

## Local overrides

Click a statement and locally mark it as:

- confirmed;
- uploaded;
- imported;
- manual.

Overrides are stored only in browser `localStorage`.

Use **Export local statuses** to download the override JSON.

## Customizing the app

A typical private adaptation only needs to change:

1. `owners` in `data/statements.js`;
2. account definitions and rules;
3. known statement history.

The UI and prediction engine should not need account-specific hardcoding.

## Project structure

```text
.
├── index.html
├── app.js
├── engine.js
├── styles.css
├── data/
│   └── statements.js
├── tests/
│   ├── engine.test.js
│   └── privacy.test.js
├── package.json
└── LICENSE
```

## Design principles

- Local-first.
- No framework or build dependency for the app.
- Rules instead of manually entering every future statement.
- Conservative predictions.
- Explicit confidence and source information.
- Public demo data stays fictional.
- Real financial data belongs in a private environment.

## License

MIT
