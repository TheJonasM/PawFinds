"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { createAgentRegistry } = require("../orchestrator/agent-registry");
const {
  createCommunicationBus,
  getMessage,
  listMessages,
  sendMessage
} = require("../orchestrator/communication-bus");
const { createTask, validateTask } = require("../orchestrator/task-engine");

const TASK_INPUT = {
  objective: "Test local O-003 communication",
  writerId: "codex",
  reviewerId: "gemini",
  allowedFiles: ["orchestrator/communication-bus.js", "tests/communication-bus.test.js"],
  forbiddenAreas: ["Firebase", "Alerts", "index.html"],
  sourcesOfTruth: ["docs/agents/PROTOCOL.md"],
  tests: ["node --test tests/communication-bus.test.js"],
  acceptanceCriteria: ["Messages are local, immutable and non-authoritative"],
  approvalRequirements: { scope: "PRODUCT_OWNER", integration: "PRODUCT_OWNER" },
  diffExpectation: { expectedFiles: ["orchestrator/communication-bus.js"], expectedLines: null },
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
  const bus = createCommunicationBus({ isRegisteredAgent });
  return { registry, isRegisteredAgent, task, bus };
}

function send(bus, task, overrides = {}) {
  return sendMessage(bus, {
    task,
    senderId: "codex",
    recipientId: "gemini",
    type: "INFO",
    payload: { text: "coordination only" },
    replyToMessageId: null,
    ...overrides
  });
}

test("1. creates an isolated in-memory Bus with a registered-agent resolver", () => {
  const { isRegisteredAgent } = makeFixture();
  assert.ok(createCommunicationBus({ isRegisteredAgent }));
  assert.throws(() => createCommunicationBus(), { code: "INVALID_BUS" });
  assert.throws(() => createCommunicationBus({ isRegisteredAgent: true }), { code: "INVALID_BUS" });
});

test("2. rejects an unknown sender", () => {
  const { task, bus } = makeFixture();
  assert.throws(() => send(bus, task, { senderId: "unknown" }), { code: "UNKNOWN_AGENT" });
  assert.equal(listMessages(bus).length, 0);
});

test("3. rejects an unknown recipient", () => {
  const { task, bus } = makeFixture();
  assert.throws(() => send(bus, task, { recipientId: "unknown" }), { code: "UNKNOWN_AGENT" });
  assert.equal(listMessages(bus).length, 0);
});

test("4. rejects PRODUCT_OWNER as a sender or recipient", () => {
  const { task, bus } = makeFixture();
  assert.throws(() => send(bus, task, { senderId: "PRODUCT_OWNER" }), { code: "UNKNOWN_AGENT" });
  assert.throws(() => send(bus, task, { recipientId: "PRODUCT_OWNER" }), { code: "UNKNOWN_AGENT" });
});

test("5. accepts INFO, REQUEST and a correlated RESPONSE", () => {
  const { task, bus } = makeFixture();
  const info = send(bus, task);
  const request = send(bus, task, { type: "REQUEST", replyToMessageId: null });
  const response = send(bus, task, {
    senderId: "gemini",
    recipientId: "codex",
    type: "RESPONSE",
    replyToMessageId: request.messageId
  });
  assert.equal(info.type, "INFO");
  assert.equal(request.type, "REQUEST");
  assert.equal(response.type, "RESPONSE");
  assert.equal(response.replyToMessageId, request.messageId);
});

test("6. rejects unknown types and malformed message fields", () => {
  const { task, bus } = makeFixture();
  assert.throws(() => send(bus, task, { type: "APPROVAL" }), { code: "INVALID_MESSAGE" });
  assert.throws(() => sendMessage(bus, {
    task, senderId: "codex", recipientId: "gemini", type: "INFO", payload: {},
    replyToMessageId: null, status: "READ"
  }), { code: "INVALID_MESSAGE" });
  assert.throws(() => send(bus, task, { replyToMessageId: undefined }), { code: "INVALID_MESSAGE" });
});

test("7. accepts every JSON-compatible payload root type", () => {
  const { task, bus } = makeFixture();
  const values = [
    null,
    true,
    false,
    "text",
    0,
    -2.5,
    [],
    [null, true, "text", 1, { key: "value" }],
    {},
    { key: "value" }
  ];
  for (const payload of values) {
    assert.deepEqual(send(bus, task, { payload }).payload, payload);
  }
  const nullPrototype = Object.assign(Object.create(null), { key: "value" });
  assert.deepEqual(send(bus, task, { payload: nullPrototype }).payload, { key: "value" });
});

test("8. rejects values and object/array properties that are not JSON-compatible", () => {
  const { task, bus } = makeFixture();
  const circular = {};
  circular.self = circular;
  const sparse = [];
  sparse[1] = "hole";
  const namedArray = [];
  namedArray.extra = "not JSON";
  const symbolProperty = { value: "ok" };
  symbolProperty[Symbol("extra")] = "not JSON";
  const getterProperty = Object.defineProperty({}, "value", { enumerable: true, get() { return "executed"; } });
  const hiddenProperty = Object.defineProperty({}, "hidden", { value: true });
  const badValues = [
    undefined,
    { value: undefined },
    { value: () => true },
    { value: Symbol("x") },
    { value: 1n },
    { value: Number.NaN },
    { value: Infinity },
    { value: circular },
    { value: sparse },
    { value: new Date() },
    Object.create({ inherited: true }),
    { value: symbolProperty },
    { value: getterProperty },
    { value: hiddenProperty },
    { value: namedArray }
  ];
  for (const bad of badValues) {
    assert.throws(() => send(bus, task, { payload: bad }), { code: "INVALID_MESSAGE" });
  }
});

