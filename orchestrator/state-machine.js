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

const ACTIVE_STATES = new Set([
  "PROPOSED",
  "REVIEW",
  "APPROVED",
  "IMPLEMENTING",
  "TESTING",
  "AUDIT",
  "COMMITTED",
  "READY_FOR_INTEGRATION"
]);

const POST_APPROVAL_REVIEW_STATES = new Set([
  "APPROVED",
  "IMPLEMENTING",
  "TESTING",
  "AUDIT",
  "COMMITTED",
  "READY_FOR_INTEGRATION"
]);

const NORMAL_TRANSITIONS = new Set([
  "PROPOSED:REVIEW",
  "REVIEW:APPROVED",
  "APPROVED:IMPLEMENTING",
  "IMPLEMENTING:TESTING",
  "TESTING:AUDIT",
  "AUDIT:COMMITTED",
  "AUDIT:READY_FOR_INTEGRATION",
  "COMMITTED:READY_FOR_INTEGRATION",
  "READY_FOR_INTEGRATION:INTEGRATED"
]);

function transitionError(message, code = "INVALID_TRANSITION") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function classifyTransition(task, nextState, context = {}) {
  if (!task || !TASK_STATES.includes(task.state)) {
    throw transitionError("Current task state is invalid.");
  }

  if (!TASK_STATES.includes(nextState)) {
    throw transitionError(`Unknown task state: ${nextState}`);
  }

  const from = task.state;
  const to = nextState;
  const reviewOutcome = context.reviewOutcome;
  const isScopeApproved = Boolean(task.scopeApproval);

  if (from === "INTEGRATED" || from === "BLOCKED" || from === "REJECTED") {
    throw transitionError(`${from} is terminal in O-001.`);
  }

  if (to === "BLOCKED" || to === "REJECTED") {
    if (!ACTIVE_STATES.has(from)) {
      throw transitionError(`${from} is not an active state.`);
    }
    if (to === "REJECTED" && reviewOutcome !== "REJECT") {
      throw transitionError("REJECTED requires a formal REJECT review outcome.");
    }
    return to;
  }

  if (from === "REVIEW" && to === "PROPOSED") {
    if (reviewOutcome !== "REQUEST_CHANGES" || isScopeApproved) {
      throw transitionError(
        "REVIEW returns to PROPOSED only for pre-approval REQUEST_CHANGES."
      );
    }
    return "PROPOSAL_CHANGES";
  }

  if (to === "IMPLEMENTING" && POST_APPROVAL_REVIEW_STATES.has(from)
      && reviewOutcome === "REQUEST_CHANGES" && isScopeApproved) {
    return "POST_APPROVAL_CHANGES";
  }

  if (!NORMAL_TRANSITIONS.has(`${from}:${to}`)) {
    throw transitionError(`Transition ${from} -> ${to} is not defined.`);
  }

  return `${from}:${to}`;
}

module.exports = {
  ACTIVE_STATES: Object.freeze([...ACTIVE_STATES]),
  TASK_STATES,
  classifyTransition
};
