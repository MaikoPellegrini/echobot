const {test} = require("node:test");
const assert = require("node:assert/strict");
const {
  campaignMatchesKeyword,
  personalizeMessage,
} = require("../campaignUtils");

test("exact match requires the complete normalized comment", () => {
  assert.equal(campaignMatchesKeyword(" LINK ", "link", "exact"), true);
  assert.equal(campaignMatchesKeyword("quero link", "link", "exact"), false);
  assert.equal(campaignMatchesKeyword("LINK extra", "link", "exact"), false);
});

test("partial match handles case and Unicode normalization", () => {
  assert.equal(campaignMatchesKeyword("Quero Café", "cafe\u0301"), true);
  assert.equal(campaignMatchesKeyword("quero informações", "link"), false);
});

test("empty keyword does not match", () => {
  assert.equal(campaignMatchesKeyword("qualquer texto", " "), false);
});

test("personalizes username and provides a fallback", () => {
  assert.equal(personalizeMessage("Olá {nome}!", "@maiko"), "Olá @maiko!");
  assert.equal(personalizeMessage("Olá {NOME}!", ""), "Olá você!");
});
