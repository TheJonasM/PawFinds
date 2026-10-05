"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createAgentRegistry } = require("../orchestrator/agent-registry");
const { createContextSnapshot, validateContextSnapshot } = require("../orchestrator/context-engine");
const {
  acceptHandoff,
  completeHandoff,
  createHandoff,
  createHandoffEngine,
  getHandoff,
  listHandoffs,
  rejectHandoff
} = require("../orchestrator/handoff-engine");
const { createTask, transitionTask, validateTask } = require("../orchestrator/task-engine");

const TASK_INPUT = {
  objective: "Test local O-003 handoffs",
  writerId: "codex",
  reviewerId: "gemini",
  allowedFiles: ["orchestrator/handoff-engine.js", "tests/handoff-engine.test.js"],
  forbiddenAreas: ["Firebase", "Alerts", "index.html"],
  sourcesOfTruth: ["docs/agents/PROTOCOL.md"],
  tests: ["node --test tests/handoff-engine.test.js"],
  acceptanceCriteria: ["Handoff records are immutable and do not authorize work"],
  approvalRequirements: { scope: "PRODUCT_OWNER", integration: "PRODUCT_OWNER" },
  diffExpectation: { expectedFiles: ["orchestrator/handoff-engine.js"], expectedLines: null },
  branch: "codex/o003-communication-handoff-v02",
  baseCommit: "2ac63a9daa2146ee9b90730ca8b381d45a8f3e11"
};

function makeRegistry() {
  return createAgentRegistry([
    { id: "codex", name: "Codex", role: "writer" },
    { id: "gemini", name: "Gemini", role: "reviewer" },
    { id: "chatgpt", name: "ChatGPT", role: "reviewer" }
  ]);
}

function makeFixture() {
  const registry = makeRegistry();
  const isRegisteredAgent = (id) => registry.has(id);
  const task = createTask(TASK_INPUT, { isRegisteredAgent });
  const engine = createHandoffEngine({ isRegisteredAgent });
  return { registry, isRegisteredAgent, task, engine };
}

function create(engine, task, overrides = {}) {
  return createHandoff(engine, {
    task,
    creatorId: "codex",
    recipientId: "gemini",
    summary: "Review the current task context",
    ...overrides
  });
}

test("1. creates a PENDING handoff with a CREATE history event", () => {
  const { task, engine } = makeFixture();
  const handoff = create(engine, task);
  assert.match(handoff.handoffId, /^[0-9a-f-]{36}$/i);
  assert.equal(handoff.status, "PENDING");
  assert.equal(handoff.history.length, 1);
  assert.equal(handoff.history[0].action, "CREATE");
  assert.equal(handoff.history[0].actorId, "codex");
  assert.deepEqual(Object.keys(handoff), [
    "schemaVersion", "handoffId", "taskRef", "creatorId", "recipientId", "summary",
    "status", "createdAt", "history"
  ]);
});

test("2. rejects unknown creator/actor and invalid engine resolvers", () => {
  const { task, engine, isRegisteredAgent } = makeFixture();
  assert.throws(() => createHandoffEngine(), { code: "INVALID_HANDOFF_ENGINE" });
  assert.throws(() => createHandoffEngine({ isRegisteredAgent: false }), { code: "INVALID_HANDOFF_ENGINE" });
  assert.throws(() => create(engine, task, { creatorId: "unknown" }), { code: "UNKNOWN_AGENT" });
  assert.throws(() => acceptHandoff(engine, "missing", "unknown"), { code: "UNKNOWN_HANDOFF" });
  const pending = create(engine, task);
  const beforeHistory = pending.history;
  assert.throws(() => acceptHandoff(engine, pending.handoffId, "unknown"), { code: "UNKNOWN_AGENT" });
  assert.equal(getHandoff(engine, pending.handoffId).status, "PENDING");
  assert.deepEqual(getHandoff(engine, pending.handoffId).history, beforeHistory);
  assert.equal(isRegisteredAgent("codex"), true);
});

test("3. rejects unknown, reserved or self recipients and invalid summaries", () => {
  const { task, engine } = makeFixture();
  for (const recipientId of ["unknown", "PRODUCT_OWNER", "codex"]) {
    assert.throws(() => create(engine, task, { recipientId }), (error) =>
      ["UNKNOWN_AGENT", "INVALID_HANDOFF"].includes(error.code));
  }
  assert.throws(() => create(engine, task, { summary: "  " }), { code: "INVALID_HANDOFF" });
  assert.equal(listHandoffs(engine).length, 0);
});

