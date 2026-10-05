"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  canPerform,
  createAgentRegistry,
  getAgent,
  listAgents,
  registerAgent
} = require("../orchestrator/agent-registry");
const {
  createTask,
  scopeApprovalStatus,
  transitionTask,
  validateTask
} = require("../orchestrator/task-engine");
const { TASK_STATES } = require("../orchestrator/state-machine");

const WRITER = Object.freeze({ id: "codex", name: "Codex", role: "writer" });
const REVIEWER = Object.freeze({ id: "gemini", name: "Gemini", role: "reviewer" });
const OWNER = "PRODUCT_OWNER";
const COMMIT_SHA = "c67cd1f66739715cd9e9b019b459b554e7f7d20b";

function makeRegistry() {
  return createAgentRegistry([
    {
      ...WRITER,
      declaredCapabilities: ["implement", "inspect"],
      declaredPermissions: {
        allowedActions: ["write-authorized-files"],
        prohibitedActions: ["merge"]
      }
    },
    {
      ...REVIEWER,
      declaredCapabilities: ["inspect"],
      declaredPermissions: {
        allowedActions: ["read-diff"],
        prohibitedActions: ["write-authorized-files"]
      }
    },
    { id: "chatgpt", name: "ChatGPT", role: "architecture-reviewer" }
  ]);
}

function makeInput() {
  return {
    objective: "Implement the O-001 local coordination core",
    writerId: WRITER.id,
    reviewerId: REVIEWER.id,
    allowedFiles: [
      "orchestrator/task-engine.js",
      "orchestrator/state-machine.js",
      "orchestrator/agent-registry.js",
      "tests/orchestrator.test.js"
    ],
    forbiddenAreas: ["index.html", "firestore.rules", "Firebase", "Alerts"],
    sourcesOfTruth: ["docs/agents/PROTOCOL.md"],
    tests: ["node --test tests/orchestrator.test.js"],
    acceptanceCriteria: ["All protocol transitions are enforced"],
    approvalRequirements: { scope: OWNER, integration: OWNER },
    diffExpectation: { expectedFiles: ["orchestrator/"], expectedLines: 400 },
    branch: "codex/orchestrator-core-o001",
    baseCommit: COMMIT_SHA
  };
}

function isRegisteredAgent(id) {
  return [WRITER.id, REVIEWER.id, "chatgpt"].includes(id);
}

function makeTask(overrides = {}) {
  return createTask({ ...makeInput(), ...overrides }, { isRegisteredAgent });
}

function review(outcome, phase = "PROPOSAL", findings = []) {
  return {
    reviewerId: REVIEWER.id,
    phase,
    outcome,
    findings,
    evidenceRef: `review:${phase.toLowerCase()}:${outcome}`
  };
}

function approveScope(task) {
  const reviewing = transitionTask(task, "REVIEW");
  return transitionTask(reviewing, "APPROVED", {
    review: review("PASS"),
    scopeApproval: {
      approverRef: OWNER,
      evidenceRef: "human-approval:scope"
    }
  });
}

function toAudit(task) {
  return transitionTask(
    transitionTask(
      transitionTask(task, "REVIEW"),
      "APPROVED",
      {
        review: review("PASS"),
        scopeApproval: { approverRef: OWNER, evidenceRef: "human-approval:scope" }
      }
    ),
    "IMPLEMENTING"
  );
}

function auditPass() {
  return review("PASS", "AUDIT");
}

function finalPass() {
  return review("PASS", "FINAL");
}

function commitEvidence() {
  return {
    commitSha: COMMIT_SHA,
    branch: "codex/orchestrator-core-o001",
    evidenceRef: "git-show:commit"
  };
}

test("1. creates a valid PROPOSED task with immutable identity and timestamps", () => {
  const task = makeTask();
  assert.equal(task.state, "PROPOSED");
  assert.match(task.taskId, /^[0-9a-f-]{36}$/i);
  assert.ok(Number.isFinite(Date.parse(task.timestamps.createdAt)));
  assert.ok(Number.isFinite(Date.parse(task.timestamps.updatedAt)));
  assert.equal(validateTask(task, { isRegisteredAgent }), true);
});

test("1a. task identity is immutable", () => {
  const task = makeTask();
  assert.equal(Object.isFrozen(task), true);
  assert.throws(() => { task.taskId = "different-id"; }, TypeError);
  assert.notEqual(task.taskId, "different-id");
});

