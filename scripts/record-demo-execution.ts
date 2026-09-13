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
  const charterId = process.env.DEMO_CHARTER_ID ?? requireEnv("DEMO_CHARTER_ID");
  const [deployer] = await ethers.getSigners();
  const registry = await ethers.getContractAt("CharterRegistry", contractAddress);

  const serviceAddress = deployer.address;
  const amountTinybars = process.env.DEMO_EXECUTION_AMOUNT_TINYBARS ? BigInt(process.env.DEMO_EXECUTION_AMOUNT_TINYBARS) : 10_000_000n;
  const paymentTxHash = ethers.keccak256(ethers.toUtf8Bytes(`demo-payment-${Date.now()}`));

  console.log(`Recording execution for Charter #${charterId}`);
  console.log(`Amount: ${amountTinybars} tinybars`);

  const tx = await registry.recordExecution(BigInt(charterId), serviceAddress, amountTinybars, paymentTxHash);
  console.log(`Transaction: ${tx.hash}`);
  await tx.wait();

  const remaining = await registry.getRemainingBudget(BigInt(charterId));
  console.log(`Remaining: ${remaining} tinybars`);
  console.log("\nExecution recorded successfully.");
}

main().catch((error) => {
  console.error("\n❌ Execution recording failed.");
  console.error(error);
  process.exit(1);
});
