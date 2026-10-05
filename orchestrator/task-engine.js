"use strict";

const { randomUUID } = require("node:crypto");
const { isDeepStrictEqual } = require("node:util");
const { TASK_STATES, classifyTransition } = require("./state-machine");

const REVIEW_OUTCOMES = Object.freeze(["PASS", "REQUEST_CHANGES", "REJECT"]);
const REVIEW_PHASES = Object.freeze(["PROPOSAL", "IMPLEMENTATION", "AUDIT", "FINAL"]);
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
const PROPOSAL_UPDATE_FIELDS = new Set([
  ...SCOPE_FIELDS,
  "diffExpectation",
  "branch",
  "baseCommit"
]);
const INPUT_FIELDS = new Set([
  "taskId",
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

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function stringArray(value, field, { allowEmpty = true } = {}) {
  if (!Array.isArray(value)
      || (!allowEmpty && value.length === 0)
      || value.some((item) => !nonEmptyString(item))) {
    throw fail("INVALID_TASK", `${field} must be an array of non-empty strings.`);
  }
  if (new Set(value).size !== value.length) {
    throw fail("INVALID_TASK", `${field} must not contain duplicates.`);
  }
}

function assertKnownKeys(object, allowed, label, code = "INVALID_TASK") {
  const unknown = Object.keys(object).filter((key) => !allowed.has(key));
  if (unknown.length) throw fail(code, `${label} contains unsupported fields: ${unknown.join(", ")}`);
}

function nowIso() {
  return new Date().toISOString();
}

function scopeSnapshot(task) {
  return Object.fromEntries(SCOPE_FIELDS.map((field) => [field, clone(task[field])]));
}

function validTimestamp(value) {
  return typeof value === "string"
    && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)
    && Number.isFinite(Date.parse(value));
}

function checkResolver(resolver) {
  if (resolver !== undefined && typeof resolver !== "function") {
    throw new TypeError("isRegisteredAgent must be a function when provided.");
  }
}

function checkAgentAssignments(task, isRegisteredAgent) {
  if (!nonEmptyString(task.writerId) || !nonEmptyString(task.reviewerId)) {
    throw fail("INVALID_TASK", "writerId and reviewerId are required.");
  }
  if (task.writerId === task.reviewerId) {
    throw fail("INVALID_TASK", "writerId and reviewerId must identify different agents.");
  }
  if (isRegisteredAgent
      && (!isRegisteredAgent(task.writerId) || !isRegisteredAgent(task.reviewerId))) {
    throw fail("UNKNOWN_AGENT", "Writer and reviewer must be registered agents.");
  }
}

function checkApprovalRequirements(value) {
  if (!isPlainObject(value)
      || value.scope !== "PRODUCT_OWNER"
      || value.integration !== "PRODUCT_OWNER") {
    throw fail("INVALID_TASK", "approvalRequirements must separately require PRODUCT_OWNER for scope and integration.");
  }
}

function checkDiffExpectation(value) {
  if (!isPlainObject(value)) throw fail("INVALID_TASK", "diffExpectation must be an object.");
  assertKnownKeys(value, new Set(["expectedFiles", "expectedLines"]), "diffExpectation");
  stringArray(value.expectedFiles, "diffExpectation.expectedFiles");
  if (value.expectedLines !== null
      && (!Number.isInteger(value.expectedLines) || value.expectedLines < 0)) {
    throw fail("INVALID_TASK", "diffExpectation.expectedLines must be a non-negative integer or null.");
  }
}

function checkBaseReference(value, field) {
  if (value !== null && !nonEmptyString(value)) {
    throw fail("INVALID_TASK", `${field} must be a non-empty string or null.`);
  }
}

function checkReviewRecord(record, task) {
  if (!isPlainObject(record)
      || !nonEmptyString(record.reviewerId)
      || record.reviewerId !== task.reviewerId
      || !REVIEW_OUTCOMES.includes(record.outcome)
      || !REVIEW_PHASES.includes(record.phase)
      || !Array.isArray(record.findings)
      || record.findings.some((finding) => !nonEmptyString(finding))
      || !nonEmptyString(record.evidenceRef)
      || !Number.isInteger(record.revision)
      || record.revision < 0
      || record.revision > task.workRevision
      || !validTimestamp(record.timestamp)) {
    throw fail("INVALID_TASK", "reviewHistory contains an invalid review record.");
  }
  if (record.outcome !== "PASS" && record.findings.length === 0) {
    throw fail("INVALID_TASK", "REQUEST_CHANGES and REJECT reviews require findings.");
  }
}

function checkEvidenceRecord(record, task, label) {
  const expectedPhase = label === "auditHistory" ? "AUDIT" : "FINAL";
  if (!isPlainObject(record)
      || !nonEmptyString(record.reviewerId)
      || record.reviewerId !== task.reviewerId
      || record.phase !== expectedPhase
      || record.outcome !== "PASS"
      || !nonEmptyString(record.evidenceRef)
      || !Number.isInteger(record.revision)
      || record.revision < 0
      || record.revision > task.workRevision
      || !validTimestamp(record.timestamp)) {
    throw fail("INVALID_TASK", `${label} contains invalid or stale evidence.`);
  }
}

function checkCommitRecord(record, task, label) {
  if (!isPlainObject(record)
      || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(record.commitSha || "")
      || !nonEmptyString(record.branch)
      || !nonEmptyString(record.evidenceRef)
      || !Number.isInteger(record.revision)
      || record.revision < 0
      || record.revision > task.workRevision
      || !validTimestamp(record.recordedAt)) {
    throw fail("INVALID_TASK", `${label} contains invalid commit evidence.`);
  }
  if (task.branch && record.branch !== task.branch) {
    throw fail("INVALID_TASK", `${label} branch does not match the task branch.`);
  }
}

function checkReasonRecord(record, task, label) {
  if (!isPlainObject(record)
      || !nonEmptyString(record.reason)
      || !nonEmptyString(record.evidenceRef)
      || !Number.isInteger(record.revision)
      || record.revision < 0
      || record.revision > task.workRevision
      || !validTimestamp(record.recordedAt)) {
    throw fail("INVALID_TASK", `${label} contains invalid evidence.`);
  }
}

function checkTerminalRecord(record) {
  if (!isPlainObject(record)
      || !["BLOCKED", "REJECTED"].includes(record.state)
      || !nonEmptyString(record.reason)
      || (record.actorRef !== null && !nonEmptyString(record.actorRef))
      || (record.evidenceRef !== null && !nonEmptyString(record.evidenceRef))
      || !validTimestamp(record.timestamp)) {
    throw fail("INVALID_TASK", "terminalHistory contains an invalid record.");
  }
}

function validateTask(task, options = {}) {
  if (!isPlainObject(task)) throw fail("INVALID_TASK", "Task must be a plain object.");
  checkResolver(options.isRegisteredAgent);
  assertKnownKeys(task, new Set([
    ...INPUT_FIELDS,
    "state",
    "workRevision",
    "scopeApproval",
    "reviewHistory",
    "auditHistory",
    "commitHistory",
    "commitNotApplicableHistory",
    "finalReviewHistory",
    "terminalHistory",
    "integrationApproval",
    "integrationRef",
    "timestamps"
  ]), "task");

  if (!nonEmptyString(task.taskId)
      || !nonEmptyString(task.objective)
      || !TASK_STATES.includes(task.state)) {
    throw fail("INVALID_TASK", "taskId, objective and a canonical state are required.");
  }
  checkAgentAssignments(task, options.isRegisteredAgent);
  stringArray(task.allowedFiles, "allowedFiles", { allowEmpty: false });
  stringArray(task.forbiddenAreas, "forbiddenAreas");
  stringArray(task.sourcesOfTruth, "sourcesOfTruth", { allowEmpty: false });
  stringArray(task.tests, "tests");
  stringArray(task.acceptanceCriteria, "acceptanceCriteria", { allowEmpty: false });
  checkApprovalRequirements(task.approvalRequirements);
  checkDiffExpectation(task.diffExpectation);
  checkBaseReference(task.branch, "branch");
  checkBaseReference(task.baseCommit, "baseCommit");

  if (!Number.isInteger(task.workRevision) || task.workRevision < 0) {
    throw fail("INVALID_TASK", "workRevision must be a non-negative integer.");
  }
  if (!isPlainObject(task.timestamps)
      || !validTimestamp(task.timestamps.createdAt)
      || !validTimestamp(task.timestamps.updatedAt)) {
    throw fail("INVALID_TASK", "Task timestamps must be UTC ISO strings.");
  }

  if (!Array.isArray(task.reviewHistory)) throw fail("INVALID_TASK", "reviewHistory must be an array.");
  task.reviewHistory.forEach((record) => checkReviewRecord(record, task));

  for (const field of ["auditHistory", "finalReviewHistory"]) {
    if (!Array.isArray(task[field])) throw fail("INVALID_TASK", `${field} must be an array.`);
    task[field].forEach((record) => checkEvidenceRecord(record, task, field));
  }

  if (!Array.isArray(task.commitHistory) || !Array.isArray(task.commitNotApplicableHistory)
      || !Array.isArray(task.terminalHistory)) {
    throw fail("INVALID_TASK", "Task evidence histories must be arrays.");
  }
  task.commitHistory.forEach((record) => checkCommitRecord(record, task, "commitHistory"));
  task.commitNotApplicableHistory.forEach((record) => checkReasonRecord(record, task, "commitNotApplicableHistory"));
  task.terminalHistory.forEach(checkTerminalRecord);

  if (["APPROVED", "IMPLEMENTING", "TESTING", "AUDIT", "COMMITTED", "READY_FOR_INTEGRATION", "INTEGRATED"]
    .includes(task.state) && task.scopeApproval === null) {
    throw fail("INVALID_TASK", `${task.state} requires a scope approval record.`);
  }
  if (["BLOCKED", "REJECTED"].includes(task.state)
      && task.terminalHistory.at(-1)?.state !== task.state) {
    throw fail("INVALID_TASK", `${task.state} requires matching terminal evidence.`);
  }
  if (task.state === "COMMITTED") {
    if (task.commitHistory.at(-1)?.revision !== task.workRevision
        || task.auditHistory.at(-1)?.revision !== task.workRevision) {
      throw fail("INVALID_TASK", "COMMITTED requires current-revision audit and commit evidence.");
    }
  }
  if (task.state === "READY_FOR_INTEGRATION") {
    const currentAudit = task.auditHistory.at(-1)?.revision === task.workRevision;
    const currentFinalReview = task.finalReviewHistory.at(-1)?.revision === task.workRevision;
    const currentCommit = task.commitHistory.at(-1)?.revision === task.workRevision;
    const currentNoCommit = task.commitNotApplicableHistory.at(-1)?.revision === task.workRevision;
    if (!currentAudit || !currentFinalReview || (!currentCommit && !currentNoCommit)) {
      throw fail("INVALID_TASK", "READY_FOR_INTEGRATION requires current audit, final review and commit/applicability evidence.");
    }
  }

  if ((task.integrationApproval === null) !== (task.integrationRef === null)) {
    throw fail("INVALID_TASK", "integrationApproval and integrationRef must be recorded together.");
  }
  if (task.state === "INTEGRATED" && task.integrationApproval === null) {
    throw fail("INVALID_TASK", "INTEGRATED requires integration approval and reference.");
  }
  if (task.integrationApproval !== null && task.state !== "INTEGRATED") {
    throw fail("INVALID_TASK", "Integration evidence is only stored after INTEGRATED.");
  }
  if (task.state === "INTEGRATED") {
    const currentFinalReview = task.finalReviewHistory.at(-1)?.revision === task.workRevision;
    const currentCommit = task.commitHistory.at(-1)?.revision === task.workRevision;
    const currentNoCommit = task.commitNotApplicableHistory.at(-1)?.revision === task.workRevision;
    if (!currentFinalReview || (!currentCommit && !currentNoCommit)
        || task.integrationApproval.revision !== task.workRevision) {
      throw fail("INVALID_TASK", "INTEGRATED requires current final-review, approval and integration evidence.");
    }
  }

  if (task.scopeApproval !== null) {
    const approval = task.scopeApproval;
    if (!isPlainObject(approval)
        || approval.approverRef !== "PRODUCT_OWNER"
        || !nonEmptyString(approval.evidenceRef)
        || !validTimestamp(approval.approvedAt)
        || !isPlainObject(approval.scopeSnapshot)
        || !isDeepStrictEqual(Object.keys(approval.scopeSnapshot).sort(), [...SCOPE_FIELDS].sort())) {
      throw fail("INVALID_TASK", "scopeApproval must contain a Product Owner reference, evidence and exact scope snapshot.");
    }
    SCOPE_FIELDS.forEach((field) => {
      const value = approval.scopeSnapshot[field];
      if (["objective", "writerId", "reviewerId"].includes(field)) {
        if (!nonEmptyString(value)) throw fail("INVALID_TASK", `scopeApproval snapshot ${field} is invalid.`);
      } else if (["allowedFiles", "forbiddenAreas", "sourcesOfTruth", "tests", "acceptanceCriteria"].includes(field)) {
        stringArray(value, `scopeApproval.scopeSnapshot.${field}`, {
          allowEmpty: field !== "allowedFiles" && field !== "sourcesOfTruth" && field !== "acceptanceCriteria"
        });
      } else if (field === "approvalRequirements") {
        checkApprovalRequirements(value);
      } else if (field === "diffExpectation") {
        checkDiffExpectation(value);
      } else if (["branch", "baseCommit"].includes(field)) {
        checkBaseReference(value, `scopeApproval.scopeSnapshot.${field}`);
      }
    });
  }

  if (task.integrationApproval !== null) {
    const approval = task.integrationApproval;
    if (!isPlainObject(approval)
        || approval.approverRef !== "PRODUCT_OWNER"
        || !nonEmptyString(approval.evidenceRef)
        || !validTimestamp(approval.approvedAt)
        || approval.revision !== task.workRevision) {
      throw fail("INVALID_TASK", "integrationApproval must be explicit, evidenced and tied to the current work revision.");
    }
  }
  if (task.integrationRef !== null && !nonEmptyString(task.integrationRef)) {
    throw fail("INVALID_TASK", "integrationRef must be a non-empty string or null.");
  }

  return true;
}

function createTask(input, options = {}) {
  if (!isPlainObject(input)) throw new TypeError("Task input must be a plain object.");
  checkResolver(options.isRegisteredAgent);
  assertKnownKeys(input, INPUT_FIELDS, "task input");

  const task = {
    taskId: input.taskId === undefined ? randomUUID() : input.taskId,
    objective: input.objective,
    state: "PROPOSED",
    writerId: input.writerId,
    reviewerId: input.reviewerId,
    allowedFiles: clone(input.allowedFiles),
    forbiddenAreas: clone(input.forbiddenAreas),
    sourcesOfTruth: clone(input.sourcesOfTruth),
    tests: clone(input.tests),
    acceptanceCriteria: clone(input.acceptanceCriteria),
    approvalRequirements: input.approvalRequirements
      ? clone(input.approvalRequirements)
      : { scope: "PRODUCT_OWNER", integration: "PRODUCT_OWNER" },
    diffExpectation: input.diffExpectation
      ? clone(input.diffExpectation)
      : { expectedFiles: [], expectedLines: null },
    scopeApproval: null,
    reviewHistory: [],
    auditHistory: [],
    commitHistory: [],
    commitNotApplicableHistory: [],
    finalReviewHistory: [],
    terminalHistory: [],
    integrationApproval: null,
    integrationRef: null,
    branch: input.branch ?? null,
    baseCommit: input.baseCommit ?? null,
    workRevision: 0,
    timestamps: { createdAt: nowIso(), updatedAt: nowIso() }
  };

  validateTask(task, options);
  return deepFreeze(task);
}

function scopeApprovalStatus(task) {
  if (!task || !task.scopeApproval) return "NOT_APPROVED";
  return isDeepStrictEqual(scopeSnapshot(task), task.scopeApproval.scopeSnapshot)
    ? "MATCH"
    : "MISMATCH";
}

function validateReview(review, task, expectedPhase) {
  if (!isPlainObject(review)
      || review.reviewerId !== task.reviewerId
      || !REVIEW_OUTCOMES.includes(review.outcome)
      || !REVIEW_PHASES.includes(review.phase)
      || (expectedPhase && !(Array.isArray(expectedPhase)
        ? expectedPhase.includes(review.phase)
        : review.phase === expectedPhase))
      || !nonEmptyString(review.evidenceRef)
      || !Array.isArray(review.findings)
      || review.findings.some((finding) => !nonEmptyString(finding))) {
    throw fail("REVIEW_EVIDENCE_REQUIRED", "Review outcome must identify the assigned reviewer, phase and evidence.");
  }
  if (review.outcome !== "PASS" && review.findings.length === 0) {
    throw fail("REVIEW_EVIDENCE_REQUIRED", "REQUEST_CHANGES and REJECT require at least one finding.");
  }
  return {
    reviewerId: review.reviewerId,
    phase: review.phase,
    outcome: review.outcome,
    findings: clone(review.findings),
    evidenceRef: review.evidenceRef,
    revision: task.workRevision,
    timestamp: nowIso()
  };
}

function validateApproval(input, label) {
  if (!isPlainObject(input)
      || input.approverRef !== "PRODUCT_OWNER"
      || !nonEmptyString(input.evidenceRef)) {
    throw fail("APPROVAL_EVIDENCE_REQUIRED", `${label} requires explicit Product Owner evidence.`);
  }
  return {
    approverRef: input.approverRef,
    evidenceRef: input.evidenceRef,
    approvedAt: nowIso()
  };
}

function validateCommitEvidence(input, task) {
  if (!isPlainObject(input)
      || !/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(input.commitSha || "")
      || !nonEmptyString(input.branch)
      || (task.branch && input.branch !== task.branch)
      || !nonEmptyString(input.evidenceRef)) {
    throw fail("COMMIT_EVIDENCE_REQUIRED", "Commit evidence requires a full SHA, matching branch and evidence reference.");
  }
  return {
    commitSha: input.commitSha,
    branch: input.branch,
    evidenceRef: input.evidenceRef,
    revision: task.workRevision,
    recordedAt: nowIso()
  };
}

function validateNotApplicable(input, task) {
  if (!isPlainObject(input)
      || !nonEmptyString(input.reason)
      || !nonEmptyString(input.evidenceRef)) {
    throw fail("COMMIT_EVIDENCE_REQUIRED", "A non-applicable commit/PR requires a reason and evidence reference.");
  }
  return {
    reason: input.reason,
    evidenceRef: input.evidenceRef,
    revision: task.workRevision,
    recordedAt: nowIso()
  };
}

function validateTerminalEvidence(input, state) {
  if (!isPlainObject(input)
      || !nonEmptyString(input.reason)
      || (input.evidenceRef !== undefined && !nonEmptyString(input.evidenceRef))) {
    throw fail("TERMINAL_EVIDENCE_REQUIRED", `${state} requires a recorded reason.`);
  }
  return {
    state,
    reason: input.reason,
    actorRef: nonEmptyString(input.actorRef) ? input.actorRef : null,
    evidenceRef: input.evidenceRef || null,
    timestamp: nowIso()
  };
}

function applyProposalUpdates(task, updates) {
  if (updates === undefined) return;
  if (!isPlainObject(updates)) throw fail("INVALID_TASK", "proposalUpdates must be a plain object.");
  assertKnownKeys(updates, PROPOSAL_UPDATE_FIELDS, "proposalUpdates");
  Object.assign(task, clone(updates));
}

function transitionTask(task, nextState, context = {}) {
  validateTask(task);
  if (!isPlainObject(context)) throw new TypeError("Transition context must be a plain object.");

  const kind = classifyTransition(task, nextState, {
    reviewOutcome: context.review?.outcome
  });
  assertKnownKeys(context, new Set([
    "review",
    "scopeApproval",
    "proposalUpdates",
    "commitEvidence",
    "commitNotApplicable",
    "finalReview",
    "integrationApproval",
    "integrationRef",
    "terminalEvidence"
  ]), "transition context", "INVALID_TRANSITION");

  const contextUse = [
    ["scopeApproval", nextState === "APPROVED"],
    ["proposalUpdates", kind === "PROPOSAL_CHANGES"],
    ["commitEvidence", nextState === "COMMITTED"],
    ["commitNotApplicable", task.state === "AUDIT" && nextState === "READY_FOR_INTEGRATION"],
    ["finalReview", nextState === "READY_FOR_INTEGRATION"],
    ["integrationApproval", nextState === "INTEGRATED"],
    ["integrationRef", nextState === "INTEGRATED"],
    ["terminalEvidence", nextState === "BLOCKED" || nextState === "REJECTED"]
  ];
  for (const [field, allowed] of contextUse) {
    if (context[field] !== undefined && !allowed) {
      throw fail("INVALID_TRANSITION", `${field} is not applicable to ${task.state} -> ${nextState}.`);
    }
  }

  const next = clone(task);
  let reviewRecord = null;

  if (context.review !== undefined) {
    let expectedPhase;
    if (task.state === "REVIEW") expectedPhase = "PROPOSAL";
    else if (task.state === "AUDIT" && ["COMMITTED", "READY_FOR_INTEGRATION"].includes(nextState)) {
      expectedPhase = "AUDIT";
    } else if (nextState === "IMPLEMENTING" || nextState === "REJECTED") {
      expectedPhase = ["IMPLEMENTATION", "AUDIT", "FINAL"];
    }
    if (!expectedPhase) {
      throw fail("REVIEW_EVIDENCE_REQUIRED", "Review evidence is not applicable to this transition.");
    }
    reviewRecord = validateReview(context.review, task, expectedPhase);
    const outcomeMatchesTransition =
      (nextState === "APPROVED" && reviewRecord.outcome === "PASS")
      || (kind === "PROPOSAL_CHANGES" && reviewRecord.outcome === "REQUEST_CHANGES")
      || (kind === "POST_APPROVAL_CHANGES" && reviewRecord.outcome === "REQUEST_CHANGES")
      || ((nextState === "COMMITTED" || nextState === "READY_FOR_INTEGRATION")
        && reviewRecord.phase === "AUDIT" && reviewRecord.outcome === "PASS")
      || (nextState === "REJECTED" && reviewRecord.outcome === "REJECT");
    if (!outcomeMatchesTransition) {
      throw fail("INVALID_TRANSITION", "Review result does not match the requested transition.");
    }
    if (reviewRecord.outcome === "REJECT" && nextState !== "REJECTED") {
      throw fail("INVALID_TRANSITION", "A REJECT review result must transition to REJECTED.");
    }
    if (reviewRecord.outcome === "REQUEST_CHANGES"
        && !["PROPOSAL_CHANGES", "POST_APPROVAL_CHANGES"].includes(kind)) {
      throw fail("INVALID_TRANSITION", "REQUEST_CHANGES is valid only for its protocol-defined return transitions.");
    }
    if (reviewRecord.outcome === "PASS" && nextState === "REJECTED") {
      throw fail("INVALID_TRANSITION", "PASS cannot transition a task to REJECTED.");
    }
    next.reviewHistory.push(reviewRecord);
  }

  if (nextState === "APPROVED") {
    if (!reviewRecord || reviewRecord.outcome !== "PASS") {
      throw fail("REVIEW_EVIDENCE_REQUIRED", "Scope approval requires a recorded proposal review PASS.");
    }
    const approval = validateApproval(context.scopeApproval, "Scope approval");
    next.scopeApproval = {
      ...approval,
      scopeSnapshot: scopeSnapshot(task)
    };
  }

  if (kind === "PROPOSAL_CHANGES") {
    applyProposalUpdates(next, context.proposalUpdates);
    next.workRevision += 1;
  }

  if (kind === "POST_APPROVAL_CHANGES") {
    if (!reviewRecord || reviewRecord.outcome !== "REQUEST_CHANGES") {
      throw fail("REVIEW_EVIDENCE_REQUIRED", "Post-approval return requires REQUEST_CHANGES findings.");
    }
    next.workRevision += 1;
  }

  if (nextState === "COMMITTED") {
    const audit = reviewRecord;
    if (!audit || audit.phase !== "AUDIT" || audit.outcome !== "PASS") {
      throw fail("AUDIT_EVIDENCE_REQUIRED", "AUDIT -> COMMITTED requires an audit PASS with evidence.");
    }
    const commit = validateCommitEvidence(context.commitEvidence, task);
    next.auditHistory.push(audit);
    next.commitHistory.push(commit);
  }

  if (nextState === "READY_FOR_INTEGRATION" && task.state === "AUDIT") {
    if (!reviewRecord || reviewRecord.phase !== "AUDIT" || reviewRecord.outcome !== "PASS") {
      throw fail("AUDIT_EVIDENCE_REQUIRED", "AUDIT -> READY_FOR_INTEGRATION requires an audit PASS.");
    }
    const notApplicable = validateNotApplicable(context.commitNotApplicable, task);
    const finalReview = validateReview(context.finalReview, task, "FINAL");
    if (finalReview.outcome !== "PASS") {
      throw fail("REVIEW_EVIDENCE_REQUIRED", "Final review must PASS before READY_FOR_INTEGRATION.");
    }
    next.auditHistory.push(reviewRecord);
    next.commitNotApplicableHistory.push(notApplicable);
    next.finalReviewHistory.push(finalReview);
    next.reviewHistory.push(finalReview);
  }

  if (nextState === "READY_FOR_INTEGRATION" && task.state === "COMMITTED") {
    const latestCommit = task.commitHistory.at(-1);
    const latestAudit = task.auditHistory.at(-1);
    if (!latestCommit || latestCommit.revision !== task.workRevision
        || !latestAudit || latestAudit.revision !== task.workRevision) {
      throw fail("COMMIT_EVIDENCE_REQUIRED", "COMMITTED -> READY requires current-revision audit and commit evidence.");
    }
    const finalReview = validateReview(context.finalReview, task, "FINAL");
    if (finalReview.outcome !== "PASS") {
      throw fail("REVIEW_EVIDENCE_REQUIRED", "Final review must PASS before READY_FOR_INTEGRATION.");
    }
    next.finalReviewHistory.push(finalReview);
    next.reviewHistory.push(finalReview);
  }

  if (nextState === "INTEGRATED") {
    const approval = validateApproval(context.integrationApproval, "Integration approval");
    if (!nonEmptyString(context.integrationRef)) {
      throw fail("INTEGRATION_EVIDENCE_REQUIRED", "INTEGRATED requires an integration reference.");
    }
    const currentFinalReview = next.finalReviewHistory.at(-1);
    const hasCommit = next.commitHistory.at(-1)?.revision === task.workRevision;
    const hasNoCommitRecord = next.commitNotApplicableHistory.at(-1)?.revision === task.workRevision;
    if (!currentFinalReview || currentFinalReview.revision !== task.workRevision
        || (!hasCommit && !hasNoCommitRecord)) {
      throw fail("INTEGRATION_EVIDENCE_REQUIRED", "Integration requires current-revision final review and commit/applicability evidence.");
    }
    next.integrationApproval = { ...approval, revision: task.workRevision };
    next.integrationRef = context.integrationRef;
  }

  if (nextState === "BLOCKED") {
    next.terminalHistory.push(validateTerminalEvidence(context.terminalEvidence, "BLOCKED"));
  }

  if (nextState === "REJECTED") {
    const rejectionEvidence = context.terminalEvidence
      || (reviewRecord && reviewRecord.outcome === "REJECT"
        ? { actorRef: reviewRecord.reviewerId, reason: reviewRecord.findings.join("; "), evidenceRef: reviewRecord.evidenceRef }
        : null);
    next.terminalHistory.push(validateTerminalEvidence(rejectionEvidence, "REJECTED"));
  }

  next.state = nextState;
  next.timestamps.updatedAt = nowIso();
  validateTask(next);
  return deepFreeze(next);
}

module.exports = {
  createTask,
  scopeApprovalStatus,
  transitionTask,
  validateTask
};
