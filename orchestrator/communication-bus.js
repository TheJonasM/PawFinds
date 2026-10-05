"use strict";

const { randomUUID } = require("node:crypto");
const { validateTask } = require("./task-engine");

const BUS_DATA = new WeakMap();
const MESSAGE_TYPES = new Set(["INFO", "REQUEST", "RESPONSE"]);
const MESSAGE_FIELDS = new Set([
  "schemaVersion",
  "messageId",
  "taskRef",
  "senderId",
  "recipientId",
  "type",
  "payload",
  "replyToMessageId",
  "createdAt"
]);
const SEND_FIELDS = new Set([
  "task",
  "senderId",
  "recipientId",
  "type",
  "payload",
  "replyToMessageId"
]);
const FILTER_FIELDS = new Set(["taskId"]);
const RESERVED_PAYLOAD_KEYS = new Set([
  "role",
  "roles",
  "permission",
  "permissions",
  "scope",
  "scopes",
  "authorization",
  "approval",
  "scopeapproval",
  "integrationapproval"
]);

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

function assertExactKeys(value, expected, label) {
  if (!isPlainObject(value)) throw fail("INVALID_MESSAGE", `${label} must be a plain object.`);
  const keys = Reflect.ownKeys(value);
  const extras = keys.filter((key) => !expected.has(key));
  const missing = [...expected].filter((key) => !Object.hasOwn(value, key));
  const invalidDescriptors = keys.filter((key) => {
    if (typeof key !== "string") return true;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return !descriptor.enumerable || !Object.hasOwn(descriptor, "value");
  });
  if (extras.length || missing.length || invalidDescriptors.length) {
    throw fail("INVALID_MESSAGE", `${label} fields are invalid (extra: ${extras.map(String).join(", ")}; missing: ${missing.join(", ")}).`);
  }
}

function validTimestamp(value) {
  return typeof value === "string"
    && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function cloneJsonValue(value, ancestors = new Set(), path = "payload") {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "object") {
    throw fail("INVALID_MESSAGE", `${path} contains a value that is not JSON-compatible.`);
  }
  if (ancestors.has(value)) throw fail("INVALID_MESSAGE", `${path} contains a circular reference.`);

  ancestors.add(value);
  let result;
  if (Array.isArray(value)) {
    if (Object.getOwnPropertySymbols(value).length) {
      throw fail("INVALID_MESSAGE", `${path} arrays cannot contain symbol properties.`);
    }
    const extraNames = Object.getOwnPropertyNames(value).filter((key) => key !== "length");
    if (extraNames.some((key) => !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= value.length)) {
      throw fail("INVALID_MESSAGE", `${path} arrays cannot contain named properties.`);
    }
    result = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        throw fail("INVALID_MESSAGE", `${path} contains a sparse array.`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw fail("INVALID_MESSAGE", `${path} cannot contain accessors or non-enumerable array items.`);
      }
      result.push(cloneJsonValue(descriptor.value, ancestors, `${path}[${index}]`));
    }
  } else {
    if (!isPlainObject(value)) throw fail("INVALID_MESSAGE", `${path} contains a non-plain object.`);
    if (Object.getOwnPropertySymbols(value).length) {
      throw fail("INVALID_MESSAGE", `${path} objects cannot contain symbol properties.`);
    }
    result = {};
    for (const key of Object.getOwnPropertyNames(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor.enumerable || !Object.hasOwn(descriptor, "value")) {
        throw fail("INVALID_MESSAGE", `${path} cannot contain accessors or non-enumerable fields.`);
      }
      if (RESERVED_PAYLOAD_KEYS.has(key.toLowerCase())) {
        throw fail("INVALID_MESSAGE", `${path} contains a reserved authorization field: ${key}.`);
      }
      Object.defineProperty(result, key, {
        value: cloneJsonValue(descriptor.value, ancestors, `${path}.${key}`),
        enumerable: true,
        configurable: true,
        writable: true
      });
    }
  }
  ancestors.delete(value);
  return result;
}

