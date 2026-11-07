const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const repoRoot = path.resolve(__dirname, "..");
const dataPath = path.join(repoRoot, "data", "statements.js");
const source = fs.readFileSync(dataPath, "utf8");

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(source, sandbox);

const data = sandbox.window.statementCalendarData;
assert(data, "demo data should load");

const allowedOwners = new Set(["Alex", "Taylor"]);
const allowedInstitutions = new Set([
  "North Bank",
  "Maple Credit Union",
  "Demo Brokerage",
  "Demo Savings Co."
]);

for (const owner of data.owners) {
  assert(allowedOwners.has(owner.name), "owners must remain explicitly approved fictional identities");
}

for (const account of data.accounts) {
  assert(allowedInstitutions.has(account.institution), "institutions must remain explicitly approved fictional demo institutions");
  assert(account.owner, "account must define owner");
  assert(account.cadence, "account must define cadence");
  assert(account.rule, "account must define a prediction rule");
  assert(
    !account.suffix || /^\d{4}$/.test(account.suffix),
    "demo suffix should be blank or exactly four fictional digits"
  );

  const forbiddenAccountFields = [
    "balance",
    "transactions",
    "address",
    "accountNumber",
    "fullAccountNumber",
    "apiKey",
    "token",
    "secret",
    "password"
  ];

  for (const field of forbiddenAccountFields) {
    assert(!(field in account), `public demo account must not contain sensitive field: ${field}`);
  }
}

for (const statement of data.statements) {
  assert(statement.accountId, "statement must reference an account");
  assert(statement.status, "statement must define status");
  assert(statement.expectedReleaseDate, "statement must define expectedReleaseDate");

  const forbiddenStatementFields = [
    "balance",
    "transactions",
    "address",
    "accountNumber",
    "fullAccountNumber",
    "pdf",
    "pdfPath",
    "apiKey",
    "token",
    "secret",
    "password"
  ];

  for (const field of forbiddenStatementFields) {
    assert(!(field in statement), `public demo statement must not contain sensitive field: ${field}`);
  }
}

console.log("privacy.test.js: all assertions passed");
