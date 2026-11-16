const fs = require("node:fs");
const path = require("node:path");
const {test} = require("node:test");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} = require("firebase/firestore");

const projectId = "demo-echobot-rules";
const rules = fs.readFileSync(
    path.join(__dirname, "..", "..", "firestore.rules"),
    "utf8",
);
let testEnvironment;

test.before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {rules},
  });

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await setDoc(doc(firestore, "users", "owner"), {
      uid: "owner",
      email: "owner@example.test",
      displayName: "Owner",
      photoURL: "",
      createdAt: new Date(),
      instagramConnected: false,
      instagramUsername: null,
      instagramAccountId: null,
    });
    await setDoc(doc(firestore, "users", "legacy"), {
      uid: "legacy",
      email: "legacy@example.test",
      displayName: "Legacy",
      photoURL: "",
      createdAt: new Date(),
      instagramConnected: true,
      instagramUsername: "legacy",
      instagramAccountId: "123",
      pageAccessToken: "legacy-token",
    });
    await setDoc(doc(firestore, "privateUsers", "owner"), {
      systemUserAccessToken: "private-token",
    });
  });
});

test.after(async () => {
  await testEnvironment?.cleanup();
});

test("profile access is owner-only and tokens are never client-readable", async () => {
  const owner = testEnvironment.authenticatedContext("owner").firestore();
  const stranger = testEnvironment.authenticatedContext("stranger").firestore();
  const legacy = testEnvironment.authenticatedContext("legacy").firestore();

  await assertSucceeds(getDoc(doc(owner, "users", "owner")));
  await assertFails(getDoc(doc(stranger, "users", "owner")));
  await assertFails(getDoc(doc(owner, "privateUsers", "owner")));
  await assertFails(getDoc(doc(legacy, "users", "legacy")));
});

test("clients can create only safe profile fields", async () => {
  const firestore = testEnvironment.authenticatedContext("new-user").firestore();
  const profile = doc(firestore, "users", "new-user");
  const data = {
    uid: "new-user",
    email: "new@example.test",
    displayName: "New user",
    photoURL: "",
    createdAt: serverTimestamp(),
    instagramConnected: false,
    instagramUsername: null,
    instagramAccountId: null,
  };

  await assertSucceeds(setDoc(profile, data));
  await assertFails(updateDoc(profile, {instagramConnected: true}));
  await assertFails(setDoc(doc(firestore, "users", "unsafe"), {
    ...data,
    uid: "unsafe",
    pageAccessToken: "attempted-token",
  }));
});

test("campaign writes validate fields and prevent client edits to DM counts", async () => {
  const owner = testEnvironment.authenticatedContext("owner").firestore();
  const stranger = testEnvironment.authenticatedContext("stranger").firestore();
  const campaign = doc(owner, "users", "owner", "campaigns", "valid");
  const data = {
    name: "Campaign",
    keyword: "LINK",
    postId: "",
    matchType: "partial",
    dmMessage: "Olá {nome}",
    commentReply: "",
    active: true,
    dmsSent: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await assertSucceeds(setDoc(campaign, data));
  await assertSucceeds(updateDoc(campaign, {
    active: false,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(campaign, {
    dmsSent: 10,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(updateDoc(doc(stranger, "users", "owner", "campaigns", "valid"), {
    active: false,
    updatedAt: serverTimestamp(),
  }));
  await assertFails(setDoc(doc(owner, "users", "owner", "campaigns", "invalid"), {
    ...data,
    dmsSent: 1,
  }));
});
