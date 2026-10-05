"use strict";

const { randomUUID } = require("node:crypto");
const { validateTask } = require("./task-engine");

const ENGINE_DATA = new WeakMap();
const INPUT_FIELDS = new Set(["task", "creatorId", "recipientId", "summary"]);
const FILTER_FIELDS = new Set(["taskId"]);
const HANDOFF_STATES = new Set(["PENDING", "ACCEPTED", "REJECTED", "COMPLETED"]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) throw fail("INVALID_HANDOFF", `${label} must be a plain object.`);
  const keys = Reflect.ownKeys(value);
  const extras = keys.filter((key) => !expected.has(key));
  const missing = [...expected].filter((key) => !Object.hasOwn(value, key));
  const invalidDescriptors = keys.filter((key) => {
    if (typeof key !== "string") return true;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return !descriptor.enumerable || !Object.hasOwn(descriptor, "value");
  });
  if (extras.length || missing.length || invalidDescriptors.length) {
    throw fail("INVALID_HANDOFF", `${label} fields are invalid (extra: ${extras.map(String).join(", ")}; missing: ${missing.join(", ")}).`);
  }
}

function assertEngine(engine) {
  if ((typeof engine !== "object" && typeof engine !== "function") || engine === null || !ENGINE_DATA.has(engine)) {
    throw fail("INVALID_HANDOFF_ENGINE", "Engine must be created by createHandoffEngine().");
  }
  return ENGINE_DATA.get(engine);
}

function assertRegistered(resolver, id, label) {
  if (!nonEmptyString(id) || id === "PRODUCT_OWNER" || resolver(id) !== true) {
    throw fail("UNKNOWN_AGENT", `${label} must identify a registered O-003 agent.`);
  }
}

function captureTaskRef(task, resolver) {
  validateTask(task, { isRegisteredAgent: resolver });
  return {
    taskId: task.taskId,
    state: task.state,
    workRevision: task.workRevision
  };
}

function statusForAction(action) {
  switch (action) {
    case "CREATE": return "PENDING";
    case "ACCEPT": return "ACCEPTED";
    case "REJECT": return "REJECTED";
    case "COMPLETE": return "COMPLETED";
    default: throw fail("INVALID_HANDOFF", `Unknown handoff history action: ${action}.`);
  }
}

function freezeView(source, history = source.history) {
  const view = {
    schemaVersion: 1,
    handoffId: source.handoffId,
    taskRef: { ...source.taskRef },
    creatorId: source.creatorId,
    recipientId: source.recipientId,
    summary: source.summary,
    status: statusForAction(history.at(-1)?.action),
    createdAt: source.createdAt,
    history: history.map((event) => ({ ...event }))
  };
  return deepFreeze(view);
}

function createHandoffEngine({ isRegisteredAgent } = {}) {
  if (typeof isRegisteredAgent !== "function") {
    throw fail("INVALID_HANDOFF_ENGINE", "isRegisteredAgent must be a function.");
  }
  const engine = Object.freeze(Object.create(null));
  ENGINE_DATA.set(engine, { isRegisteredAgent, handoffs: new Map(), order: [] });
  return engine;
}

function createHandoff(engine, input) {
  const data = assertEngine(engine);
  assertExactKeys(input, INPUT_FIELDS, "handoff input");
  const { task, creatorId, recipientId, summary } = input;
  assertRegistered(data.isRegisteredAgent, creatorId, "creatorId");
  assertRegistered(data.isRegisteredAgent, recipientId, "recipientId");
  if (creatorId === recipientId) {
    throw fail("INVALID_HANDOFF", "creatorId and recipientId must be different agents.");
  }
  if (!nonEmptyString(summary)) throw fail("INVALID_HANDOFF", "summary must be a non-empty string.");
  const taskRef = captureTaskRef(task, data.isRegisteredAgent);
  const timestamp = new Date().toISOString();
  const source = {
    schemaVersion: 1,
    handoffId: randomUUID(),
    taskRef,
    creatorId,
    recipientId,
    summary,
    createdAt: timestamp,
    history: [{ action: "CREATE", actorId: creatorId, timestamp }]
  };
  const view = freezeView(source);
  data.handoffs.set(view.handoffId, view);
  data.order.push(view.handoffId);
  return view;
}

function transition(engine, handoffId, actorId, action, reason) {
  const data = assertEngine(engine);
  if (!nonEmptyString(handoffId)) throw fail("UNKNOWN_HANDOFF", "handoffId must be a non-empty string.");
  const current = data.handoffs.get(handoffId);
  if (!current) throw fail("UNKNOWN_HANDOFF", `Handoff ${handoffId} does not exist.`);
  assertRegistered(data.isRegisteredAgent, actorId, "actorId");
  if (actorId !== current.recipientId) {
    throw fail("UNAUTHORIZED_HANDOFF_ACTOR", "Only the registered recipient may decide or complete this handoff.");
  }

  const transitions = {
    ACCEPT: { from: "PENDING", to: "ACCEPTED" },
    REJECT: { from: "PENDING", to: "REJECTED" },
    COMPLETE: { from: "ACCEPTED", to: "COMPLETED" }
  };
  const rule = transitions[action];
  if (!rule || current.status !== rule.from || !HANDOFF_STATES.has(rule.to)) {
    throw fail("INVALID_HANDOFF_TRANSITION", `Action ${action} is invalid from ${current.status}.`);
  }
  if (action === "REJECT" && !nonEmptyString(reason)) {
    throw fail("INVALID_HANDOFF", "REJECT requires a non-empty reason.");
  }
  if (action !== "REJECT" && reason !== undefined) {
    throw fail("INVALID_HANDOFF", "Only REJECT may include a reason.");
  }

  const event = { action, actorId, timestamp: new Date().toISOString() };
  if (action === "REJECT") event.reason = reason;
  const next = freezeView(current, [...current.history, event]);
  data.handoffs.set(handoffId, next);
  return next;
}

function acceptHandoff(engine, handoffId, actorId) {
  return transition(engine, handoffId, actorId, "ACCEPT");
}

function rejectHandoff(engine, handoffId, actorId, reason) {
  return transition(engine, handoffId, actorId, "REJECT", reason);
}

function completeHandoff(engine, handoffId, actorId) {
  return transition(engine, handoffId, actorId, "COMPLETE");
}

function getHandoff(engine, handoffId) {
  const data = assertEngine(engine);
  if (!nonEmptyString(handoffId)) throw fail("UNKNOWN_HANDOFF", "handoffId must be a non-empty string.");
  return data.handoffs.get(handoffId) || null;
}

function listHandoffs(engine, filters = {}) {
  const data = assertEngine(engine);
  if (!isPlainObject(filters)
      || Reflect.ownKeys(filters).some((key) => typeof key !== "string" || !FILTER_FIELDS.has(key)
        || !Object.getOwnPropertyDescriptor(filters, key).enumerable
        || !Object.hasOwn(Object.getOwnPropertyDescriptor(filters, key), "value"))
      || (Object.hasOwn(filters, "taskId") && !nonEmptyString(filters.taskId))) {
    throw fail("INVALID_HANDOFF", "Handoff filters may contain only a non-empty taskId.");
  }
  const views = data.order
    .map((id) => data.handoffs.get(id))
    .filter((handoff) => !Object.hasOwn(filters, "taskId") || handoff.taskRef.taskId === filters.taskId);
  return Object.freeze(views);
}

module.exports = {
  acceptHandoff,
  completeHandoff,
  createHandoff,
  createHandoffEngine,
  getHandoff,
  listHandoffs,
  rejectHandoff
};
