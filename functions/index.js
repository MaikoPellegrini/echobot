/**
 * EchoBot - Firebase Cloud Functions
 */

const crypto = require("node:crypto");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const {
  campaignMatchesKeyword,
  personalizeMessage,
  shouldBindNextPost,
  resolveCampaignTargetType,
} = require("./campaignUtils");
const {verifyMetaSignature, safeEqualStrings} = require("./webhookSecurity");
const {
  generateShopeeShortLink,
  formatAmazonAffiliateUrl,
  formatAwinAffiliateUrl,
  formatLomadeeAffiliateUrl,
  formatRakutenAffiliateUrl,
  formatAdmitadAffiliateUrl,
  appendTrackingTag,
} = require("./affiliateUtils");

admin.initializeApp();
const db = admin.firestore();

const GRAPH_API_BASE = "https://graph.facebook.com/v27.0";
const APP_ID = "2571540876656566";
const META_APP_SECRET = defineSecret("META_APP_SECRET");
const WEBHOOK_VERIFY_TOKEN = defineSecret("WEBHOOK_VERIFY_TOKEN");
const WEBHOOK_EVENT_TTL_DAYS = 90;
const metaApi = axios.create({timeout: 15000});

async function sendPrivateReply(instagramAccountId, commentId, message, accessToken) {
  const response = await metaApi.post(`${GRAPH_API_BASE}/${instagramAccountId}/messages`, {
    recipient: {comment_id: commentId},
    message: {text: message},
  }, {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return response.data;
}

async function replyToComment(commentId, replyText, accessToken) {
  const response = await metaApi.post(`${GRAPH_API_BASE}/${commentId}/replies`, {
    message: replyText,
  }, {
    headers: {Authorization: `Bearer ${accessToken}`},
  });
  return response.data;
}

function getCommentEventRef(instagramAccountId, commentId, campaignId) {
  const id = crypto.createHash("sha256")
      .update(`${instagramAccountId}:${commentId}:${campaignId}`)
      .digest("hex");
  return db.collection("webhookEvents").doc(id);
}

async function claimCommentEvent(eventRef) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(eventRef);
    const data = snapshot.exists ? snapshot.data() : {};

    if (data.status === "completed") return null;

    const lastUpdate = data.updatedAt?.toMillis?.() || 0;
    if (data.status === "processing" && Date.now() - lastUpdate < 120000) {
      return null;
    }

    const expiresAt = admin.firestore.Timestamp.fromMillis(
        Date.now() + WEBHOOK_EVENT_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    transaction.set(eventRef, {
      status: "processing",
      dmSent: data.dmSent === true,
      dmCounted: data.dmCounted === true,
      publicReplySent: data.publicReplySent === true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt,
    }, {merge: true});

    return {
      dmSent: data.dmSent === true,
      dmCounted: data.dmCounted === true,
      publicReplySent: data.publicReplySent === true,
    };
  });
}

async function markDmSent(eventRef, campaignRef) {
  await db.runTransaction(async (transaction) => {
    const eventSnapshot = await transaction.get(eventRef);
    const campaignSnapshot = await transaction.get(campaignRef);
    if (!eventSnapshot.exists) return;

    const updates = {
      dmSent: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!eventSnapshot.data().dmCounted) {
      updates.dmCounted = true;
      if (campaignSnapshot.exists) {
        transaction.update(campaignRef, {
          dmsSent: admin.firestore.FieldValue.increment(1),
        });
      }
    }
    transaction.update(eventRef, updates);
  });
}

