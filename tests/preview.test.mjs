import test from "node:test";
import assert from "node:assert/strict";
import { previewNumber, snippetsFor, rateLimitExample, SAMPLES, parsePhone } from "../js/preview.js";

test("a published sample returns a 0-100 score and no live lookup", () => {
  const result = previewNumber("+1 (202) 555-0147", { now: "2026-10-08T12:00:00.000Z" });
  assert.equal(result.status, 200);
  assert.equal(result.body.live_lookup, false);
  assert.equal(result.body.mode, "sandbox");
  assert.equal(result.body.number.e164, "+12025550147");
  assert.equal(result.body.reputation.risk_score, 8);
  assert.equal(result.body.reputation.risk_level, "low");
  assert.equal(result.body.reputation.recommendation, "allow");
  assert.equal(result.body.line.type, "mobile");
  assert.equal(result.body.checked_at, "2026-10-08T12:00:00.000Z");
  assert.equal(Object.hasOwn(result.body, "subscriber_name"), false);
});

test("every sample score matches its level and recommendation", () => {
  const expectations = {
    "+12025550147": ["low", "allow"],
    "+18005550199": ["medium", "challenge"],
    "+19005550199": ["high", "block"],
    "+447700900123": ["high", "block"]
  };
  for (const sample of SAMPLES) {
    const result = previewNumber(sample.e164);
    const [level, recommendation] = expectations[sample.e164];
    assert.equal(result.body.reputation.risk_level, level);
    assert.equal(result.body.reputation.recommendation, recommendation);
    assert.ok(result.body.reputation.risk_score >= 0);
    assert.ok(result.body.reputation.risk_score <= 100);
    assert.equal(result.body.sandbox.matched_sample, true);
  }
});

test("an unlisted valid number does not invent a spam score", () => {
  const result = previewNumber("+14155550110");
  assert.equal(result.status, 200);
  assert.equal(result.body.sandbox.matched_sample, false);
  assert.equal(result.body.reputation.risk_score, null);
  assert.equal(result.body.reputation.recommendation, "no_reputation_in_sandbox");
  assert.equal(result.body.line.carrier_name, null);
  assert.equal(result.body.live_lookup, false);
});

test("toll-free and premium prefixes are classified without a reputation score", () => {
  const tollFree = previewNumber("+18885550123");
  assert.equal(tollFree.body.line.type, "toll_free");
  assert.equal(tollFree.body.reputation.risk_score, null);
  const premium = previewNumber("+19005550100");
  assert.equal(premium.body.line.type, "premium");
  assert.equal(premium.body.reputation.risk_score, null);
});

test("empty and letter-laden input is a 400", () => {
  assert.equal(previewNumber("   ").status, 400);
  assert.equal(previewNumber("   ").body.error.code, "invalid_number");
  assert.equal(previewNumber("call-me").status, 400);
  assert.equal(parsePhone("+12").ok, false);
});

test("snippets include the active number and do not embed a key", () => {
  const snippets = snippetsFor("+19005550199");
  for (const source of [snippets.curl, snippets.python, snippets.node]) {
    assert.match(source, /%2B19005550199|\+19005550199/);
    assert.match(source, /LINEWISE_API_KEY/);
    assert.equal(source.includes("sk_live"), false);
  }
});

test("the documented free-tier error names the 100 request daily quota", () => {
  const example = rateLimitExample();
  assert.equal(example.status, 429);
  assert.equal(example.body.error.limit, 100);
  assert.equal(example.headers["X-RateLimit-Limit"], "100");
  assert.equal(example.headers["Retry-After"], "36");
});
