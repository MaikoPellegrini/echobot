function normalizeText(value) {
  return typeof value === "string" ?
    value.normalize("NFC").trim().toLocaleLowerCase("pt-BR") :
    "";
}

function campaignMatchesKeyword(comment, keyword, matchType = "partial") {
  const normalizedComment = normalizeText(comment);
  const normalizedKeyword = normalizeText(keyword);
  if (!normalizedComment || !normalizedKeyword) return false;
  if (matchType === "exact") return normalizedComment === normalizedKeyword;
  return normalizedComment.includes(normalizedKeyword);
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
  campaignMatchesKeyword,
  personalizeMessage,
  shouldBindNextPost,
  resolveCampaignTargetType,
};