async function processCampaignMatch({
  instagramAccountId,
  commentId,
  commenterUsername,
  campaignDoc,
  accessToken,
}) {
  const campaign = campaignDoc.data();
  const eventRef = getCommentEventRef(
      instagramAccountId,
      commentId,
      campaignDoc.id,
  );
  const state = await claimCommentEvent(eventRef);
  if (!state) return;

  try {
    if (campaign.dmMessage && !state.dmSent) {
      const message = personalizeMessage(campaign.dmMessage, commenterUsername);
      await sendPrivateReply(
          instagramAccountId,
          commentId,
          message,
          accessToken,
      );
      await markDmSent(eventRef, campaignDoc.ref);
    }

    if (campaign.commentReply && !state.publicReplySent) {
      await replyToComment(commentId, campaign.commentReply, accessToken);
      await eventRef.update({
        publicReplySent: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await eventRef.update({
      status: "completed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    await eventRef.set({
      status: "failed",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    logger.error("Campaign action failed", {
      status: error.response?.status || null,
      message: error.message,
      commentId,
      campaignId: campaignDoc.id,
    });
    throw error;
  }
}

async function handleUnifiedWebhook(req, res) {
  if (req.method === "GET") {
    const verifyToken = WEBHOOK_VERIFY_TOKEN.value();
    if (
      req.query["hub.mode"] === "subscribe" &&
      safeEqualStrings(req.query["hub.verify_token"], verifyToken)
    ) {
      res.status(200).send(req.query["hub.challenge"]);
      return;
    }
    res.status(403).send("Forbidden");
    return;
  }

  if (req.method === "POST") {
    if (!verifyMetaSignature(
        req.rawBody,
        req.get("X-Hub-Signature-256"),
        META_APP_SECRET.value(),
    )) {
      res.status(401).send("Invalid signature");
      return;
    }

    if (
      !req.body ||
      req.body.object !== "instagram" ||
      !Array.isArray(req.body.entry)
    ) {
      res.status(400).send("Invalid event payload");
      return;
    }

    try {
      for (const entry of req.body.entry) {
        if (!entry.id) continue;
        const instagramAccountId = String(entry.id);
        const usersSnapshot = await db.collection("users")
            .where("instagramAccountId", "==", instagramAccountId)
            .limit(1)
            .get();
        if (usersSnapshot.empty) continue;

        const userDoc = usersSnapshot.docs[0];
        const privateUserDoc = await db.collection("privateUsers")
            .doc(userDoc.id)
            .get();
        const accessToken = privateUserDoc.data()?.systemUserAccessToken;
        if (!accessToken) {
          logger.warn("Connected Instagram account has no private access token", {
            userId: userDoc.id,
            instagramAccountId,
          });
          continue;
        }

        for (const change of entry.changes || []) {
          if (change.field !== "comments") continue;

          const {id: commentId, text: commentText, from} = change.value || {};
          const commenterId = from?.id;
          const commenterUsername = from?.username || "";
          const postId = change.value?.media?.id;

          if (
            !commentId ||
            !commentText ||
            !commenterId ||
            String(commenterId) === instagramAccountId
          ) {
            continue;
          }

          const campaignsSnapshot = await db.collection("users")
              .doc(userDoc.id)
              .collection("campaigns")
              .where("active", "==", true)
              .get();

          const mediaId = postId ? String(postId) : null;

          // 1. Check if mediaId already has a specific campaign bound
          let hasSpecificCampaign = false;
          if (mediaId) {
            hasSpecificCampaign = campaignsSnapshot.docs.some((doc) => {
              const data = doc.data();
              const target = resolveCampaignTargetType(data);
              const boundId = String(data.mediaId || data.postId || "").trim();
              return target === "specific_post" && boundId === mediaId;
            });

            // 2. If no specific campaign is bound to this mediaId yet, check next_post campaigns
            if (!hasSpecificCampaign) {
              const nextPostCampaigns = campaignsSnapshot.docs.filter((doc) => {
                const data = doc.data();
                return resolveCampaignTargetType(data) === "next_post";
              });

              if (nextPostCampaigns.length > 0) {
                let mediaTimestamp = null;
                try {
                  const mediaRes = await metaApi.get(
                      `${GRAPH_API_BASE}/${mediaId}?fields=timestamp`,
                      {
                        headers: {Authorization: `Bearer ${accessToken}`},
                      },
                  );
                  if (mediaRes.data?.timestamp) {
                    mediaTimestamp = new Date(mediaRes.data.timestamp).getTime();
                  }
                } catch (mediaErr) {
                  logger.warn("Failed to fetch media timestamp from Graph API", {
                    mediaId,
                    error: mediaErr.response?.data || mediaErr.message,
                  });
                }

                if (mediaTimestamp) {
                  for (const nextCampDoc of nextPostCampaigns) {
                    const nextCampData = nextCampDoc.data();
                    if (shouldBindNextPost(mediaTimestamp, nextCampData.createdAt)) {
                      logger.info("Auto-binding next_post campaign to newly published media", {
                        campaignId: nextCampDoc.id,
                        mediaId,
                      });
                      await nextCampDoc.ref.update({
                        mediaId: mediaId,
                        postId: mediaId,
                        targetType: "specific_post",
                        boundAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                      });
                      // Update in-memory data for immediate evaluation in this webhook invocation
                      nextCampData.mediaId = mediaId;
                      nextCampData.postId = mediaId;
                      nextCampData.targetType = "specific_post";
                    }
                  }
                }
              }
            }
          }

          for (const campaignDoc of campaignsSnapshot.docs) {
            const campaign = campaignDoc.data();
            const targetType = resolveCampaignTargetType(campaign);

            if (targetType === "specific_post") {
              const postFilter = String(campaign.mediaId || campaign.postId || "").trim();
              if (
                postFilter &&
                postFilter.toLowerCase() !== "any" &&
                postFilter !== String(postId || "")
              ) {
                continue;
              }
            } else if (targetType === "next_post") {
              // Not bound to this post yet
              continue;
            }
            // targetType === "all_posts" matches any post

            if (!campaignMatchesKeyword(commentText, campaign.keyword, campaign.matchType)) {
              continue;
            }

            await processCampaignMatch({
              instagramAccountId,
              commentId,
              commenterUsername,
              campaignDoc,
              accessToken,
            });
          }
        }
      }
      res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      logger.error("Webhook processing failed", {
        status: error.response?.status || null,
        message: error.message,
      });
      res.status(500).send("Webhook processing failed");
    }
    return;
  }

  res.status(405).send("Method not allowed");
}

const webhookOptions = {
  cors: false,
  secrets: [WEBHOOK_VERIFY_TOKEN, META_APP_SECRET],
};

exports.webhook = onRequest(webhookOptions, handleUnifiedWebhook);

exports.migrateInstagramCredentials = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }

  const userRef = db.collection("users").doc(request.auth.uid);
  const privateUserRef = db.collection("privateUsers").doc(request.auth.uid);

  await db.runTransaction(async (transaction) => {
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists) return;

    const privateSnapshot = await transaction.get(privateUserRef);
    const userData = userSnapshot.data();
    const privateData = privateSnapshot.exists ? privateSnapshot.data() : {};
    const legacyToken = userData.pageAccessToken || userData.accessToken;
    if (legacyToken && !privateData.systemUserAccessToken) {
      transaction.set(privateUserRef, {
        legacyAccessToken: legacyToken,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      transaction.set(userRef, {
        instagramConnected: false,
        instagramUsername: null,
        instagramAccountId: null,
      }, {merge: true});
    }

    const cleanup = {};
    if ("pageAccessToken" in userData) {
      cleanup.pageAccessToken = admin.firestore.FieldValue.delete();
    }
    if ("accessToken" in userData) {
      cleanup.accessToken = admin.firestore.FieldValue.delete();
    }
    if (Object.keys(cleanup).length) transaction.update(userRef, cleanup);
  });

  return {success: true};
});

exports.disconnectInstagram = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }

  const userRef = db.collection("users").doc(request.auth.uid);
  const privateUserRef = db.collection("privateUsers").doc(request.auth.uid);
  await db.runTransaction(async (transaction) => {
    transaction.delete(privateUserRef);
    transaction.set(userRef, {
      instagramConnected: false,
      instagramUsername: null,
      instagramAccountId: null,
      disconnectedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
  });

  return {success: true};
});

exports.exchangeToken = onCall({
  secrets: [META_APP_SECRET],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }
  const code = request.data?.code;
  if (typeof code !== "string" || !code.trim()) {
    throw new HttpsError("invalid-argument", "Código OAuth ausente.");
  }

  const redirectUri = request.data?.redirectUri || "https://echobot-2254b.web.app/auth/callback";

  try {
    const tokenResponse = await metaApi.get(`${GRAPH_API_BASE}/oauth/access_token`, {
      params: {
        client_id: APP_ID,
        client_secret: META_APP_SECRET.value(),
        redirect_uri: redirectUri,
        code,
      },
    });
    const {access_token: accessToken, expires_in: expiresIn} = tokenResponse.data;
    if (!accessToken) {
      throw new Error("Meta did not return an access token");
    }

    let clientBusinessId = null;
    try {
      const businessResponse = await metaApi.get(`${GRAPH_API_BASE}/me`, {
        params: {fields: "client_business_id"},
        headers: {Authorization: `Bearer ${accessToken}`},
      });
      clientBusinessId = businessResponse.data?.client_business_id || null;
    } catch (bizErr) {
      logger.info("Field client_business_id not available on this token", {
        message: bizErr.message,
      });
    }

    let instagramAccount = null;
    let effectiveToken = accessToken;

    // 1. Try assigned_instagram_accounts (Business Login asset assignment)
    try {
      const accountsResponse = await metaApi.get(
          `${GRAPH_API_BASE}/me/assigned_instagram_accounts`,
          {
            params: {fields: "id,username"},
            headers: {Authorization: `Bearer ${accessToken}`},
          },
      );
      if (accountsResponse.data?.data?.[0]?.id) {
        instagramAccount = accountsResponse.data.data[0];
      }
    } catch (assignErr) {
      logger.info("Endpoint assigned_instagram_accounts not available", {
        message: assignErr.message,
      });
    }

    // 2. Fallback: Check connected Facebook Pages with instagram_business_account
    if (!instagramAccount?.id) {
      try {
        const pagesResponse = await metaApi.get(`${GRAPH_API_BASE}/me/accounts`, {
          params: {
            fields: "id,name,access_token,instagram_business_account{id,username}",
          },
          headers: {Authorization: `Bearer ${accessToken}`},
        });

        for (const page of pagesResponse.data?.data || []) {
          if (page.instagram_business_account?.id) {
            instagramAccount = {
              id: page.instagram_business_account.id,
              username: page.instagram_business_account.username || page.name,
            };
            if (page.access_token) {
              effectiveToken = page.access_token;
            }
            break;
          }
        }
      } catch (pageErr) {
        logger.warn("Fallback to /me/accounts failed", {error: pageErr.message});
      }
    }

    if (!instagramAccount?.id) {
      throw new HttpsError(
          "not-found",
          "Nenhuma conta profissional do Instagram foi compartilhada. Certifique-se de que sua conta é Profissional (Criador/Empresa) e tente novamente.",
      );
    }

    try {
      const subscription = await metaApi.post(
          `${GRAPH_API_BASE}/${instagramAccount.id}/subscribed_apps`,
          new URLSearchParams({subscribed_fields: "comments"}),
          {
            headers: {
              Authorization: `Bearer ${effectiveToken}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
          },
      );
      if (subscription.data?.success !== true) {
        logger.warn("Meta subscription did not confirm with true, continuing", {
          data: subscription.data,
        });
      }
    } catch (subErr) {
      logger.warn("Failed to subscribe app to Instagram account events", {
        error: subErr.response?.data || subErr.message,
      });
    }

    const userRef = db.collection("users").doc(request.auth.uid);
    const privateUserRef = db.collection("privateUsers").doc(request.auth.uid);
    const privateData = {
      systemUserAccessToken: effectiveToken,
      userAccessToken: accessToken,
      legacyAccessToken: admin.firestore.FieldValue.delete(),
      clientBusinessId,
      instagramAccountId: String(instagramAccount.id),
      configId: "4750108781977729",
      connectedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (Number.isFinite(expiresIn)) {
      privateData.expiresAt = admin.firestore.Timestamp.fromMillis(
          Date.now() + expiresIn * 1000,
      );
    }

    await db.runTransaction(async (transaction) => {
      transaction.set(privateUserRef, privateData, {merge: true});
      transaction.set(userRef, {
        instagramAccountId: String(instagramAccount.id),
        instagramUsername: instagramAccount.username || "Conectado",
        instagramConnected: true,
        connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    });

    return {
      success: true,
      instagramUsername: instagramAccount.username || null,
      instagramAccountId: String(instagramAccount.id),
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    const metaError =
      error.response?.data?.error?.message ||
      error.message ||
      "Erro de comunicação com a Meta";
    logger.error("Instagram token exchange failed", {
      status: error.response?.status || null,
      details: error.response?.data || null,
      message: error.message,
    });
    throw new HttpsError(
        "internal",
        `Erro ao conectar Instagram: ${metaError}`,
    );
  }
});

/**
 * ============================================================
 * AFFILIATE & MARKETPLACE HUB CLOUD FUNCTIONS
 * ============================================================
 */

/**
 * Save user credentials for marketplace/affiliate networks securely
 */
exports.saveIntegrationCredentials = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }
  const userId = request.auth.uid;
  const platform = String(request.data?.platform || "").trim().toLowerCase();
  const credentials = request.data?.credentials;

  const validPlatforms = [
    "shopee",
    "amazon",
    "awin",
    "lomadee",
    "rakuten",
    "admitad",
    "hotmart",
    "eduzz",
  ];

  if (!validPlatforms.includes(platform)) {
    throw new HttpsError("invalid-argument", `Plataforma inválida: ${platform}`);
  }

  if (!credentials || typeof credentials !== "object") {
    throw new HttpsError("invalid-argument", "Credenciais ausentes ou inválidas.");
  }

  const sanitized = {};
  if (platform === "shopee") {
    sanitized.appId = String(credentials.appId || "").trim();
    sanitized.secret = String(credentials.secret || "").trim();
    if (!sanitized.appId || !sanitized.secret) {
      throw new HttpsError("invalid-argument", "App ID e Secret são obrigatórios para a Shopee.");
    }
  } else if (platform === "amazon") {
    sanitized.partnerTag = String(credentials.partnerTag || "").trim();
    sanitized.accessKey = String(credentials.accessKey || "").trim();
    sanitized.secretKey = String(credentials.secretKey || "").trim();
    if (!sanitized.partnerTag) {
      throw new HttpsError("invalid-argument", "Partner Tag (ID de Associado) é obrigatória para a Amazon.");
    }
  } else if (platform === "awin") {
    sanitized.publisherId = String(credentials.publisherId || "").trim();
    sanitized.apiToken = String(credentials.apiToken || "").trim();
    if (!sanitized.publisherId) {
      throw new HttpsError("invalid-argument", "Publisher ID é obrigatório para a Awin.");
    }
  } else if (platform === "lomadee") {
    sanitized.appToken = String(credentials.appToken || "").trim();
    sanitized.sourceId = String(credentials.sourceId || "").trim();
    if (!sanitized.appToken && !sanitized.sourceId) {
      throw new HttpsError("invalid-argument", "App Token ou Source ID é obrigatório para a Lomadee.");
    }
  } else if (platform === "rakuten") {
    sanitized.publisherId = String(credentials.publisherId || "").trim();
    sanitized.token = String(credentials.token || "").trim();
    if (!sanitized.publisherId) {
      throw new HttpsError("invalid-argument", "Publisher ID é obrigatório para a Rakuten.");
    }
  } else if (platform === "admitad") {
    sanitized.token = String(credentials.token || "").trim();
    sanitized.clientId = String(credentials.clientId || "").trim();
    sanitized.clientSecret = String(credentials.clientSecret || "").trim();
    if (!sanitized.token) {
      throw new HttpsError("invalid-argument", "Token é obrigatório para a Admitad.");
    }
  } else if (platform === "hotmart") {
    sanitized.clientId = String(credentials.clientId || "").trim();
    sanitized.clientSecret = String(credentials.clientSecret || "").trim();
    sanitized.basicAuth = String(credentials.basicAuth || "").trim();
    if (!sanitized.clientId || !sanitized.clientSecret) {
      throw new HttpsError("invalid-argument", "Client ID e Client Secret são obrigatórios para a Hotmart.");
    }
  } else if (platform === "eduzz") {
    sanitized.publicKey = String(credentials.publicKey || "").trim();
    sanitized.apiKey = String(credentials.apiKey || "").trim();
    if (!sanitized.apiKey) {
      throw new HttpsError("invalid-argument", "API Key é obrigatória para a Eduzz.");
    }
  }

  sanitized.connected = true;
  sanitized.updatedAt = admin.firestore.FieldValue.serverTimestamp();

  await db.collection("user_integrations").doc(userId).set({
    [platform]: sanitized,
  }, {merge: true});

  return {success: true, platform};
});

/**
 * Return connected status of integrations without exposing secrets
 */
exports.getIntegrationStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }
  const userId = request.auth.uid;
  const docSnap = await db.collection("user_integrations").doc(userId).get();
  if (!docSnap.exists) {
    return {integrations: {}};
  }
  const data = docSnap.data();
  const summary = {};
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val === "object" && val.connected) {
      summary[key] = {
        connected: true,
        updatedAt: val.updatedAt || null,
        appId: val.appId || null,
        partnerTag: val.partnerTag || null,
        publisherId: val.publisherId || null,
        publicKey: val.publicKey || null,
      };
    }
  }
  return {integrations: summary};
});

/**
 * Disconnect an integration platform
 */
exports.disconnectIntegration = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }
  const userId = request.auth.uid;
  const platform = String(request.data?.platform || "").trim().toLowerCase();
  if (!platform) {
    throw new HttpsError("invalid-argument", "Plataforma ausente.");
  }
  await db.collection("user_integrations").doc(userId).update({
    [`${platform}.connected`]: false,
    [`${platform}.disconnectedAt`]: admin.firestore.FieldValue.serverTimestamp(),
  });
  return {success: true, platform};
});

/**
 * Generate affiliate link using API integration or platform deep link
 */
exports.generateAffiliateLink = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }
  const userId = request.auth.uid;
  const {platform, originalUrl, title, categoryType, utmSource = "echobot_dm"} = request.data || {};

  if (!platform || typeof platform !== "string") {
    throw new HttpsError("invalid-argument", "Plataforma não informada.");
  }
  if (!originalUrl || typeof originalUrl !== "string" || !originalUrl.trim().startsWith("http")) {
    throw new HttpsError("invalid-argument", "URL original inválida. Deve começar com http:// ou https://.");
  }

  const cleanUrl = originalUrl.trim();
  const integrationsSnap = await db.collection("user_integrations").doc(userId).get();
  const integrations = integrationsSnap.exists ? integrationsSnap.data() : {};
  const creds = integrations[platform.toLowerCase()] || {};

  let affiliateUrl = "";

  switch (platform.toLowerCase()) {
    case "shopee": {
      if (!creds.appId || !creds.secret) {
        throw new HttpsError(
            "failed-precondition",
            "Credenciais da Shopee (App ID e Secret) não configuradas.",
        );
      }
      try {
        affiliateUrl = await generateShopeeShortLink(creds.appId, creds.secret, cleanUrl, utmSource);
      } catch (err) {
        logger.warn("Shopee API generation failed, falling back to tracked link", {error: err.message});
        affiliateUrl = appendTrackingTag(cleanUrl, utmSource);
      }
      break;
    }
    case "amazon": {
      if (!creds.partnerTag) {
        throw new HttpsError("failed-precondition", "Partner Tag da Amazon não configurada.");
      }
      affiliateUrl = formatAmazonAffiliateUrl(cleanUrl, creds.partnerTag, utmSource);
      break;
    }
    case "awin": {
      if (!creds.publisherId) {
        throw new HttpsError("failed-precondition", "Publisher ID da Awin não configurado.");
      }
      affiliateUrl = formatAwinAffiliateUrl(cleanUrl, creds.publisherId, utmSource);
      break;
    }
    case "lomadee": {
      const source = creds.sourceId || creds.appToken;
      if (!source) {
        throw new HttpsError("failed-precondition", "Credenciais da Lomadee não configuradas.");
      }
      affiliateUrl = formatLomadeeAffiliateUrl(cleanUrl, source, utmSource);
      break;
    }
    case "rakuten": {
      if (!creds.publisherId) {
        throw new HttpsError("failed-precondition", "Publisher ID da Rakuten não configurado.");
      }
      affiliateUrl = formatRakutenAffiliateUrl(cleanUrl, creds.publisherId, utmSource);
      break;
    }
    case "admitad": {
      if (!creds.token) {
        throw new HttpsError("failed-precondition", "Token da Admitad não configurado.");
      }
      affiliateUrl = formatAdmitadAffiliateUrl(cleanUrl, creds.token, utmSource);
      break;
    }
    default: {
      affiliateUrl = appendTrackingTag(cleanUrl, utmSource);
      break;
    }
  }

  const linkData = {
    userId,
    title: (title || "").trim() || `Produto ${platform}`,
    platform: platform.toLowerCase(),
    categoryType: categoryType === "infoproduto" ? "infoproduto" : "fisico",
    originalUrl: cleanUrl,
    affiliateUrl,
    utmSource: utmSource || "echobot_dm",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const docRef = await db.collection("affiliate_links").add(linkData);

  return {
    id: docRef.id,
    ...linkData,
    createdAt: new Date().toISOString(),
  };
});

/**
 * Synchronize user's affiliated products from Hotmart
 */
exports.syncHotmartProducts = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }
  const userId = request.auth.uid;
  const integrationsSnap = await db.collection("user_integrations").doc(userId).get();
  const integrations = integrationsSnap.exists ? integrationsSnap.data() : {};
  const hotmart = integrations.hotmart;

  if (!hotmart || !hotmart.clientId || !hotmart.clientSecret) {
    throw new HttpsError(
        "failed-precondition",
        "Credenciais da Hotmart (Client ID e Client Secret) não configuradas. Salve-as na aba Afiliados & Links.",
    );
  }

  let accessToken = null;
  const authHeader = hotmart.basicAuth ?
    (hotmart.basicAuth.startsWith("Basic ") ? hotmart.basicAuth : `Basic ${hotmart.basicAuth}`) :
    `Basic ${Buffer.from(`${hotmart.clientId}:${hotmart.clientSecret}`).toString("base64")}`;

  try {
    const tokenRes = await axios.post(
        "https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials",
        {},
        {
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        },
    );
    accessToken = tokenRes.data?.access_token;
  } catch (authErr) {
    logger.warn("Hotmart OAuth authentication failed", {
      error: authErr.response?.data || authErr.message,
    });
    throw new HttpsError(
        "internal",
        `Erro ao autenticar com a Hotmart: ${authErr.response?.data?.error_description || authErr.message}`,
    );
  }

  let importedCount = 0;
  try {
    const productsRes = await axios.get(
        "https://developers.hotmart.com/payments/api/v1/subscriptions",
        {
          headers: {Authorization: `Bearer ${accessToken}`},
          params: {max_results: 50},
          timeout: 10000,
        },
    );

    const items = productsRes.data?.items || productsRes.data?.data || [];
    for (const item of items) {
      const prodName = item.product?.name || item.name || "Curso Hotmart";
      const hotlink = item.hotlink || item.link || `https://hotm.art/${item.product?.id || item.id || "afiliado"}`;
      const trackedLink = appendTrackingTag(hotlink, "echobot_dm");

      await db.collection("affiliate_links").add({
        userId,
        title: prodName,
        platform: "hotmart",
        categoryType: "infoproduto",
        originalUrl: hotlink,
        affiliateUrl: trackedLink,
        utmSource: "echobot_dm",
        externalId: String(item.id || item.product?.id || ""),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      importedCount++;
    }
  } catch (apiErr) {
    logger.warn("Hotmart product fetch returned an error or no items", {
      error: apiErr.response?.data || apiErr.message,
    });
    return {
      success: true,
      count: 0,
      message: "Autenticação realizada com sucesso na Hotmart. Nenhum produto ativo retornado no momento.",
    };
  }

  return {success: true, count: importedCount};
});

/**
 * Synchronize user's affiliated products from Eduzz
 */
exports.syncEduzzProducts = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Não autenticado.");
  }
  const userId = request.auth.uid;
  const integrationsSnap = await db.collection("user_integrations").doc(userId).get();
  const integrations = integrationsSnap.exists ? integrationsSnap.data() : {};
  const eduzz = integrations.eduzz;

  if (!eduzz || !eduzz.apiKey) {
    throw new HttpsError("failed-precondition", "API Key da Eduzz não configurada. Salve-a na aba Afiliados & Links.");
  }

  let importedCount = 0;
  try {
    const res = await axios.get("https://api.eduzz.com/partner/v1/affiliates", {
      headers: {
        token: eduzz.apiKey,
        Authorization: `Bearer ${eduzz.apiKey}`,
      },
      timeout: 10000,
    });

    const items = res.data?.data || res.data?.items || res.data || [];
    if (Array.isArray(items)) {
      for (const item of items) {
        const prodName = item.title || item.name || "Conteúdo Eduzz";
        const link = item.affiliate_url || item.url || `https://eduzz.com/p/${item.id || "conteudo"}`;
        const trackedLink = appendTrackingTag(link, "echobot_dm");

        await db.collection("affiliate_links").add({
          userId,
          title: prodName,
          platform: "eduzz",
          categoryType: "infoproduto",
          originalUrl: link,
          affiliateUrl: trackedLink,
          utmSource: "echobot_dm",
          externalId: String(item.id || ""),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        importedCount++;
      }
    }
  } catch (apiErr) {
    logger.warn("Eduzz product fetch returned error", {
      error: apiErr.response?.data || apiErr.message,
    });
    return {
      success: true,
      count: 0,
      message: "Conexão testada com sucesso na Eduzz. Nenhum produto retornado no momento.",
    };
  }

  return {success: true, count: importedCount};
});
