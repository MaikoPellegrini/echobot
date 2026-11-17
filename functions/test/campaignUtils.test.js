const {test} = require("node:test");
const assert = require("node:assert/strict");
const {
  campaignMatchesKeyword,
  personalizeMessage,
  shouldBindNextPost,
  resolveCampaignTargetType,
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

test("shouldBindNextPost verifies media timestamp is after campaign creation", () => {
  const campaignCreated = new Date("2026-11-16T12:00:00Z");
  const postPublishedAfter = "2026-11-16T14:30:00Z";
  const postPublishedBefore = "2026-11-16T10:00:00Z";

  assert.equal(shouldBindNextPost(postPublishedAfter, campaignCreated), true);
  assert.equal(shouldBindNextPost(postPublishedBefore, campaignCreated), false);

  // Firestore Timestamp-like mock
  const firestoreTimestamp = { toMillis: () => campaignCreated.getTime() };
  assert.equal(shouldBindNextPost(postPublishedAfter, firestoreTimestamp), true);
  assert.equal(shouldBindNextPost(postPublishedBefore, firestoreTimestamp), false);

  // Missing args
  assert.equal(shouldBindNextPost(null, campaignCreated), false);
  assert.equal(shouldBindNextPost(postPublishedAfter, null), false);
});

test("resolveCampaignTargetType preserves explicit targetType or falls back", () => {
  assert.equal(resolveCampaignTargetType({ targetType: "next_post" }), "next_post");
  assert.equal(resolveCampaignTargetType({ targetType: "specific_post" }), "specific_post");
  assert.equal(resolveCampaignTargetType({ targetType: "all_posts" }), "all_posts");

  // Backward compatibility with legacy postId
  assert.equal(resolveCampaignTargetType({ postId: "1789569" }), "specific_post");
  assert.equal(resolveCampaignTargetType({ mediaId: "1789569" }), "specific_post");
  assert.equal(resolveCampaignTargetType({ postId: "any" }), "all_posts");
  assert.equal(resolveCampaignTargetType({ postId: "" }), "all_posts");
  assert.equal(resolveCampaignTargetType({}), "all_posts");
});
