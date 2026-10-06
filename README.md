# Statement Calendar

A small local-first web app for tracking when bank, credit-card and investment statements are expected, available, uploaded, and processed.

## Why this exists

Statement dates are often scattered across different banks and brokers. Some accounts issue monthly statements, some quarterly, and some do not have a reliable cycle at all.

Statement Calendar gives you one place to see:

- expected statement release dates;
- statement period covered by each document;
- account owner;
- institution and account label;
- confidence of the prediction;
- whether the statement is expected, likely available, confirmed, uploaded, or processed;
- statements that should already be available as of any date you select.

## Privacy model

This example repository contains **demo data only**.

For real financial use, keep personal statement metadata in a separate **private repository**. Do not commit balances, transaction details, full account numbers, addresses, tax IDs, or credentials.

## Run locally

No build step and no dependencies are required.

Open `index.html` directly, or run:

```bash
python3 -m http.server 8080
```

Then open:

`http://localhost:8080`

## Data model

Edit:

`data/statements.js`

The two main collections are:

- `accounts` — cadence rules, owner, institution, confidence, account label.
- `statements` — known statement periods and status history.

Supported statuses:

- `imported` — processed into the destination finance system.
- `uploaded` — source statement received.
- `confirmed` — institution notification confirms the statement is available.
- `likely` — predicted release date has passed.
- `expected` — predicted for the future.
- `manual` — cadence is not reliable enough to predict.

## Prediction rules

The demo supports:

- calendar-month statements;
- fixed start/end day cycles;
- release-day-only cycles;
- quarterly statements;
- manual accounts with no prediction rule.

Predictions are intentionally conservative: if the cadence is not supported by evidence, leave it as `manual`.

## Local overrides

You can click a calendar event and locally mark it as confirmed, uploaded, imported, or manual.

These overrides are stored in browser `localStorage`.

Use **Export statuses** to download the local override JSON for later merging into the canonical data file.

## Suggested workflow

1. Keep this repository as the reusable generic example.
2. Fork or copy it into a private repository for real financial data.
3. Update `data/statements.js` after receiving new statements.
4. Periodically reconcile predicted dates with actual release dates.
5. Tighten an account's confidence only after its cycle is supported by real history.

## License

MIT
