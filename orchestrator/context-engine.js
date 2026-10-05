"use strict";

const TASK_STATES = Object.freeze([
  "PROPOSED",
  "REVIEW",
  "APPROVED",
  "IMPLEMENTING",
  "TESTING",
  "AUDIT",
  "COMMITTED",
  "READY_FOR_INTEGRATION",
  "INTEGRATED",
  "BLOCKED",
  "REJECTED"
]);
const SCOPE_FIELDS = Object.freeze([
  "objective",
  "writerId",
  "reviewerId",
  "allowedFiles",
  "forbiddenAreas",
  "sourcesOfTruth",
  "tests",
  "acceptanceCriteria",
  "approvalRequirements",
  "diffExpectation",
  "branch",
  "baseCommit"
]);
const CLASSIFICATIONS = Object.freeze([
  "FACT",
  "USER-CONFIRMED",
  "INFERENCE",
  "PROPOSAL",
  "PENDING VERIFICATION"
]);
const SCOPE_APPROVAL_STATUSES = Object.freeze(["NOT_APPROVED", "MATCH", "MISMATCH"]);
const SCOPE_FIELD_SET = new Set(SCOPE_FIELDS);
const ITEM_FIELD_SET = new Set(["sourceRef", "classification", "content"]);

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

function assertKeys(value, allowed, label, code) {
  const keys = Object.keys(value);
  const unknown = keys.filter((key) => !allowed.has(key));
  if (unknown.length) {
    throw fail(code, `${label} contains unsupported fields: ${unknown.join(", ")}.`);
  }
  const missing = [...allowed].filter((key) => !Object.hasOwn(value, key));
  if (missing.length) {
    throw fail(code, `${label} is missing required fields: ${missing.join(", ")}.`);
  }
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function copyPlain(value) {
  if (Array.isArray(value)) return value.map(copyPlain);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, copyPlain(item)]));
  }
  return value;
}

function checkStringArray(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw fail("INVALID_CONTEXT_INPUT", `${label} must be an array of strings.`);
  }
  const entries = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index) || !nonEmptyString(value[index])) {
      throw fail("INVALID_CONTEXT_INPUT", `${label} must contain only non-empty strings.`);
    }
    entries.push(value[index]);
  }
  if (new Set(entries).size !== entries.length) {
    throw fail("INVALID_CONTEXT_INPUT", `${label} must not contain duplicates.`);
  }
}

function checkSnapshotStringArray(value, label, { allowEmpty = true } = {}) {
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0)) {
    throw fail("INVALID_CONTEXT_SNAPSHOT", `${label} must be an array of strings.`);
  }
  const entries = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index) || !nonEmptyString(value[index])) {
      throw fail("INVALID_CONTEXT_SNAPSHOT", `${label} must contain only non-empty strings.`);
    }
    entries.push(value[index]);
  }
  if (new Set(entries).size !== entries.length) {
    throw fail("INVALID_CONTEXT_SNAPSHOT", `${label} must not contain duplicates.`);
  }
}

function checkScope(scope, errorCode) {
  const report = (condition, message) => {
    if (!condition) throw fail(errorCode, message);
  };
  report(isPlainObject(scope), "scope must be a plain object.");
  const keys = Object.keys(scope);
  const unknown = keys.filter((key) => !SCOPE_FIELD_SET.has(key));
  const missing = SCOPE_FIELDS.filter((key) => !Object.hasOwn(scope, key));
  report(unknown.length === 0, `scope contains unsupported fields: ${unknown.join(", ")}.`);
  report(missing.length === 0, `scope is missing required fields: ${missing.join(", ")}.`);

  for (const field of ["objective", "writerId", "reviewerId"]) {
    report(nonEmptyString(scope[field]), `scope.${field} must be a non-empty string.`);
  }
  report(scope.writerId !== scope.reviewerId, "scope.writerId and scope.reviewerId must be different agents.");
  for (const field of ["allowedFiles", "forbiddenAreas", "sourcesOfTruth", "tests", "acceptanceCriteria"]) {
    const allowEmpty = !["allowedFiles", "sourcesOfTruth", "acceptanceCriteria"].includes(field);
    if (errorCode === "INVALID_CONTEXT_INPUT") {
      checkStringArray(scope[field], `scope.${field}`, { allowEmpty });
    } else {
      checkSnapshotStringArray(scope[field], `scope.${field}`, { allowEmpty });
    }
  }

  const approval = scope.approvalRequirements;
  report(isPlainObject(approval), "scope.approvalRequirements must be a plain object.");
  const approvalKeys = new Set(["scope", "integration"]);
  report(Object.keys(approval).length === 2
    && [...approvalKeys].every((key) => Object.hasOwn(approval, key)),
  "scope.approvalRequirements must contain exactly scope and integration.");
  report(approval.scope === "PRODUCT_OWNER" && approval.integration === "PRODUCT_OWNER",
    "scope.approvalRequirements must require PRODUCT_OWNER for scope and integration.");

  const diff = scope.diffExpectation;
  report(isPlainObject(diff), "scope.diffExpectation must be a plain object.");
  const diffKeys = new Set(["expectedFiles", "expectedLines"]);
  report(Object.keys(diff).length === 2 && [...diffKeys].every((key) => Object.hasOwn(diff, key)),
    "scope.diffExpectation must contain exactly expectedFiles and expectedLines.");
  if (errorCode === "INVALID_CONTEXT_INPUT") {
    checkStringArray(diff.expectedFiles, "scope.diffExpectation.expectedFiles");
  } else {
    checkSnapshotStringArray(diff.expectedFiles, "scope.diffExpectation.expectedFiles");
  }
  report(diff.expectedLines === null
    || (Number.isInteger(diff.expectedLines) && diff.expectedLines >= 0),
  "scope.diffExpectation.expectedLines must be a non-negative integer or null.");

  for (const field of ["branch", "baseCommit"]) {
    report(scope[field] === null || nonEmptyString(scope[field]),
      `scope.${field} must be a non-empty string or null.`);
  }
}