test("2. rejects invalid task fields and unsupported state injection", () => {
  assert.throws(() => makeTask({ objective: " " }), { code: "INVALID_TASK" });
  assert.throws(() => makeTask({ writerId: "unknown" }), { code: "UNKNOWN_AGENT" });
  assert.throws(() => makeTask({ state: "IMPLEMENTING" }), { code: "INVALID_TASK" });
});

test("3. allows PROPOSED to REVIEW", () => {
  assert.equal(transitionTask(makeTask(), "REVIEW").state, "REVIEW");
});

test("4. scope approval requires a proposal PASS and is distinct from integration approval", () => {
  const proposedForReview = transitionTask(makeTask(), "REVIEW");
  assert.throws(() => transitionTask(proposedForReview, "APPROVED"), {
    code: "REVIEW_EVIDENCE_REQUIRED"
  });
  const approved = approveScope(makeTask());
  assert.equal(approved.state, "APPROVED");
  assert.equal(approved.scopeApproval.approverRef, OWNER);
  assert.equal(approved.integrationApproval, null);
  assert.equal(approved.integrationRef, null);
});

test("5. REQUEST_CHANGES before approval returns REVIEW to PROPOSED and records findings", () => {
  const task = transitionTask(makeTask(), "REVIEW");
  const revised = transitionTask(task, "PROPOSED", {
    review: review("REQUEST_CHANGES", "PROPOSAL", ["Narrow the objective"]),
    proposalUpdates: { objective: "Implement the reviewed O-001 scope" }
  });
  assert.equal(revised.state, "PROPOSED");
  assert.equal(revised.objective, "Implement the reviewed O-001 scope");
  assert.equal(revised.reviewHistory.at(-1).outcome, "REQUEST_CHANGES");
  assert.equal(revised.scopeApproval, null);
  assert.equal(revised.workRevision, 1);
  assert.ok(!TASK_STATES.includes("REQUEST_CHANGES"));
});

test("6. APPROVED to IMPLEMENTING requires the scope approval record", () => {
  const approved = approveScope(makeTask());
  assert.equal(transitionTask(approved, "IMPLEMENTING").state, "IMPLEMENTING");
});

test("7. IMPLEMENTING to TESTING is allowed", () => {
  const implementing = toAudit(makeTask());
  assert.equal(transitionTask(implementing, "TESTING").state, "TESTING");
});

test("8. TESTING to AUDIT is allowed", () => {
  const testing = transitionTask(toAudit(makeTask()), "TESTING");
  assert.equal(transitionTask(testing, "AUDIT").state, "AUDIT");
});

test("9. AUDIT to COMMITTED requires PASS, full commit SHA, branch and evidence", () => {
  const task = toAudit(makeTask());
  const testing = transitionTask(task, "TESTING");
  const audit = transitionTask(testing, "AUDIT");
  assert.throws(() => transitionTask(audit, "COMMITTED"), {
    code: "AUDIT_EVIDENCE_REQUIRED"
  });
  const committed = transitionTask(audit, "COMMITTED", {
    review: auditPass(),
    commitEvidence: commitEvidence()
  });
  assert.equal(committed.state, "COMMITTED");
  assert.equal(committed.commitHistory.at(-1).commitSha, COMMIT_SHA);
});

test("10. AUDIT to READY without a commit requires a reason and evidence", () => {
  const audit = transitionTask(transitionTask(toAudit(makeTask()), "TESTING"), "AUDIT");
  assert.throws(() => transitionTask(audit, "READY_FOR_INTEGRATION", {
    review: auditPass(),
    finalReview: finalPass()
  }), { code: "COMMIT_EVIDENCE_REQUIRED" });
  const ready = transitionTask(audit, "READY_FOR_INTEGRATION", {
    review: auditPass(),
    finalReview: finalPass(),
    commitNotApplicable: {
      reason: "The task produces no commit artifact",
      evidenceRef: "task-record:no-commit"
    }
  });
  assert.equal(ready.state, "READY_FOR_INTEGRATION");
});

test("11. READY_FOR_INTEGRATION to INTEGRATED needs separate human approval and integration reference", () => {
  const audit = transitionTask(transitionTask(toAudit(makeTask()), "TESTING"), "AUDIT");
  const ready = transitionTask(audit, "READY_FOR_INTEGRATION", {
    review: auditPass(),
    finalReview: finalPass(),
    commitNotApplicable: { reason: "No commit applies", evidenceRef: "record:no-commit" }
  });
  assert.throws(() => transitionTask(ready, "INTEGRATED"), {
    code: "APPROVAL_EVIDENCE_REQUIRED"
  });
  const integrated = transitionTask(ready, "INTEGRATED", {
    integrationApproval: { approverRef: OWNER, evidenceRef: "human-approval:integration" },
    integrationRef: "integration:confirmed-reference"
  });
  assert.equal(integrated.state, "INTEGRATED");
  assert.equal(integrated.scopeApproval.evidenceRef, "human-approval:scope");
  assert.equal(integrated.integrationApproval.evidenceRef, "human-approval:integration");
});

