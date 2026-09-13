import "dotenv/config";
import hardhat from "hardhat";

const { ethers } = hardhat;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

async function main() {
  const contractAddress = requireEnv("CONTRACT_ADDRESS");
  const [deployer] = await ethers.getSigners();
  const registry = await ethers.getContractAt("CharterRegistry", contractAddress);

  const worldNullifier =
    process.env.WORLD_NULLIFIER ??
    ethers.keccak256(ethers.toUtf8Bytes(`MANDATE-DEMO-${Date.now()}-${Math.random().toString(16).slice(2)}`));
  const domain = process.env.DEMO_DOMAIN ?? "inference";
  const budgetTinybars = process.env.DEMO_BUDGET_TINYBARS ? BigInt(process.env.DEMO_BUDGET_TINYBARS) : 500_000_000n;
  const durationSeconds = process.env.DEMO_DURATION_SECONDS ? Number(process.env.DEMO_DURATION_SECONDS) : 7 * 24 * 60 * 60;
  const tier = process.env.DEMO_TIER ? Number(process.env.DEMO_TIER) : 1;
  const metadataUri = process.env.DEMO_METADATA_URI ?? "https://example.com/mandate/demo-charter.json";

  console.log("Creating demo Charter...");
  console.log(`Owner: ${deployer.address}`);
  console.log(`Domain: ${domain}`);
  console.log(`Budget: ${budgetTinybars.toString()} tinybars`);

  const tx = await registry.mintCharter(
    deployer.address,
    worldNullifier,
    domain,
    budgetTinybars,
    durationSeconds,
    tier,
    metadataUri
  );

  console.log(`Transaction: ${tx.hash}`);
  const receipt = await tx.wait();

  if (!receipt) throw new Error("Transaction receipt unavailable.");

  let charterId: bigint | undefined;
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });

      if (parsed?.name === "CharterCreated") {
        charterId = parsed.args.charterId;
        break;
      }
    } catch {
      // ignore unrelated logs
    }
  }

  if (charterId === undefined) throw new Error("CharterCreated event not found.");

  console.log("\n========================================");
  console.log("DEMO CHARTER CREATED");
  console.log("========================================");
  console.log(`Charter ID: ${charterId.toString()}`);
  console.log(`Transaction: ${tx.hash}`);
  console.log("\nAdd to .env:");
  console.log(`DEMO_CHARTER_ID=${charterId.toString()}`);
}

main().catch((error) => {
  console.error("\n❌ Demo Charter creation failed.");
  console.error(error);
  process.exit(1);
});
