const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../js/domain.js"), "utf8");
const context = {};
vm.createContext(context);
vm.runInContext(`${source}\nthis.domain = FrontendDomain;`, context);
const domain = context.domain;

test("straight-line depreciation never produces a negative value", () => {
  assert.equal(domain.calculateStraightLineBookValue(1000, 20, 2), 600);
  assert.equal(domain.calculateStraightLineBookValue(1000, 20, 9), 0);
  assert.equal(domain.calculateStraightLineBookValue(-10, 20, 1), 0);
});

test("system theme follows the browser while explicit themes win", () => {
  assert.equal(domain.resolveTheme("system", true), "dark");
  assert.equal(domain.resolveTheme("system", false), "light");
  assert.equal(domain.resolveTheme("light", true), "light");
});

test("API errors expose the safe server message", () => {
  assert.equal(
    domain.parseApiErrorMessage(
      new Error('API Error 400: {"error":"Invalid request"}'),
    ),
    "Invalid request",
  );
  assert.equal(
    domain.parseApiErrorMessage("Network unavailable"),
    "Network unavailable",
  );
});