function assertBus(bus) {
  if ((typeof bus !== "object" && typeof bus !== "function") || bus === null || !BUS_DATA.has(bus)) {
    throw fail("INVALID_BUS", "Bus must be created by createCommunicationBus().");
  }
  return BUS_DATA.get(bus);
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

function createCommunicationBus({ isRegisteredAgent } = {}) {
  if (typeof isRegisteredAgent !== "function") {
    throw fail("INVALID_BUS", "isRegisteredAgent must be a function.");
  }
  const bus = Object.freeze(Object.create(null));
  BUS_DATA.set(bus, { isRegisteredAgent, messages: [], byId: new Map(), respondedTo: new Set() });
  return bus;
}

function sendMessage(bus, input) {
  const data = assertBus(bus);
  assertExactKeys(input, SEND_FIELDS, "message input");

  const { task, senderId, recipientId, type, payload, replyToMessageId } = input;
  assertRegistered(data.isRegisteredAgent, senderId, "senderId");
  assertRegistered(data.isRegisteredAgent, recipientId, "recipientId");
  if (!MESSAGE_TYPES.has(type)) throw fail("INVALID_MESSAGE", "type must be INFO, REQUEST or RESPONSE.");
  if (type === "RESPONSE") {
    if (!nonEmptyString(replyToMessageId)) {
      throw fail("INVALID_MESSAGE_REFERENCE", "RESPONSE requires replyToMessageId.");
    }
  } else if (replyToMessageId !== null) {
    throw fail("INVALID_MESSAGE", "INFO and REQUEST require replyToMessageId: null.");
  }
  const taskRef = captureTaskRef(task, data.isRegisteredAgent);
  const copiedPayload = cloneJsonValue(payload);
  let request = null;
  if (type === "RESPONSE") {
    request = data.byId.get(replyToMessageId);
    if (!request
        || request.type !== "REQUEST"
        || request.taskRef.taskId !== taskRef.taskId
        || request.taskRef.state !== taskRef.state
        || request.taskRef.workRevision !== taskRef.workRevision
        || request.senderId !== recipientId
        || request.recipientId !== senderId) {
      throw fail("INVALID_MESSAGE_REFERENCE", "RESPONSE must refer to an inverse-party REQUEST with the same taskRef.");
    }
    if (data.respondedTo.has(replyToMessageId)) {
      throw fail("DUPLICATE_RESPONSE", "A REQUEST can have at most one RESPONSE.");
    }
  }

  const timestamp = new Date().toISOString();
  let messageId = randomUUID();
  while (data.byId.has(messageId)) messageId = randomUUID();
  const message = deepFreeze({
    schemaVersion: 1,
    messageId,
    taskRef,
    senderId,
    recipientId,
    type,
    payload: copiedPayload,
    replyToMessageId,
    createdAt: timestamp
  });
  if (Object.keys(message).some((key) => !MESSAGE_FIELDS.has(key))) {
    throw fail("INVALID_MESSAGE", "Constructed message does not match the closed schema.");
  }

  data.messages.push(message);
  data.byId.set(message.messageId, message);
  if (request) data.respondedTo.add(request.messageId);
  return message;
}

function getMessage(bus, messageId) {
  const data = assertBus(bus);
  if (!nonEmptyString(messageId)) throw fail("INVALID_MESSAGE", "messageId must be a non-empty string.");
  return data.byId.get(messageId) || null;
}

function listMessages(bus, filters = {}) {
  const data = assertBus(bus);
  if (!isPlainObject(filters)
      || Reflect.ownKeys(filters).some((key) => typeof key !== "string" || !FILTER_FIELDS.has(key)
        || !Object.getOwnPropertyDescriptor(filters, key).enumerable
        || !Object.hasOwn(Object.getOwnPropertyDescriptor(filters, key), "value"))
      || (Object.hasOwn(filters, "taskId") && !nonEmptyString(filters.taskId))) {
    throw fail("INVALID_MESSAGE", "Message filters may contain only a non-empty taskId.");
  }
  const result = Object.hasOwn(filters, "taskId")
    ? data.messages.filter((message) => message.taskRef.taskId === filters.taskId)
    : [...data.messages];
  return Object.freeze(result);
}

module.exports = {
  createCommunicationBus,
  getMessage,
  listMessages,
  sendMessage
};
