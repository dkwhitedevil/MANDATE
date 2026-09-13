import test from "node:test";
import assert from "node:assert/strict";

import {
  consumeWorldVerification,
  createWorldVerificationRecord,
  validateWorldConfig,
} from "./world-id";

test("validateWorldConfig requires app id and action", () => {
  const result = validateWorldConfig({ appId: "", action: "", env: "test" });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /WORLD_APP_ID|WORLD_ACTION_ID|wallet/i);
});

test("consumeWorldVerification prevents duplicate nullifier action pairs", () => {
  const record = createWorldVerificationRecord({
    nullifier: "nullifier-1",
    action: "charter-mint",
    walletAddress: "0xabc",
    appId: "app_test",
    env: "test",
  });

  const once = consumeWorldVerification(record);
  const twice = consumeWorldVerification(record);

  assert.equal(once.ok, true);
  assert.equal(twice.ok, false);
  assert.match(twice.error ?? "", /already used|nullifier/i);
});

test("consumeWorldVerification rejects mismatched wallet", () => {
  const record = createWorldVerificationRecord({
    nullifier: "nullifier-2",
    action: "charter-mint",
    walletAddress: "0xabc",
    appId: "app_test",
    env: "test",
  });

  const result = consumeWorldVerification({
    ...record,
    walletAddress: "0xdef",
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /wallet|signal/i);
});
