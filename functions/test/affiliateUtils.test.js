const {test} = require("node:test");
const assert = require("node:assert/strict");
const {
  generateShopeeSignature,
  generateShopeeAuthHeader,
  formatAmazonAffiliateUrl,
  formatAwinAffiliateUrl,
  formatLomadeeAffiliateUrl,
  formatRakutenAffiliateUrl,
  formatAdmitadAffiliateUrl,
  appendTrackingTag,
} = require("../affiliateUtils");

test("generateShopeeSignature generates deterministic SHA256 hex string", () => {
  const appId = "123456";
  const secret = "secret_key_abc";
  const payload = JSON.stringify({ query: "{ test }" });
  const timestamp = 1700000000;

  const sig1 = generateShopeeSignature(appId, secret, payload, timestamp);
  const sig2 = generateShopeeSignature(appId, secret, payload, timestamp);

  assert.equal(typeof sig1, "string");
  assert.equal(sig1.length, 64);
  assert.equal(sig1, sig2);

  const header = generateShopeeAuthHeader(appId, secret, payload, timestamp);
  assert.match(header, /^SHA256 Credential=123456, Timestamp=1700000000, Signature=[a-f0-9]{64}$/);
});

test("formatAmazonAffiliateUrl sets partner tag and ascsubtag correctly", () => {
  const original = "https://www.amazon.com.br/dp/B09V3HN1KC";
  const result = formatAmazonAffiliateUrl(original, "echobot-20", "instagram_bio");

  const url = new URL(result);
  assert.equal(url.searchParams.get("tag"), "echobot-20");
  assert.equal(url.searchParams.get("ascsubtag"), "instagram_bio");
});

test("formatAwinAffiliateUrl creates deep link with publisher id and clickref", () => {
  const original = "https://www.loja.com.br/produto/123";
  const result = formatAwinAffiliateUrl(original, "998877", "post_reel");

  assert.ok(result.includes("awinaffid=998877"));
  assert.ok(result.includes(encodeURIComponent(original)));
  assert.ok(result.includes("clickref=post_reel"));
});

test("formatLomadeeAffiliateUrl creates deep link with sourceId", () => {
  const original = "https://www.magazineluiza.com.br/p/456";
  const result = formatLomadeeAffiliateUrl(original, "source_123", "dm_direct");

  assert.ok(result.includes("sourceId=source_123"));
  assert.ok(result.includes(encodeURIComponent(original)));
  assert.ok(result.includes("utm_source=dm_direct"));
});

test("formatRakutenAffiliateUrl creates deep link", () => {
  const original = "https://www.nike.com.br/air-jordan";
  const result = formatRakutenAffiliateUrl(original, "rakuten_pub", "story_link");

  assert.ok(result.includes("id=rakuten_pub"));
  assert.ok(result.includes(encodeURIComponent(original)));
  assert.ok(result.includes("u1=story_link"));
});

test("formatAdmitadAffiliateUrl creates deep link", () => {
  const original = "https://aliexpress.com/item/1000";
  const result = formatAdmitadAffiliateUrl(original, "admitad_token_abc", "dm_promo");

  assert.ok(result.includes("/g/admitad_token_abc/"));
  assert.ok(result.includes(encodeURIComponent(original)));
  assert.ok(result.includes("subid=dm_promo"));
});

test("appendTrackingTag appends src and utm_source with correct separator", () => {
  const cleanUrl = "https://kiwify.com.br/curso-online";
  const tracked1 = appendTrackingTag(cleanUrl, "echobot_dm");
  assert.ok(tracked1.includes("?src=echobot_dm&utm_source=echobot_dm"));

  const urlWithQuery = "https://kiwify.com.br/curso-online?ref=abc";
  const tracked2 = appendTrackingTag(urlWithQuery, "echobot_dm");
  assert.ok(tracked2.includes("&src=echobot_dm&utm_source=echobot_dm"));
});
