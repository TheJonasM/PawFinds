"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createContextSnapshot,
  validateContextSnapshot
} = require("../orchestrator/context-engine");
const { createAgentRegistry, registerAgent } = require("../orchestrator/agent-registry");
const { createTask, transitionTask } = require("../orchestrator/task-engine");
const { TASK_STATES } = require("../orchestrator/state-machine");

const TASK_INPUT = Object.freeze({
  objective: "Create an immutable O-002 context snapshot",
  writerId: "codex",
  reviewerId: "gemini",
  allowedFiles: ["orchestrator/context-engine.js", "tests/context-engine.test.js"],
  forbiddenAreas: ["index.html", "Firebase", "Alerts"],
  sourcesOfTruth: ["docs/agents/PROTOCOL.md"],
  tests: ["node --test tests/context-engine.test.js"],
  acceptanceCriteria: ["Snapshot is historical and immutable"],
  approvalRequirements: { scope: "PRODUCT_OWNER", integration: "PRODUCT_OWNER" },
  diffExpectation: { expectedFiles: ["orchestrator/context-engine.js"], expectedLines: null },
  branch: "codex/orchestrator-core-o002",
  baseCommit: "c5ec676a5b644c7635f770e74f849ca5da4dbc71"
});

const ITEMS = Object.freeze([
  Object.freeze({
    sourceRef: "docs/agents/PROTOCOL.md#4-definicion-y-control-de-alcance",
    classification: "FACT",
    content: "El alcance debe quedar registrado antes de editar."
  })
]);

function makeRegistry() {
  return createAgentRegistry([
    { id: "codex", name: "Codex", role: "writer" },
    { id: "gemini", name: "Gemini", role: "reviewer" }
  ]);
}

function makeTask(overrides = {}) {
  const registry = makeRegistry();
  return createTask({ ...TASK_INPUT, ...overrides }, {
    isRegisteredAgent: (id) => registry.has(id)
  });
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}

function makeSnapshot() {
  return createContextSnapshot(makeTask(), clone(ITEMS));
}

function makeApprovedTask() {
  const registry = makeRegistry();
  const options = { isRegisteredAgent: (id) => registry.has(id) };
  let task = createTask(TASK_INPUT, options);
  task = transitionTask(task, "REVIEW", {}, options);
  task = transitionTask(task, "APPROVED", {
    review: {
      reviewerId: "gemini",
      phase: "PROPOSAL",
      outcome: "PASS",
      findings: [],
      evidenceRef: "review:proposal:pass"
    },
    scopeApproval: {
      approverRef: "PRODUCT_OWNER",
      evidenceRef: "approval:scope",
      approvedAt: "2026-10-05T12:00:00.000Z"
    }
  }, options);
  return task;
}

function makeTasksByState() {
  const registry = makeRegistry();
  const options = { isRegisteredAgent: (id) => registry.has(id) };
  const proposed = createTask(TASK_INPUT, options);
  const reviewing = transitionTask(proposed, "REVIEW", {}, options);
  const approved = transitionTask(reviewing, "APPROVED", {
    review: {
      reviewerId: "gemini", phase: "PROPOSAL", outcome: "PASS", findings: [],
      evidenceRef: "review:proposal:pass"
    },
    scopeApproval: { approverRef: "PRODUCT_OWNER", evidenceRef: "approval:scope" }
  }, options);
  const implementing = transitionTask(approved, "IMPLEMENTING", {}, options);
  const testing = transitionTask(implementing, "TESTING", {}, options);
  const auditing = transitionTask(testing, "AUDIT", {}, options);
  const committed = transitionTask(auditing, "COMMITTED", {
    review: {
      reviewerId: "gemini", phase: "AUDIT", outcome: "PASS", findings: [],
      evidenceRef: "review:audit:pass"
    },
    commitEvidence: {
      commitSha: "1111111111111111111111111111111111111111",
      branch: TASK_INPUT.branch,
      evidenceRef: "git:commit"
    }
  }, options);
  const ready = transitionTask(committed, "READY_FOR_INTEGRATION", {
    finalReview: {
      reviewerId: "gemini", phase: "FINAL", outcome: "PASS", findings: [],
      evidenceRef: "review:final:pass"
    }
  }, options);
  const integrated = transitionTask(ready, "INTEGRATED", {
    integrationApproval: { approverRef: "PRODUCT_OWNER", evidenceRef: "approval:integration" },
    integrationRef: "integration:reference"
  }, options);
  const blocked = transitionTask(proposed, "BLOCKED", {
    terminalEvidence: { reason: "Blocked for test fixture" }
  }, options);
  const rejected = transitionTask(reviewing, "REJECTED", {
    review: {
      reviewerId: "gemini", phase: "PROPOSAL", outcome: "REJECT",
      findings: [{ message: "Rejected fixture", blocking: true }],
      evidenceRef: "review:proposal:reject"
    }
  }, options);
  return {
    PROPOSED: proposed,
    REVIEW: reviewing,
    APPROVED: approved,
    IMPLEMENTING: implementing,
    TESTING: testing,
    AUDIT: auditing,
    COMMITTED: committed,
    READY_FOR_INTEGRATION: ready,
    INTEGRATED: integrated,
    BLOCKED: blocked,
    REJECTED: rejected
  };
}

