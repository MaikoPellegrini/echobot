/**
 * EchoBot - Firebase Cloud Functions
 */

const crypto = require("node:crypto");
const {onRequest, onCall, HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const {logger} = require("firebase-functions");
const admin = require("firebase-admin");
const axios = require("axios");
const {campaignMatchesKeyword, personalizeMessage} = require("./campaignUtils");
const {verifyMetaSignature, safeEqualStrings} = require("./webhookSecurity");

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

          for (const campaignDoc of campaignsSnapshot.docs) {
            const campaign = campaignDoc.data();
            const postFilter = String(campaign.postId || "").trim();
            if (
              postFilter &&
              postFilter.toLowerCase() !== "any" &&
              postFilter !== String(postId || "")
            ) {
              continue;
            }

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
        params: { fields: "client_business_id" },
        headers: { Authorization: `Bearer ${accessToken}` },
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
            params: { fields: "id,username" },
            headers: { Authorization: `Bearer ${accessToken}` },
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
          headers: { Authorization: `Bearer ${accessToken}` },
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
        logger.warn("Fallback to /me/accounts failed", { error: pageErr.message });
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
          new URLSearchParams({ subscribed_fields: "comments" }),
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
      transaction.set(privateUserRef, privateData, { merge: true });
      transaction.set(userRef, {
        instagramAccountId: String(instagramAccount.id),
        instagramUsername: instagramAccount.username || "Conectado",
        instagramConnected: true,
        connectedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
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
