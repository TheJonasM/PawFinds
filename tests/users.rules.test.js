const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} = require("@firebase/rules-unit-testing");
const {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} = require("firebase/firestore");

const projectId = "demo-pawfinds-harness";
let testEnvironment;

function userData(uid, email = `${uid.toLowerCase()}@example.test`) {
  return {
    uid,
    displayName: "Test User",
    email,
    photoURL: "",
    status: "ACTIVE",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
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
});

test.after(async () => {
  await testEnvironment?.cleanup();
});

test.beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

test("3. an authenticated user can read their own user document", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/A"), userData("A", "a@example.test"));
  });

  const context = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  await assertSucceeds(getDoc(doc(context.firestore(), "users/A")));
});

test("4. a user cannot read another user's document", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/B"), userData("B", "b@example.test"));
  });

  const context = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  await assertFails(getDoc(doc(context.firestore(), "users/B")));
});

test("5. a user can update displayName with a server updatedAt", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/A"), userData("A", "a@example.test"));
  });

  const context = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  await assertSucceeds(updateDoc(doc(context.firestore(), "users/A"), {
    displayName: "Updated Name",
    updatedAt: serverTimestamp()
  }));
});

test("6. a user cannot change status", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/A"), userData("A", "a@example.test"));
  });

  const context = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  await assertFails(updateDoc(doc(context.firestore(), "users/A"), {
    status: "ADMIN",
    updatedAt: serverTimestamp()
  }));
});

test("7. a user cannot change uid", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/A"), userData("A", "a@example.test"));
  });

  const context = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  await assertFails(updateDoc(doc(context.firestore(), "users/A"), {
    uid: "OTHER",
    updatedAt: serverTimestamp()
  }));
});

test("8. a user cannot change createdAt", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/A"), userData("A", "a@example.test"));
  });

  const context = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  await assertFails(updateDoc(doc(context.firestore(), "users/A"), {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }));
});

test("9. a user cannot add roles, permissions, scopes, or arbitrary fields", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/A"), userData("A", "a@example.test"));
  });

  const context = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  await assertFails(updateDoc(doc(context.firestore(), "users/A"), {
    role: "ADMIN",
    permissions: ["*"],
    scopes: ["GLOBAL"],
    updatedAt: serverTimestamp()
  }));
  await assertFails(updateDoc(doc(context.firestore(), "users/A"), {
    arbitraryAuthorizationFlag: true,
    updatedAt: serverTimestamp()
  }));
});

test("10. a user cannot delete their user document", async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users/A"), userData("A", "a@example.test"));
  });

  const context = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  await assertFails(deleteDoc(doc(context.firestore(), "users/A")));
});

test("11. unauthenticated access to users is denied", async () => {
  const context = testEnvironment.unauthenticatedContext();
  await assertFails(getDoc(doc(context.firestore(), "users/A")));
  await assertFails(setDoc(doc(context.firestore(), "users/A"), userData("A")));
});
