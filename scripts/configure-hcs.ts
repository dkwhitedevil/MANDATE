import "dotenv/config";
import hardhat from "hardhat";

const { ethers } = hardhat;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env`);
  return value;
}

async function main() {
  const contractAddress = requireEnv("CONTRACT_ADDRESS");
  const lifecycleTopic = requireEnv("LIFECYCLE_TOPIC_ID");
  const executionTopic = requireEnv("EXECUTION_TOPIC_ID");

  console.log("Configuring HCS topics...");
  console.log(`Contract: ${contractAddress}`);
  console.log(`Lifecycle: ${lifecycleTopic}`);
  console.log(`Execution: ${executionTopic}`);

  const registry = await ethers.getContractAt("CharterRegistry", contractAddress);
  const lifecycleBytes = ethers.hexlify(ethers.toUtf8Bytes(lifecycleTopic));
  const executionBytes = ethers.hexlify(ethers.toUtf8Bytes(executionTopic));

  const tx = await registry.setHcsTopics(lifecycleBytes, executionBytes);
  console.log(`Transaction: ${tx.hash}`);
  await tx.wait();

  console.log("HCS topics configured successfully.");

  const storedLifecycle = await registry.hcsLifecycleTopic();
  const storedExecution = await registry.hcsExecutionTopic();

  console.log(`Stored lifecycle bytes: ${storedLifecycle}`);
  console.log(`Stored execution bytes: ${storedExecution}`);
  console.log("Decoded values:");
  console.log(ethers.toUtf8String(storedLifecycle));
  console.log(ethers.toUtf8String(storedExecution));
}

main().catch((error) => {
  console.error("\n❌ HCS configuration failed.");
  console.error(error);
  process.exit(1);
});
