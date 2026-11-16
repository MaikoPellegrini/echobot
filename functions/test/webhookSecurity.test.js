const crypto = require("node:crypto");
const {test} = require("node:test");
const assert = require("node:assert/strict");
const {
  safeEqualStrings,
  verifyMetaSignature,
} = require("../webhookSecurity");

test("verifies the Meta HMAC signature over the raw body", () => {
  const rawBody = Buffer.from('{"object":"instagram"}');
  const secret = "test-secret";
  const signature = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex")}`;

  assert.equal(verifyMetaSignature(rawBody, signature, secret), true);
  assert.equal(verifyMetaSignature(rawBody, signature, "wrong-secret"), false);
  assert.equal(verifyMetaSignature(Buffer.from("{}"), signature, secret), false);
});

test("rejects malformed signatures and compares verification tokens safely", () => {
  assert.equal(verifyMetaSignature(Buffer.from("{}"), "sha256=bad", "secret"), false);
  assert.equal(verifyMetaSignature(Buffer.from("{}"), null, "secret"), false);
  assert.equal(safeEqualStrings("token", "token"), true);
  assert.equal(safeEqualStrings("token", "other"), false);
  assert.equal(safeEqualStrings(undefined, "token"), false);
});
