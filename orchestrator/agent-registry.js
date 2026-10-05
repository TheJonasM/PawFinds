"use strict";

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

function stringArray(value, label) {
  if (!Array.isArray(value) || value.some((item) => !nonEmptyString(item))) {
    throw fail("INVALID_AGENT", `${label} must be an array of non-empty strings.`);
  }
  if (new Set(value).size !== value.length) {
    throw fail("INVALID_AGENT", `${label} must not contain duplicates.`);
  }
}

function freezeRecord(value) {
  for (const item of Object.values(value)) {
    if (item && typeof item === "object") freezeRecord(item);
  }
  return Object.freeze(value);
}

function normalizeAgent(agent) {
  if (!isPlainObject(agent)) throw fail("INVALID_AGENT", "Agent must be a plain object.");
  const allowedKeys = new Set([
    "id",
    "name",
    "role",
    "status",
    "declaredCapabilities",
    "verifiedCapabilities",
    "declaredPermissions",
    "availability",
    "declaredTools"
  ]);
  const unknown = Object.keys(agent).filter((key) => !allowedKeys.has(key));
  if (unknown.length) throw fail("INVALID_AGENT", `Unsupported agent fields: ${unknown.join(", ")}`);
  if (!nonEmptyString(agent.id) || !nonEmptyString(agent.name) || !nonEmptyString(agent.role)) {
    throw fail("INVALID_AGENT", "Agent id, name and role are required.");
  }

  const declaredCapabilities = agent.declaredCapabilities ?? [];
  const verifiedCapabilities = agent.verifiedCapabilities ?? [];
  const declaredTools = agent.declaredTools ?? [];
  stringArray(declaredCapabilities, "declaredCapabilities");
  stringArray(verifiedCapabilities, "verifiedCapabilities");
  stringArray(declaredTools, "declaredTools");
  if (verifiedCapabilities.length > 0) {
    throw fail("VERIFICATION_UNSUPPORTED", "O-001 has no adapters and cannot register verified capabilities.");
  }

  const permissionInput = agent.declaredPermissions ?? {};
  if (!isPlainObject(permissionInput)) {
    throw fail("INVALID_AGENT", "declaredPermissions must be a plain object.");
  }
  const permissionKeys = new Set(["allowedActions", "prohibitedActions"]);
  const unknownPermissionKeys = Object.keys(permissionInput).filter((key) => !permissionKeys.has(key));
  if (unknownPermissionKeys.length) {
    throw fail("INVALID_AGENT", `Unsupported declaredPermissions fields: ${unknownPermissionKeys.join(", ")}`);
  }
  const allowedActions = permissionInput.allowedActions ?? [];
  const prohibitedActions = permissionInput.prohibitedActions ?? [];
  stringArray(allowedActions, "declaredPermissions.allowedActions");
  stringArray(prohibitedActions, "declaredPermissions.prohibitedActions");

  if (agent.status !== undefined && agent.status !== "REGISTERED") {
    throw fail("INVALID_AGENT", "O-001 supports only the metadata status REGISTERED.");
  }
  if (agent.availability !== undefined && agent.availability !== "UNKNOWN") {
    throw fail("INVALID_AGENT", "Without adapters, availability must remain UNKNOWN.");
  }

  return freezeRecord({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: "REGISTERED",
    declaredCapabilities: [...declaredCapabilities],
    verifiedCapabilities: [],
    declaredPermissions: {
      allowedActions: [...allowedActions],
      prohibitedActions: [...prohibitedActions]
    },
    availability: "UNKNOWN",
    declaredTools: [...declaredTools]
  });
}

function assertRegistry(registry) {
  if (!(registry instanceof Map)) throw new TypeError("Agent registry must be a Map created by createAgentRegistry().");
}

function createAgentRegistry(initialAgents = []) {
  if (!Array.isArray(initialAgents)) throw new TypeError("initialAgents must be an array.");
  const registry = new Map();
  for (const agent of initialAgents) registerAgent(registry, agent);
  return registry;
}

function registerAgent(registry, agent) {
  assertRegistry(registry);
  const normalized = normalizeAgent(agent);
  if (registry.has(normalized.id)) {
    throw fail("DUPLICATE_AGENT", `Agent ${normalized.id} is already registered.`);
  }
  registry.set(normalized.id, normalized);
  return normalized;
}

function getAgent(registry, id) {
  assertRegistry(registry);
  if (!nonEmptyString(id)) throw new TypeError("Agent id must be a non-empty string.");
  return registry.get(id) || null;
}

function listAgents(registry) {
  assertRegistry(registry);
  return [...registry.values()];
}

function canPerform(registry, agentId, request) {
  const agent = getAgent(registry, agentId);
  if (!agent) throw fail("UNKNOWN_AGENT", `Agent ${agentId} is not registered.`);
  if (!isPlainObject(request)
      || !nonEmptyString(request.capability)
      || !nonEmptyString(request.action)) {
    throw new TypeError("canPerform request requires non-empty capability and action strings.");
  }

  const permission = agent.declaredPermissions.prohibitedActions.includes(request.action)
    ? "PROHIBITED"
    : agent.declaredPermissions.allowedActions.includes(request.action)
      ? "DECLARED_ALLOW"
      : "UNSPECIFIED";
  const capabilityDeclared = agent.declaredCapabilities.includes(request.capability);
  const capabilityVerified = agent.verifiedCapabilities.includes(request.capability);

  return Object.freeze({
    capability: Object.freeze({ declared: capabilityDeclared, verified: capabilityVerified }),
    permission: Object.freeze({ declared: permission }),
    availability: agent.availability,
    effectiveAuthorization: "NOT_PROVIDED"
  });
}

module.exports = {
  canPerform,
  createAgentRegistry,
  getAgent,
  listAgents,
  registerAgent
};