test("4. captures exactly taskId, state and workRevision", () => {
  const { task, engine } = makeFixture();
  const handoff = create(engine, task);
  assert.deepEqual(handoff.taskRef, {
    taskId: task.taskId,
    state: task.state,
    workRevision: task.workRevision
  });
  assert.deepEqual(Object.keys(handoff.taskRef), ["taskId", "state", "workRevision"]);
});

test("5. preserves the historical task state and revision after Task advances", () => {
  const { task, engine, isRegisteredAgent } = makeFixture();
  const handoff = create(engine, task);
  const laterTask = transitionTask(task, "REVIEW", {}, { isRegisteredAgent });
  assert.notEqual(laterTask.state, handoff.taskRef.state);
  assert.equal(handoff.taskRef.state, "PROPOSED");
  assert.equal(handoff.taskRef.workRevision, task.workRevision);
});

test("6. accepts a handoff only by its recipient and appends ACCEPT", () => {
  const { task, engine } = makeFixture();
  const pending = create(engine, task);
  const accepted = acceptHandoff(engine, pending.handoffId, "gemini");
  assert.equal(accepted.status, "ACCEPTED");
  assert.equal(accepted.history.at(-1).action, "ACCEPT");
  assert.equal(pending.status, "PENDING");
});

test("7. rejects a handoff by its recipient with a required reason", () => {
  const { task, engine } = makeFixture();
  const pending = create(engine, task);
  assert.throws(() => rejectHandoff(engine, pending.handoffId, "gemini", " "), { code: "INVALID_HANDOFF" });
  assert.equal(getHandoff(engine, pending.handoffId).status, "PENDING");
  const rejected = rejectHandoff(engine, pending.handoffId, "gemini", "Cannot take this task");
  assert.equal(rejected.status, "REJECTED");
  assert.equal(rejected.history.at(-1).action, "REJECT");
  assert.equal(rejected.history.at(-1).reason, "Cannot take this task");
});

test("8. rejects a third party or creator deciding the handoff", () => {
  const { task, engine } = makeFixture();
  const pending = create(engine, task);
  assert.throws(() => acceptHandoff(engine, pending.handoffId, "chatgpt"), {
    code: "UNAUTHORIZED_HANDOFF_ACTOR"
  });
  assert.throws(() => acceptHandoff(engine, pending.handoffId, "codex"), {
    code: "UNAUTHORIZED_HANDOFF_ACTOR"
  });
  assert.equal(getHandoff(engine, pending.handoffId).status, "PENDING");
});

test("9. rejects duplicate or contradictory decisions without changing history", () => {
  const { task, engine } = makeFixture();
  const pending = create(engine, task);
  const accepted = acceptHandoff(engine, pending.handoffId, "gemini");
  assert.throws(() => acceptHandoff(engine, pending.handoffId, "gemini"), {
    code: "INVALID_HANDOFF_TRANSITION"
  });
  assert.throws(() => rejectHandoff(engine, pending.handoffId, "gemini", "No"), {
    code: "INVALID_HANDOFF_TRANSITION"
  });
  assert.deepEqual(getHandoff(engine, pending.handoffId), accepted);

  const rejected = create(engine, task, { summary: "Second handoff" });
  rejectHandoff(engine, rejected.handoffId, "gemini", "No capacity");
  assert.throws(() => acceptHandoff(engine, rejected.handoffId, "gemini"), {
    code: "INVALID_HANDOFF_TRANSITION"
  });
});

test("10. completes only an accepted handoff and appends COMPLETE", () => {
  const { task, engine } = makeFixture();
  const pending = create(engine, task);
  assert.throws(() => completeHandoff(engine, pending.handoffId, "gemini"), {
    code: "INVALID_HANDOFF_TRANSITION"
  });
  const accepted = acceptHandoff(engine, pending.handoffId, "gemini");
  const completed = completeHandoff(engine, pending.handoffId, "gemini");
  assert.equal(completed.status, "COMPLETED");
  assert.equal(completed.history.at(-1).action, "COMPLETE");
  assert.equal(accepted.status, "ACCEPTED");
});