test("12. INTEGRATED is terminal", () => {
  const audit = transitionTask(transitionTask(toAudit(makeTask()), "TESTING"), "AUDIT");
  const ready = transitionTask(audit, "READY_FOR_INTEGRATION", {
    review: auditPass(), finalReview: finalPass(),
    commitNotApplicable: { reason: "No commit applies", evidenceRef: "record:no-commit" }
  });
  const integrated = transitionTask(ready, "INTEGRATED", {
    integrationApproval: { approverRef: OWNER, evidenceRef: "human-approval:integration" },
    integrationRef: "integration:confirmed-reference"
  });
  assert.throws(() => transitionTask(integrated, "BLOCKED", {
    terminalEvidence: { reason: "Not allowed" }
  }), { code: "INVALID_TRANSITION" });
});

test("13. BLOCKED requires a reason and has no recovery", () => {
  const task = makeTask();
  assert.throws(() => transitionTask(task, "BLOCKED"), { code: "TERMINAL_EVIDENCE_REQUIRED" });
  const blocked = transitionTask(task, "BLOCKED", {
    terminalEvidence: { reason: "Repository access is missing" }
  });
  assert.throws(() => transitionTask(blocked, "PROPOSED"), { code: "INVALID_TRANSITION" });
});

test("14. REJECTED records a reason and has no recovery", () => {
  const task = transitionTask(makeTask(), "REVIEW");
  const rejected = transitionTask(task, "REJECTED", {
    review: review("REJECT", "PROPOSAL", ["The proposal conflicts with the protocol"])
  });
  assert.equal(rejected.state, "REJECTED");
  assert.throws(() => transitionTask(rejected, "PROPOSED"), { code: "INVALID_TRANSITION" });
});

test("15. REQUEST_CHANGES after approval returns to IMPLEMENTING and records the reviewer", () => {
  const audit = transitionTask(transitionTask(toAudit(makeTask()), "TESTING"), "AUDIT");
  const revised = transitionTask(audit, "IMPLEMENTING", {
    review: review("REQUEST_CHANGES", "AUDIT", ["Fix the transition evidence"])
  });
  assert.equal(revised.state, "IMPLEMENTING");
  assert.equal(revised.reviewHistory.at(-1).reviewerId, REVIEWER.id);
  assert.equal(revised.reviewHistory.at(-1).outcome, "REQUEST_CHANGES");
});

test("16. post-approval REQUEST_CHANGES preserves writerId and advances work revision", () => {
  const task = toAudit(makeTask());
  const revised = transitionTask(task, "IMPLEMENTING", {
    review: review("REQUEST_CHANGES", "AUDIT", ["Revise the work"])
  });
  assert.equal(revised.writerId, task.writerId);
  assert.equal(revised.workRevision, task.workRevision + 1);
  assert.equal(task.state, "IMPLEMENTING");
});

test("17. writer/reviewer must be distinct and registered through the narrow resolver", () => {
  assert.throws(() => makeTask({ reviewerId: WRITER.id }), { code: "INVALID_TASK" });
  assert.throws(() => createTask(makeInput(), { isRegisteredAgent: () => false }), {
    code: "UNKNOWN_AGENT"
  });
  assert.equal(makeTask().writerId, WRITER.id);
});

test("18. Agent Registry keeps declared capability, verification, permission and availability separate", () => {
  const agent = getAgent(makeRegistry(), WRITER.id);
  assert.deepEqual(agent.declaredCapabilities, ["implement", "inspect"]);
  assert.deepEqual(agent.verifiedCapabilities, []);
  assert.deepEqual(agent.declaredPermissions.allowedActions, ["write-authorized-files"]);
  assert.equal(agent.availability, "UNKNOWN");
  assert.equal(agent.status, "REGISTERED");
  assert.throws(() => registerAgent(makeRegistry(), {
    ...WRITER,
    verifiedCapabilities: ["implement"]
  }), { code: "VERIFICATION_UNSUPPORTED" });
});

