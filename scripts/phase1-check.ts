import "dotenv/config";
import hardhat from "hardhat";

const { ethers } = hardhat;

function check(condition: boolean, message: string): void {
  if (!condition) throw new Error(`❌ ${message}`);
  console.log(`✅ ${message}`);
}

async function main() {
  console.log("\n========================================");
  console.log("MANDATE PHASE 1 HEALTH CHECK");
  console.log("========================================\n");

  check(Boolean(process.env.HEDERA_ACCOUNT_ID), "HEDERA_ACCOUNT_ID configured");
  check(Boolean(process.env.HEDERA_PRIVATE_KEY), "HEDERA_PRIVATE_KEY configured");
  check(Boolean(process.env.CONTRACT_ADDRESS), "CONTRACT_ADDRESS configured");
  check(Boolean(process.env.LIFECYCLE_TOPIC_ID), "LIFECYCLE_TOPIC_ID configured");
  check(Boolean(process.env.EXECUTION_TOPIC_ID), "EXECUTION_TOPIC_ID configured");

  const network = await ethers.provider.getNetwork();
  check(network.chainId === 296n, "Connected to Hedera Testnet chain 296");

  const address = process.env.CONTRACT_ADDRESS!;
  const registry = await ethers.getContractAt("CharterRegistry", address);
  const owner = await registry.owner();
  check(owner !== ethers.ZeroAddress, "CharterRegistry has an owner");

  const nextId = await registry.nextCharterId();
  check(nextId >= 1n, "Charter ID counter initialized");

  const lifecycle = await registry.hcsLifecycleTopic();
  check(lifecycle !== "0x", "Lifecycle HCS topic configured");

  const execution = await registry.hcsExecutionTopic();
  check(execution !== "0x", "Execution HCS topic configured");

  console.log("\n========================================");
  console.log("PHASE 1 HEALTH CHECK PASSED");
  console.log("========================================");
}

main().catch((error) => {
  console.error("\n❌ PHASE 1 HEALTH CHECK FAILED");
  console.error(error);
  process.exit(1);
});