function checkTask(task) {
  if (!isPlainObject(task)) throw fail("INVALID_CONTEXT_INPUT", "task must be a plain object.");
  if (!nonEmptyString(task.taskId)) throw fail("INVALID_CONTEXT_INPUT", "task.taskId is required.");
  if (!TASK_STATES.includes(task.state)) throw fail("INVALID_CONTEXT_INPUT", "task.state is not an O-001 state.");
  if (!Number.isInteger(task.workRevision) || task.workRevision < 0) {
    throw fail("INVALID_CONTEXT_INPUT", "task.workRevision must be a non-negative integer.");
  }
  if (!Object.hasOwn(task, "scopeApproval")
      || (task.scopeApproval !== null && !isPlainObject(task.scopeApproval))) {
    throw fail("INVALID_CONTEXT_INPUT", "task.scopeApproval must be null or a plain object.");
  }
  const scope = Object.fromEntries(SCOPE_FIELDS.map((field) => [field, copyPlain(task[field])]));
  checkScope(scope, "INVALID_CONTEXT_INPUT");
  if (task.scopeApproval !== null) {
    checkScope(task.scopeApproval.scopeSnapshot, "INVALID_CONTEXT_INPUT");
  }
  return scope;
}

function checkItems(items, errorCode) {
  if (!Array.isArray(items)) throw fail(errorCode, "items must be an array.");
  const output = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (!Object.hasOwn(items, index) || !isPlainObject(item)) {
      throw fail(errorCode, `items[${index}] must be a plain object.`);
    }
    const keys = Object.keys(item);
    const unknown = keys.filter((key) => !ITEM_FIELD_SET.has(key));
    const missing = [...ITEM_FIELD_SET].filter((key) => !Object.hasOwn(item, key));
    if (unknown.length || missing.length) {
      throw fail(errorCode, `items[${index}] must contain exactly sourceRef, classification and content.`);
    }
    if (!nonEmptyString(item.sourceRef)) {
      throw fail(errorCode, `items[${index}].sourceRef must be a non-empty string.`);
    }
    if (!CLASSIFICATIONS.includes(item.classification)) {
      throw fail(errorCode, `items[${index}].classification is unsupported.`);
    }
    if (!nonEmptyString(item.content)) {
      throw fail(errorCode, `items[${index}].content must be a non-empty string.`);
    }
    output.push({
      sourceRef: item.sourceRef,
      classification: item.classification,
      content: item.content
    });
  }
  return output;
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

function validateContextSnapshot(snapshot) {
  if (!isPlainObject(snapshot)) {
    throw fail("INVALID_CONTEXT_SNAPSHOT", "snapshot must be a plain object.");
  }
  assertKeys(snapshot, new Set([
    "schemaVersion", "capturedAt", "task", "scopeApprovalStatus", "scope", "items"
  ]), "snapshot", "INVALID_CONTEXT_SNAPSHOT");
  if (snapshot.schemaVersion !== 1) {
    throw fail("INVALID_CONTEXT_SNAPSHOT", "schemaVersion must be 1.");
  }
  if (!validTimestamp(snapshot.capturedAt)) {
    throw fail("INVALID_CONTEXT_SNAPSHOT", "capturedAt must be a valid UTC ISO timestamp.");
  }
  if (!isPlainObject(snapshot.task)) {
    throw fail("INVALID_CONTEXT_SNAPSHOT", "task must be a plain object.");
  }
  assertKeys(snapshot.task, new Set(["taskId", "state", "workRevision"]),
    "snapshot.task", "INVALID_CONTEXT_SNAPSHOT");
  if (!nonEmptyString(snapshot.task.taskId)
      || !TASK_STATES.includes(snapshot.task.state)
      || !Number.isInteger(snapshot.task.workRevision)
      || snapshot.task.workRevision < 0) {
    throw fail("INVALID_CONTEXT_SNAPSHOT", "snapshot.task fields are invalid.");
  }
  if (!SCOPE_APPROVAL_STATUSES.includes(snapshot.scopeApprovalStatus)) {
    throw fail("INVALID_CONTEXT_SNAPSHOT", "scopeApprovalStatus is invalid.");
  }
  checkScope(snapshot.scope, "INVALID_CONTEXT_SNAPSHOT");
  checkItems(snapshot.items, "INVALID_CONTEXT_SNAPSHOT");
  return true;
}

function createContextSnapshot(task, items) {
  const scope = checkTask(task);
  const capturedItems = checkItems(items, "INVALID_CONTEXT_INPUT");
  const { scopeApprovalStatus } = require("./task-engine");
  const snapshot = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    task: {
      taskId: task.taskId,
      state: task.state,
      workRevision: task.workRevision
    },
    scopeApprovalStatus: scopeApprovalStatus(task),
    scope,
    items: capturedItems
  };
  validateContextSnapshot(snapshot);
  return deepFreeze(snapshot);
}

module.exports = {
  createContextSnapshot,
  validateContextSnapshot
};