test("19. unverified capability is not reported available", () => {
  const registry = makeRegistry();
  const diagnostic = canPerform(registry, WRITER.id, {
    capability: "implement",
    action: "write-authorized-files"
  });
  assert.deepEqual(diagnostic.capability, { declared: true, verified: false });
  assert.equal(diagnostic.availability, "UNKNOWN");
  assert.equal(diagnostic.effectiveAuthorization, "NOT_PROVIDED");
});

test("20. canPerform is diagnostic only and declared prohibitions take precedence", () => {
  const registry = makeRegistry();
  const diagnostic = canPerform(registry, WRITER.id, {
    capability: "implement",
    action: "merge"
  });
  assert.deepEqual(diagnostic.permission, { declared: "PROHIBITED" });
  assert.equal(Object.hasOwn(diagnostic, "authorized"), false);
  assert.equal(Object.hasOwn(diagnostic, "allowed"), false);
});

test("21. Agent Registry rejects duplicate IDs and returns registered agents", () => {
  const registry = makeRegistry();
  assert.throws(() => registerAgent(registry, WRITER), { code: "DUPLICATE_AGENT" });
  assert.equal(getAgent(registry, "missing"), null);
  assert.equal(listAgents(registry).length, 3);
});

test("22. scopeApproval stores a snapshot and reports mismatch without changing task state", () => {
  const approved = approveScope(makeTask());
  assert.equal(scopeApprovalStatus(approved), "MATCH");
  const altered = {
    ...approved,
    objective: "Externally altered without a transition",
    timestamps: { ...approved.timestamps }
  };
  assert.equal(scopeApprovalStatus(altered), "MISMATCH");
  assert.equal(altered.state, "APPROVED");

  assert.equal(scopeApprovalStatus({ ...approved, branch: "master" }), "MISMATCH");
  assert.equal(scopeApprovalStatus({ ...approved, writerId: "another-writer" }), "MISMATCH");
});

test("23. commit evidence must match the task branch and carry a full SHA", () => {
  const audit = transitionTask(transitionTask(toAudit(makeTask()), "TESTING"), "AUDIT");
  assert.throws(() => transitionTask(audit, "COMMITTED", {
    review: auditPass(),
    commitEvidence: { ...commitEvidence(), commitSha: "abc" }
  }), { code: "COMMIT_EVIDENCE_REQUIRED" });
  assert.throws(() => transitionTask(audit, "COMMITTED", {
    review: auditPass(),
    commitEvidence: { ...commitEvidence(), branch: "master" }
  }), { code: "COMMIT_EVIDENCE_REQUIRED" });
});

test("24. audit and final review outcomes must PASS before integration readiness", () => {
  const audit = transitionTask(transitionTask(toAudit(makeTask()), "TESTING"), "AUDIT");
  assert.throws(() => transitionTask(audit, "COMMITTED", {
    review: review("REQUEST_CHANGES", "AUDIT", ["Outstanding issue"]),
    commitEvidence: commitEvidence()
  }), { code: "INVALID_TRANSITION" });
  assert.throws(() => transitionTask(audit, "READY_FOR_INTEGRATION", {
    review: auditPass(),
    finalReview: review("REQUEST_CHANGES", "FINAL", ["Final issue"]),
    commitNotApplicable: { reason: "No commit", evidenceRef: "record:no-commit" }
  }), { code: "REVIEW_EVIDENCE_REQUIRED" });
});

test("25. scope mismatch is diagnostic and does not auto-reopen, block or rewrite a task", () => {
  const approved = approveScope(makeTask());
  const altered = { ...approved, acceptanceCriteria: ["Different scope"] };
  assert.equal(scopeApprovalStatus(altered), "MISMATCH");
  assert.equal(altered.state, "APPROVED");
  assert.equal(altered.workRevision, approved.workRevision);
  assert.equal(altered.scopeApproval.evidenceRef, approved.scopeApproval.evidenceRef);
});

test("26. committed workflow requires final review before readiness and can then integrate", () => {
  const audit = transitionTask(transitionTask(toAudit(makeTask()), "TESTING"), "AUDIT");
  const committed = transitionTask(audit, "COMMITTED", {
    review: auditPass(),
    commitEvidence: commitEvidence()
  });
  const ready = transitionTask(committed, "READY_FOR_INTEGRATION", {
    finalReview: finalPass()
  });
  assert.equal(ready.state, "READY_FOR_INTEGRATION");
  const integrated = transitionTask(ready, "INTEGRATED", {
    integrationApproval: { approverRef: OWNER, evidenceRef: "human-approval:integration" },
    integrationRef: "integration:merged-commit-reference"
  });
  assert.equal(integrated.state, "INTEGRATED");
});