test("9. rejects reserved authorization keys recursively and case-insensitively", () => {
  const { task, bus } = makeFixture();
  for (const key of ["role", "ROLES", "permission", "permissions", "scope", "scopes",
    "authorization", "approval", "scopeApproval", "integrationApproval"]) {
    assert.throws(() => send(bus, task, { payload: { nested: [{ [key]: "ADMIN" }] } }), {
      code: "INVALID_MESSAGE"
    });
  }
  assert.equal(send(bus, task, { payload: { text: "ADMIN is only text" } }).payload.text,
    "ADMIN is only text");
});

test("10. assigns a UUID and a UTC ISO timestamp", () => {
  const { task, bus } = makeFixture();
  const message = send(bus, task);
  assert.match(message.messageId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.match(message.createdAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  assert.deepEqual(Object.keys(message), [
    "schemaVersion", "messageId", "taskRef", "senderId", "recipientId", "type",
    "payload", "replyToMessageId", "createdAt"
  ]);
});

test("11. preserves insertion order and filters by taskId", () => {
  const { task, bus, isRegisteredAgent } = makeFixture();
  const otherTask = createTask({ ...TASK_INPUT, objective: "Second task" }, { isRegisteredAgent });
  const first = send(bus, task);
  const second = send(bus, otherTask);
  const third = send(bus, task);
  assert.deepEqual(listMessages(bus).map(({ messageId }) => messageId), [first.messageId, second.messageId, third.messageId]);
  assert.deepEqual(listMessages(bus, { taskId: task.taskId }).map(({ messageId }) => messageId), [first.messageId, third.messageId]);
  assert.equal(getMessage(bus, second.messageId), second);
  assert.equal(getMessage(bus, "missing"), null);
});

test("12. isolates Bus instances and keeps storage private", () => {
  const { task, isRegisteredAgent, bus } = makeFixture();
  const otherBus = createCommunicationBus({ isRegisteredAgent });
  const message = send(bus, task);
  assert.equal(getMessage(otherBus, message.messageId), null);
  assert.deepEqual(Object.keys(bus), []);
  assert.throws(() => sendMessage({}, {}), { code: "INVALID_BUS" });
});

test("13. deeply copies and freezes object and array payload inputs and returned records", () => {
  const { task, bus } = makeFixture();
  const input = { nested: [{ text: "before" }] };
  const message = send(bus, task, { payload: input });
  input.nested[0].text = "after";
  assert.equal(message.payload.nested[0].text, "before");
  assert.ok(Object.isFrozen(message));
  assert.ok(Object.isFrozen(message.taskRef));
  assert.ok(Object.isFrozen(message.payload.nested[0]));
  assert.throws(() => { message.payload.nested[0].text = "mutate"; }, TypeError);
  const listed = listMessages(bus);
  assert.ok(Object.isFrozen(listed));
  assert.throws(() => listed.push(message), TypeError);
  assert.equal(getMessage(bus, message.messageId).payload.nested[0].text, "before");

  const arrayInput = [{ value: "before" }];
  const arrayMessage = send(bus, task, { payload: arrayInput });
  arrayInput[0].value = "after";
  assert.equal(arrayMessage.payload[0].value, "before");
  assert.ok(Object.isFrozen(arrayMessage.payload));
  assert.throws(() => { arrayMessage.payload[0].value = "mutate"; }, TypeError);
  assert.equal(getMessage(bus, arrayMessage.messageId).payload[0].value, "before");
});

test("14. captures task context without modifying Task or Registry", () => {
  const { task, bus, registry, isRegisteredAgent } = makeFixture();
  const beforeAgents = [...registry.entries()];
  const beforeTask = JSON.stringify(task);
  const message = send(bus, task);
  assert.deepEqual(message.taskRef, {
    taskId: task.taskId,
    state: task.state,
    workRevision: task.workRevision
  });
  assert.equal(validateTask(task, { isRegisteredAgent }), true);
  assert.equal(JSON.stringify(task), beforeTask);
  assert.deepEqual([...registry.entries()], beforeAgents);
});

test("15. rejects RESPONSE without a valid matching REQUEST", () => {
  const { task, bus, isRegisteredAgent } = makeFixture();
  assert.throws(() => send(bus, task, {
    senderId: "gemini", recipientId: "codex", type: "RESPONSE", replyToMessageId: "missing"
  }), { code: "INVALID_MESSAGE_REFERENCE" });
  const request = send(bus, task, { type: "REQUEST" });
  const otherTask = createTask({ ...TASK_INPUT, objective: "Other" }, { isRegisteredAgent });
  assert.throws(() => send(bus, otherTask, {
    senderId: "gemini", recipientId: "codex", type: "RESPONSE", replyToMessageId: request.messageId
  }), { code: "INVALID_MESSAGE_REFERENCE" });
  assert.throws(() => send(bus, task, {
    senderId: "chatgpt", recipientId: "codex", type: "RESPONSE", replyToMessageId: request.messageId
  }), { code: "INVALID_MESSAGE_REFERENCE" });
  assert.throws(() => send(bus, task, { type: "INFO", replyToMessageId: request.messageId }), {
    code: "INVALID_MESSAGE"
  });
});

test("16. allows only one RESPONSE for each REQUEST", () => {
  const { task, bus } = makeFixture();
  const request = send(bus, task, { type: "REQUEST" });
  send(bus, task, {
    senderId: "gemini", recipientId: "codex", type: "RESPONSE", replyToMessageId: request.messageId
  });
  const before = listMessages(bus);
  assert.throws(() => send(bus, task, {
    senderId: "gemini", recipientId: "codex", type: "RESPONSE", replyToMessageId: request.messageId
  }), { code: "DUPLICATE_RESPONSE" });
  assert.deepEqual(listMessages(bus), before);
});
