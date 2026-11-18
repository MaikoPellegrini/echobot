const {test} = require("node:test");
const assert = require("node:assert/strict");
const {
  extractKeywords,
  campaignMatchesKeyword,
  personalizeMessage,
  shouldBindNextPost,
  resolveCampaignTargetType,
} = require("../campaignUtils");

test("extractKeywords handles arrays and comma/semicolon/newline separated strings", () => {
  assert.deepEqual(
      extractKeywords("PARABÉNS, PARABENS, LINDA, MEU, AMOR"),
      ["parabéns", "parabens", "linda", "meu", "amor"],
  );
  assert.deepEqual(
      extractKeywords(["QUERO", "link", " INFO "]),
      ["quero", "link", "info"],
  );
  assert.deepEqual(
      extractKeywords("primeiro; segundo\nterceiro, quarto"),
      ["primeiro", "segundo", "terceiro", "quarto"],
  );
  assert.deepEqual(extractKeywords(""), []);
  assert.deepEqual(extractKeywords("   ,  ;  "), []);
});

test("exact match with multiple keywords", () => {
  const multiKeywords = "PARABÉNS, PARABENS, LINDA, MEU, AMOR";

  // Matches any individual keyword from the list
  assert.equal(campaignMatchesKeyword("PARABÉNS", multiKeywords, "exact"), true);
  assert.equal(campaignMatchesKeyword("parabens", multiKeywords, "exact"), true);
  assert.equal(campaignMatchesKeyword("linda", multiKeywords, "exact"), true);
  assert.equal(campaignMatchesKeyword("amor", multiKeywords, "exact"), true);

  // Matches with punctuation e.g. "Parabéns!" or "#linda"
  assert.equal(campaignMatchesKeyword("Parabéns!", multiKeywords, "exact"), true);
  assert.equal(campaignMatchesKeyword("#LINDA", multiKeywords, "exact"), true);

  // Accent-insensitive fallback (parabens matches parabéns and vice-versa)
  assert.equal(campaignMatchesKeyword("parabens", "PARABÉNS", "exact"), true);
  assert.equal(campaignMatchesKeyword("parabéns", "PARABENS", "exact"), true);

  // Non-matching comments
  assert.equal(campaignMatchesKeyword("outro comentário qualquer", multiKeywords, "exact"), false);
  assert.equal(campaignMatchesKeyword("quero link", multiKeywords, "exact"), false);
});

test("partial match with multiple keywords", () => {
  const multiKeywords = "PARABÉNS, PARABENS, LINDA, MEU, AMOR";

  assert.equal(campaignMatchesKeyword("Nossa você é muito linda parabéns!", multiKeywords, "partial"), true);
  assert.equal(campaignMatchesKeyword("meu grande amigo", multiKeywords, "partial"), true);
  assert.equal(campaignMatchesKeyword("Muito sucesso meu amor", multiKeywords, "partial"), true);
  assert.equal(campaignMatchesKeyword("Bom dia pessoal", multiKeywords, "partial"), false);
});

test("multiple keywords passed as array", () => {
  const arrayKeywords = ["QUERO", "EU QUERO", "LINK"];
  assert.equal(campaignMatchesKeyword("quero", arrayKeywords, "exact"), true);
  assert.equal(campaignMatchesKeyword("eu quero", arrayKeywords, "exact"), true);
  assert.equal(campaignMatchesKeyword("por favor me manda o link", arrayKeywords, "partial"), true);
  assert.equal(campaignMatchesKeyword("nada haver", arrayKeywords, "partial"), false);
});

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
