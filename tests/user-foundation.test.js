const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { randomUUID } = require("node:crypto");

const {
  initializeApp,
  deleteApp
} = require("firebase/app");
const {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} = require("firebase/auth");
const {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  runTransaction,
  serverTimestamp,
  where
} = require("firebase/firestore");
const {
  initializeTestEnvironment
} = require("@firebase/rules-unit-testing");

// These tests exercise authenticated identity and User Foundation sync against
// the Auth and Firestore emulators; they do not test real Google signInWithPopup.
const projectId = "demo-pawfinds-harness";
const appConfig = {
  apiKey: "demo-api-key",
  authDomain: "localhost",
  projectId,
  appId: "demo-pawfinds-harness-test"
};

let app;
let auth;
let db;
let testEnvironment;

function getProductionSyncFunction() {
  const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const startMarker = "window.syncUserDocument = async function(user) {";
  const endMarker = "\n        };";
  const start = html.indexOf(startMarker);

  assert.notEqual(start, -1, "syncUserDocument was not found in index.html");
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, "syncUserDocument closing marker was not found");

  const functionSource = html.slice(start, end + endMarker.length);
  const defineSyncFunction = new Function(
    "window",
    "db",
    "doc",
    "runTransaction",
    "serverTimestamp",
    "console",
    `${functionSource}\nreturn window.syncUserDocument;`
  );

  return defineSyncFunction(
    {},
    db,
    doc,
    runTransaction,
    serverTimestamp,
    { error: (...args) => console.error(...args) }
  );
}

async function createEmulatorUser() {
  const email = `pawfinds-${randomUUID()}@example.test`;
  const password = randomUUID();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  return { email, password, user: credential.user };
}

test.before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8081,
      rules: fs.readFileSync(path.join(__dirname, "..", "firestore.rules"), "utf8")
    }
  });
  await testEnvironment.clearFirestore();

  app = initializeApp(appConfig, `user-foundation-${randomUUID()}`);
  auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8081);
});

test.after(async () => {
  if (auth?.currentUser) {
    await signOut(auth);
  }
  await testEnvironment?.cleanup();
  if (app) {
    await deleteApp(app);
  }
});

test("first login creates users/{uid} from the authenticated Auth Emulator identity", async () => {
  const { user } = await createEmulatorUser();
  await updateProfile(user, {
    displayName: "PawFinds Test User",
    photoURL: "https://example.test/avatar.png"
  });

  await getProductionSyncFunction()(auth.currentUser);

  const snapshot = await getDoc(doc(db, "users", user.uid));
  assert.equal(snapshot.exists(), true);
  const userData = snapshot.data();
  assert.equal(snapshot.id, user.uid);
  assert.equal(userData.uid, user.uid);
  assert.equal(userData.displayName, "PawFinds Test User");
  assert.equal(userData.email, user.email);
  assert.equal(userData.photoURL, "https://example.test/avatar.png");
  assert.equal(userData.status, "ACTIVE");
  assert.equal(typeof userData.createdAt?.toDate, "function");
  assert.equal(typeof userData.updatedAt?.toDate, "function");
});

test("repeat login is idempotent and profile changes update only the profile fields and updatedAt", async () => {
  const { email, password, user } = await createEmulatorUser();
  const syncUserDocument = getProductionSyncFunction();

  await syncUserDocument(auth.currentUser);
  const userRef = doc(db, "users", user.uid);
  const firstSnapshot = await getDoc(userRef);
  const firstData = firstSnapshot.data();

  await signOut(auth);
  const login = await signInWithEmailAndPassword(auth, email, password);
  await syncUserDocument(login.user);

  const secondSnapshot = await getDoc(userRef);
  const secondData = secondSnapshot.data();
  assert.equal(secondSnapshot.id, user.uid);
  assert.equal(secondData.uid, firstData.uid);
  assert.equal(secondData.status, "ACTIVE");
  assert.equal(secondData.createdAt.isEqual(firstData.createdAt), true);
  assert.equal(secondData.updatedAt.isEqual(firstData.updatedAt), true);

  let matchingUserDocs;
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    matchingUserDocs = await getDocs(query(
      collection(context.firestore(), "users"),
      where("uid", "==", user.uid)
    ));
  });
  assert.equal(matchingUserDocs.size, 1);

  await updateProfile(login.user, { displayName: "Updated PawFinds User" });
  await syncUserDocument(auth.currentUser);

  const updatedData = (await getDoc(userRef)).data();
  assert.equal(updatedData.displayName, "Updated PawFinds User");
  assert.equal(updatedData.uid, firstData.uid);
  assert.equal(updatedData.status, "ACTIVE");
  assert.equal(updatedData.createdAt.isEqual(firstData.createdAt), true);
  assert.equal(updatedData.updatedAt.isEqual(firstData.updatedAt), false);
});