test("11. rejects actions on terminal handoffs and repeated completion", () => {
  const { task, engine } = makeFixture();
  const rejected = create(engine, task);
  rejectHandoff(engine, rejected.handoffId, "gemini", "Declined");
  assert.throws(() => completeHandoff(engine, rejected.handoffId, "gemini"), {
    code: "INVALID_HANDOFF_TRANSITION"
  });
  const accepted = create(engine, task, { summary: "Accept then complete" });
  acceptHandoff(engine, accepted.handoffId, "gemini");
  const completed = completeHandoff(engine, accepted.handoffId, "gemini");
  assert.throws(() => completeHandoff(engine, accepted.handoffId, "gemini"), {
    code: "INVALID_HANDOFF_TRANSITION"
  });
  assert.deepEqual(getHandoff(engine, accepted.handoffId), completed);
});

test("12. REQUEST_CHANGES remains outside handoff state and does not mutate Task", () => {
  const { task, engine } = makeFixture();
  const before = JSON.stringify(task);
  const handoff = create(engine, task, { summary: "Review result: REQUEST_CHANGES" });
  assert.equal(handoff.status, "PENDING");
  assert.equal(JSON.stringify(task), before);
  assert.equal(handoff.history.some(({ action }) => action === "REQUEST_CHANGES"), false);
});

test("13. handoff operations leave Task assignments and approvals untouched", () => {
  const { task, engine, registry, isRegisteredAgent } = makeFixture();
  const beforeTask = JSON.stringify(task);
  const beforeRegistry = [...registry.entries()];
  const handoff = create(engine, task);
  acceptHandoff(engine, handoff.handoffId, "gemini");
  completeHandoff(engine, handoff.handoffId, "gemini");
  assert.equal(JSON.stringify(task), beforeTask);
  assert.equal(task.writerId, "codex");
  assert.equal(task.reviewerId, "gemini");
  assert.equal(task.scopeApproval, null);
  assert.equal(task.integrationApproval, null);
  assert.deepEqual([...registry.entries()], beforeRegistry);
  assert.equal(validateTask(task, { isRegisteredAgent }), true);
});

test("14. deeply freezes views/history and keeps previous views unchanged", () => {
  const { task, engine } = makeFixture();
  const pending = create(engine, task, { summary: "Original summary" });
  const accepted = acceptHandoff(engine, pending.handoffId, "gemini");
  assert.ok(Object.isFrozen(pending));
  assert.ok(Object.isFrozen(pending.taskRef));
  assert.ok(Object.isFrozen(pending.history));
  assert.ok(Object.isFrozen(pending.history[0]));
  assert.ok(Object.isFrozen(accepted.history.at(-1)));
  assert.throws(() => { pending.summary = "mutated"; }, TypeError);
  assert.throws(() => pending.history.push({ action: "REJECT" }), TypeError);
  assert.equal(getHandoff(engine, pending.handoffId).status, "ACCEPTED");
  assert.equal(pending.status, "PENDING");
});

test("15. isolates engine storage, preserves order and filters by taskId", () => {
  const { task, engine, isRegisteredAgent } = makeFixture();
  const secondEngine = createHandoffEngine({ isRegisteredAgent });
  const first = create(engine, task);
  const otherTask = createTask({ ...TASK_INPUT, objective: "Other" }, { isRegisteredAgent });
  const second = create(engine, otherTask);
  assert.equal(getHandoff(secondEngine, first.handoffId), null);
  assert.deepEqual(listHandoffs(engine).map(({ handoffId }) => handoffId), [first.handoffId, second.handoffId]);
  assert.deepEqual(listHandoffs(engine, { taskId: task.taskId }).map(({ handoffId }) => handoffId), [first.handoffId]);
  assert.throws(() => createHandoff({}, {}), { code: "INVALID_HANDOFF_ENGINE" });
  assert.throws(() => listHandoffs(engine).push(first), TypeError);
});

test("16. retains O-001/O-002 validity without a snapshot ID or snapshot storage", () => {
  const { task, engine, isRegisteredAgent } = makeFixture();
  const snapshot = createContextSnapshot(task, []);
  const handoff = create(engine, task);
  assert.equal(validateContextSnapshot(snapshot), true);
  assert.equal(validateTask(task, { isRegisteredAgent }), true);
  assert.equal(handoff.taskRef.taskId, snapshot.task.taskId);
  assert.equal(handoff.taskRef.state, snapshot.task.state);
  assert.equal(handoff.taskRef.workRevision, snapshot.task.workRevision);
  assert.equal(Object.hasOwn(handoff, "snapshotId"), false);
  assert.equal(Object.hasOwn(handoff, "snapshotRef"), false);
});