test("creates a valid snapshot with the approved top-level model", () => {
  const snapshot = makeSnapshot();

  assert.equal(validateContextSnapshot(snapshot), true);
  assert.equal(snapshot.schemaVersion, 1);
  assert.match(snapshot.capturedAt, /^\d{4}-\d\d-\d\dT.*\.\d{3}Z$/);
  assert.equal(snapshot.task.taskId.length > 0, true);
  assert.equal(snapshot.task.state, "PROPOSED");
  assert.equal(snapshot.task.workRevision, 0);
  assert.equal(snapshot.scopeApprovalStatus, "NOT_APPROVED");
  assert.deepEqual(snapshot.scope.allowedFiles, TASK_INPUT.allowedFiles);
  assert.deepEqual(snapshot.items, ITEMS);
  assert.deepEqual(Object.keys(snapshot).sort(), [
    "capturedAt", "items", "schemaVersion", "scope", "scopeApprovalStatus", "task"
  ].sort());
});

test("captures every valid O-001 state without changing the source task", () => {
  const tasks = makeTasksByState();
  assert.deepEqual(Object.keys(tasks).sort(), [...TASK_STATES].sort());
  for (const [state, task] of Object.entries(tasks)) {
    const snapshot = createContextSnapshot(task, []);
    assert.equal(snapshot.task.state, state);
    assert.equal(task.state, state);
  }
});

test("rejects tasks missing required context fields or containing invalid state", () => {
  const task = makeTask();
  const incomplete = { ...task };
  delete incomplete.writerId;
  assert.throws(() => createContextSnapshot(incomplete, []), { code: "INVALID_CONTEXT_INPUT" });
  assert.throws(() => createContextSnapshot({ ...task, taskId: " " }, []), { code: "INVALID_CONTEXT_INPUT" });
  assert.throws(() => createContextSnapshot({ ...task, state: "NEW_STATE" }, []), { code: "INVALID_CONTEXT_INPUT" });
  assert.throws(() => createContextSnapshot({ ...task, workRevision: -1 }, []), { code: "INVALID_CONTEXT_INPUT" });
});

test("rejects malformed task scope and unexpected scope fields", () => {
  const task = makeTask();
  assert.throws(() => createContextSnapshot({ ...task, allowedFiles: [] }, []), { code: "INVALID_CONTEXT_INPUT" });
  assert.throws(() => createContextSnapshot({ ...task, scopeApproval: undefined }, []), { code: "INVALID_CONTEXT_INPUT" });
  assert.throws(() => createContextSnapshot({
    ...task,
    diffExpectation: { expectedFiles: [], expectedLines: null, budget: 10 }
  }, []), { code: "INVALID_CONTEXT_INPUT" });
});

