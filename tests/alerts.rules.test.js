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

test("12. Alerts policy keeps public reads, constrained creates, status-only moderation updates, and blocked deletes", async () => {
  const anonymous = testEnvironment.unauthenticatedContext();
  await assertSucceeds(getDoc(doc(anonymous.firestore(), "alerts/nonexistent")));

  const userA = testEnvironment.authenticatedContext("A", { email: "a@example.test" });
  const alerts = userA.firestore();
  const validAlert = {
    userId: "A",
    status: "pending",
    title: "Local harness alert",
    createdAt: serverTimestamp()
  };

  await assertSucceeds(setDoc(doc(alerts, "alerts/valid"), validAlert));
  await assertFails(setDoc(doc(alerts, "alerts/other-user"), {
    ...validAlert,
    userId: "B"
  }));
  await assertFails(setDoc(doc(alerts, "alerts/wrong-status"), {
    ...validAlert,
    status: "approved"
  }));

  const approvedAlert = doc(alerts, "alerts/approved");
  await assertSucceeds(setDoc(approvedAlert, validAlert));
  await assertSucceeds(updateDoc(approvedAlert, { status: "approved" }));

  const rejectedAlert = doc(alerts, "alerts/rejected");
  await assertSucceeds(setDoc(rejectedAlert, validAlert));
  await assertSucceeds(updateDoc(rejectedAlert, { status: "rejected" }));

  const extraFieldAlert = doc(alerts, "alerts/extra-field");
  await assertSucceeds(setDoc(extraFieldAlert, validAlert));
  await assertFails(updateDoc(extraFieldAlert, {
    status: "approved",
    moderatorId: "A"
  }));

  await assertFails(deleteDoc(approvedAlert));
});
