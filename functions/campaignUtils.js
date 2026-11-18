function normalizeText(value) {
  return typeof value === "string" ?
    value.normalize("NFC").trim().toLocaleLowerCase("pt-BR") :
    "";
}

/**
 * Extracts a normalized, non-empty list of keywords from either
 * an array of strings or a comma/semicolon/newline-separated string.
 */
function extractKeywords(input) {
  if (Array.isArray(input)) {
    return input
        .map((k) => normalizeText(k))
        .filter((k) => k.length > 0);
  }
  if (typeof input === "string") {
    return input
        .split(/[,;\n]+/)
        .map((k) => normalizeText(k))
        .filter((k) => k.length > 0);
  }
  return [];
}

/**
 * Strips accents/diacritics for flexible Portuguese text matching (e.g. parabens == parabéns).
 */
function stripAccents(str) {
  return typeof str === "string" ?
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "") :
    "";
}

/**
 * Evaluates whether a comment matches any of the campaign's keywords.
 * Supports both exact and partial matches across multiple keywords.
 */
function campaignMatchesKeyword(comment, keywordInput, matchType = "partial") {
  const normalizedComment = normalizeText(comment);
  if (!normalizedComment) return false;

  const keywords = extractKeywords(keywordInput);
  if (!keywords || keywords.length === 0) return false;

  const commentNoAccents = stripAccents(normalizedComment);

  // Exact match:
  // - Handles exact string equality
  // - Also allows trailing/leading punctuation on comments (e.g. "parabens!" or "#parabéns")
  // - Also matches with/without accents (e.g. "parabéns" matches "parabens")
  if (matchType === "exact") {
    const strippedComment = normalizedComment
        .replace(/^[!?.#,\-_~*'"@()\s]+|[!?.#,\-_~*'"@()\s]+$/g, "")
        .trim();
    const strippedCommentNoAccents = stripAccents(strippedComment);

    return keywords.some((kw) => {
      const kwNoAccents = stripAccents(kw);
      return (
        kw === normalizedComment ||
        (strippedComment && kw === strippedComment) ||
        kwNoAccents === commentNoAccents ||
        (strippedCommentNoAccents && kwNoAccents === strippedCommentNoAccents)
      );
    });
  }

  // Partial match:
  // Returns true if ANY of the configured keywords is found in the comment.
  // Also supports accent-insensitive matching (e.g. comment "parabéns pelo trabalho" matches "parabens").
  return keywords.some((kw) => {
    if (normalizedComment.includes(kw)) return true;
    const kwNoAccents = stripAccents(kw);
    if (kwNoAccents && commentNoAccents.includes(kwNoAccents)) return true;
    return false;
  });
}

function personalizeMessage(message, username) {
  const name = typeof username === "string" ?
    username.trim().replace(/^@/, "") :
    "";
  const replacement = name ? `@${name}` : "você";
  return String(message).replace(/\{nome\}/gi, replacement);
}

/**
 * Check if a newly commented post should bind to a 'next_post' campaign.
 * Evaluates whether the media was published after the campaign was created.
 */
function shouldBindNextPost(mediaPublishedAt, campaignCreatedAt) {
  if (!mediaPublishedAt || !campaignCreatedAt) return false;

  const mediaTime = typeof mediaPublishedAt === "number" ?
    mediaPublishedAt :
    new Date(mediaPublishedAt).getTime();

  let campaignTime;
  if (typeof campaignCreatedAt === "number") {
    campaignTime = campaignCreatedAt;
  } else if (campaignCreatedAt && typeof campaignCreatedAt.toMillis === "function") {
    campaignTime = campaignCreatedAt.toMillis();
  } else if (campaignCreatedAt) {
    campaignTime = new Date(campaignCreatedAt).getTime();
  } else {
    return false;
  }

  if (Number.isNaN(mediaTime) || Number.isNaN(campaignTime)) return false;
  return mediaTime > campaignTime;
}

/**
 * Resolve effective targetType taking into account backward compatibility
 */
function resolveCampaignTargetType(campaign) {
  if (campaign && campaign.targetType) {
    return campaign.targetType;
  }
  const boundPost = String((campaign && (campaign.mediaId || campaign.postId)) || "").trim();
  if (boundPost && boundPost.toLowerCase() !== "any") {
    return "specific_post";
  }
  return "all_posts";
}

module.exports = {
  extractKeywords,
  campaignMatchesKeyword,
  personalizeMessage,
  shouldBindNextPost,
  resolveCampaignTargetType,
};