test("rejects incomplete, malformed, or unsupported items", () => {
  const task = makeTask();
  assert.throws(() => createContextSnapshot(task, [{ sourceRef: "ref", classification: "FACT" }]), {
    code: "INVALID_CONTEXT_INPUT"
  });
  assert.throws(() => createContextSnapshot(task, [{
    sourceRef: "ref", classification: "UNKNOWN", content: "text"
  }]), { code: "INVALID_CONTEXT_INPUT" });
  assert.throws(() => createContextSnapshot(task, [{
    sourceRef: " ", classification: "FACT", content: "text"
  }]), { code: "INVALID_CONTEXT_INPUT" });
  assert.throws(() => createContextSnapshot(task, [{
    sourceRef: "ref", classification: "FACT", content: "text", verified: true
  }]), { code: "INVALID_CONTEXT_INPUT" });
  assert.throws(() => createContextSnapshot(task, [{
    sourceRef: "ref", classification: "FACT", content: " "
  }]), { code: "INVALID_CONTEXT_INPUT" });
});

test("accepts empty items and every declared evidence classification", () => {
  const task = makeTask();
  assert.deepEqual(createContextSnapshot(task, []).items, []);
  for (const classification of ["FACT", "USER-CONFIRMED", "INFERENCE", "PROPOSAL", "PENDING VERIFICATION"]) {
    assert.equal(createContextSnapshot(task, [{ sourceRef: "ref", classification, content: "text" }]).items[0].classification,
      classification);
  }
});

test("captures scope approval status as contextual data only", () => {
  const approvedTask = makeApprovedTask();
  const matching = createContextSnapshot(approvedTask, []);
  assert.equal(matching.scopeApprovalStatus, "MATCH");

  const driftedTask = { ...approvedTask, objective: "Observed objective drift" };
  const mismatching = createContextSnapshot(driftedTask, []);
  assert.equal(mismatching.scopeApprovalStatus, "MISMATCH");
  assert.equal(approvedTask.objective, TASK_INPUT.objective);
});

test("does not mutate the source Task or supplied items", () => {
  const task = clone(makeTask());
  const items = clone(ITEMS);
  const originalObjective = task.objective;
  const originalContent = items[0].content;

  createContextSnapshot(task, items);

  assert.equal(task.objective, originalObjective);
  assert.equal(Object.isFrozen(task), false);
  assert.equal(items[0].content, originalContent);
  assert.equal(Object.isFrozen(items[0]), false);
});

test("snapshot is deeply immutable and independent from its source objects", () => {
  const task = clone(makeTask());
  const items = clone(ITEMS);
  const snapshot = createContextSnapshot(task, items);
  const capturedObjective = snapshot.scope.objective;
  const capturedContent = snapshot.items[0].content;

  assert.equal(Object.isFrozen(snapshot), true);
  assert.equal(Object.isFrozen(snapshot.task), true);
  assert.equal(Object.isFrozen(snapshot.scope), true);
  assert.equal(Object.isFrozen(snapshot.scope.allowedFiles), true);
  assert.equal(Object.isFrozen(snapshot.scope.approvalRequirements), true);
  assert.equal(Object.isFrozen(snapshot.items[0]), true);
  assert.throws(() => { snapshot.scope.objective = "changed"; }, TypeError);
  assert.throws(() => { snapshot.scope.allowedFiles.push("extra.js"); }, TypeError);
  assert.throws(() => { snapshot.items[0].content = "changed"; }, TypeError);

  task.objective = "later Task value";
  task.allowedFiles.push("later.js");
  items[0].content = "later source value";
  assert.equal(snapshot.scope.objective, capturedObjective);
  assert.equal(snapshot.scope.allowedFiles.includes("later.js"), false);
  assert.equal(snapshot.items[0].content, capturedContent);
});

test("a historical snapshot retains its captured revision after later task work", () => {
  const revisionOne = clone(makeTask());
  revisionOne.workRevision = 1;
  const snapshotA = createContextSnapshot(revisionOne, []);
  const revisionTwo = { ...revisionOne, workRevision: 2 };
  createContextSnapshot(revisionTwo, []);

  assert.equal(snapshotA.task.workRevision, 1);
  assert.equal(validateContextSnapshot(snapshotA), true);
});

test("validates a historical snapshot without a Task or Agent Registry", () => {
  const registry = makeRegistry();
  const task = createTask(TASK_INPUT, { isRegisteredAgent: (id) => registry.has(id) });
  const snapshot = createContextSnapshot(task, []);
  registry.clear();

  assert.equal(validateContextSnapshot(snapshot), true);
  assert.equal(registry.size, 0);
});

