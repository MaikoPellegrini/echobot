const crypto = require("node:crypto");
const axios = require("axios");

const SHOPEE_GRAPHQL_ENDPOINT = "https://open-api.affiliate.shopee.com.br/graphql";

/**
 * Generate Shopee API Authorization header using SHA256
 * factor = AppId + Timestamp + Payload + Secret
 */
function generateShopeeSignature(appId, secret, payload, timestamp) {
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const factor = `${appId}${timestamp}${payloadStr}${secret}`;
  return crypto.createHash("sha256").update(factor).digest("hex");
}

function generateShopeeAuthHeader(appId, secret, payload, timestamp) {
  const ts = timestamp || Math.floor(Date.now() / 1000);
  const signature = generateShopeeSignature(appId, secret, payload, ts);
  return `SHA256 Credential=${appId}, Timestamp=${ts}, Signature=${signature}`;
}

/**
 * Format Amazon Associates URL with Partner Tag and ascsubtag
 */
function formatAmazonAffiliateUrl(originalUrl, partnerTag, utmSource = "echobot_dm") {
  try {
    const url = new URL(originalUrl);
    url.searchParams.set("tag", partnerTag);
    if (utmSource) {
      url.searchParams.set("ascsubtag", utmSource);
    }
    return url.toString();
  } catch {
    // If not a full URL, append parameters
    const separator = originalUrl.includes("?") ? "&" : "?";
    return `${originalUrl}${separator}tag=${encodeURIComponent(partnerTag)}&ascsubtag=${encodeURIComponent(utmSource)}`;
  }
}

/**
 * Format Awin deep link
 */
function formatAwinAffiliateUrl(originalUrl, publisherId, utmSource = "echobot_dm") {
  return `https://www.awin1.com/cread.php?awinaffid=${encodeURIComponent(publisherId)}&ued=${encodeURIComponent(originalUrl)}&clickref=${encodeURIComponent(utmSource)}`;
}

/**
 * Format Lomadee deep link
 */
function formatLomadeeAffiliateUrl(originalUrl, sourceIdOrToken, utmSource = "echobot_dm") {
  return `https://redir.lomadee.com/v2/deeplink?sourceId=${encodeURIComponent(sourceIdOrToken)}&url=${encodeURIComponent(originalUrl)}&utm_source=${encodeURIComponent(utmSource)}`;
}

/**
 * Format Rakuten deep link
 */
function formatRakutenAffiliateUrl(originalUrl, publisherId, utmSource = "echobot_dm") {
  return `https://click.linksynergy.com/deeplink?id=${encodeURIComponent(publisherId)}&murl=${encodeURIComponent(originalUrl)}&u1=${encodeURIComponent(utmSource)}`;
}

/**
 * Format Admitad deep link
 */
function formatAdmitadAffiliateUrl(originalUrl, token, utmSource = "echobot_dm") {
  return `https://ad.admitad.com/g/${encodeURIComponent(token)}/?ulp=${encodeURIComponent(originalUrl)}&subid=${encodeURIComponent(utmSource)}`;
}

/**
 * Append general tracking parameters (src and utm_source)
 */
function appendTrackingTag(url, utmSource = "echobot_dm") {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set("src", utmSource);
    urlObj.searchParams.set("utm_source", utmSource);
    return urlObj.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}src=${encodeURIComponent(utmSource)}&utm_source=${encodeURIComponent(utmSource)}`;
  }
}

/**
 * Call Shopee Affiliate GraphQL API to generate tracked short link
 */
async function generateShopeeShortLink(appId, secret, originalUrl, utmSource = "echobot_dm") {
  const query = `mutation { generateShortLink(input: { originUrl: "${originalUrl}", subIds: ["${utmSource}"] }) { shortLink } }`;
  const payload = { query };
  const timestamp = Math.floor(Date.now() / 1000);
  const authHeader = generateShopeeAuthHeader(appId, secret, payload, timestamp);

  const response = await axios.post(SHOPEE_GRAPHQL_ENDPOINT, payload, {
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    timeout: 10000,
  });

  const shortLink = response.data?.data?.generateShortLink?.shortLink;
  if (!shortLink) {
    if (response.data?.errors?.length) {
      throw new Error(response.data.errors[0].message || "Erro na API Shopee");
    }
    throw new Error("Não foi possível gerar shortlink na Shopee.");
  }
  return shortLink;
}

module.exports = {
  generateShopeeSignature,
  generateShopeeAuthHeader,
  generateShopeeShortLink,
  formatAmazonAffiliateUrl,
  formatAwinAffiliateUrl,
  formatLomadeeAffiliateUrl,
  formatRakutenAffiliateUrl,
  formatAdmitadAffiliateUrl,
  appendTrackingTag,
};
