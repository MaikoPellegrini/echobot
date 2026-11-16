const crypto = require("node:crypto");

function safeEqualStrings(value, expected) {
  if (typeof value !== "string" || typeof expected !== "string") return false;
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return valueBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(valueBuffer, expectedBuffer);
}

function verifyMetaSignature(rawBody, signature, appSecret) {
  if (
    !Buffer.isBuffer(rawBody) ||
    typeof signature !== "string" ||
    !/^sha256=[a-f0-9]{64}$/i.test(signature) ||
    typeof appSecret !== "string" ||
    !appSecret
  ) {
    return false;
  }

  const expected = `sha256=${crypto
      .createHmac("sha256", appSecret)
      .update(rawBody)
      .digest("hex")}`;
  return safeEqualStrings(signature.toLowerCase(), expected);
}

module.exports = {
  safeEqualStrings,
  verifyMetaSignature,
};