test("rejects malformed snapshots, unknown fields, and unsupported schema versions", () => {
  const snapshot = makeSnapshot();
  assert.throws(() => validateContextSnapshot(null), { code: "INVALID_CONTEXT_SNAPSHOT" });
  assert.throws(() => validateContextSnapshot({ ...snapshot, schemaVersion: 2 }), {
    code: "INVALID_CONTEXT_SNAPSHOT"
  });
  assert.throws(() => validateContextSnapshot({ ...snapshot, extra: true }), {
    code: "INVALID_CONTEXT_SNAPSHOT"
  });
  assert.throws(() => validateContextSnapshot({ ...snapshot, task: { ...snapshot.task, extra: true } }), {
    code: "INVALID_CONTEXT_SNAPSHOT"
  });
  assert.throws(() => validateContextSnapshot({ ...snapshot, task: { ...snapshot.task, state: "UNKNOWN" } }), {
    code: "INVALID_CONTEXT_SNAPSHOT"
  });
  assert.throws(() => validateContextSnapshot({ ...snapshot, task: { ...snapshot.task, workRevision: -1 } }), {
    code: "INVALID_CONTEXT_SNAPSHOT"
  });
});

test("rejects invalid timestamp, approval status, scope, and items in a snapshot", () => {
  const snapshot = makeSnapshot();
  assert.throws(() => validateContextSnapshot({ ...snapshot, capturedAt: "not-a-date" }), {
    code: "INVALID_CONTEXT_SNAPSHOT"
  });
  assert.throws(() => validateContextSnapshot({ ...snapshot, scopeApprovalStatus: "APPROVED" }), {
    code: "INVALID_CONTEXT_SNAPSHOT"
  });
  assert.throws(() => validateContextSnapshot({ ...snapshot, scope: { ...snapshot.scope, unknown: true } }), {
    code: "INVALID_CONTEXT_SNAPSHOT"
  });
  assert.throws(() => validateContextSnapshot({ ...snapshot, items: [{
    sourceRef: "ref", classification: "UNKNOWN", content: "text"
  }] }), { code: "INVALID_CONTEXT_SNAPSHOT" });
  assert.throws(() => validateContextSnapshot({ ...snapshot, items: [{
    sourceRef: " ", classification: "FACT", content: "text"
  }] }), { code: "INVALID_CONTEXT_SNAPSHOT" });
  assert.throws(() => validateContextSnapshot({ ...snapshot, items: [{
    sourceRef: "ref", classification: "FACT", content: "text", verified: true
  }] }), { code: "INVALID_CONTEXT_SNAPSHOT" });
});

test("does not consult a Registry during snapshot validation", () => {
  const registry = makeRegistry();
  const task = createTask(TASK_INPUT, { isRegisteredAgent: (id) => registry.has(id) });
  const snapshot = createContextSnapshot(task, []);
  registry.delete("codex");
  registry.delete("gemini");

  assert.equal(validateContextSnapshot(snapshot), true);
  assert.equal(registry.size, 0);
});

test("snapshot Task and item records reject unknown fields", () => {
  const task = makeTask();
  assert.throws(() => createContextSnapshot(task, [{
    sourceRef: "ref", classification: "FACT", content: "text", authoritative: true
  }]), { code: "INVALID_CONTEXT_INPUT" });
});

test("scope approval metadata is captured but never added to item trust labels", () => {
  const snapshot = createContextSnapshot(makeApprovedTask(), clone(ITEMS));
  assert.equal(snapshot.scopeApprovalStatus, "MATCH");
  assert.equal("verified" in snapshot.items[0], false);
  assert.equal("trusted" in snapshot.items[0], false);
  assert.equal("authoritative" in snapshot.items[0], false);
});

test("all snapshots validate independently after source registry changes", () => {
  const registry = makeRegistry();
  const task = createTask(TASK_INPUT, { isRegisteredAgent: (id) => registry.has(id) });
  const snapshot = createContextSnapshot(task, clone(ITEMS));
  registerAgent(registry, { id: "chatgpt", name: "ChatGPT", role: "reviewer" });
  registry.clear();

  assert.equal(validateContextSnapshot(snapshot), true);
});
