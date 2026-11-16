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

module.exports = {
  campaignMatchesKeyword,
  personalizeMessage,
};
