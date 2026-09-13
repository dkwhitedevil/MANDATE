import "dotenv/config";
import hardhat from "hardhat";
import fs from "node:fs";
import path from "node:path";

const { ethers } = hardhat;

async function main() {
  console.log("========================================");
  console.log("MANDATE CONTRACT DEPLOYMENT");
  console.log("========================================");

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name}`);
  console.log(`Chain ID: ${network.chainId.toString()}`);

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(deployerAddress);

  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Balance: ${ethers.formatEther(balance)} HBAR`);

  if (balance === 0n) throw new Error("Deployer has zero balance.");

  console.log("\nDeploying CharterRegistry...");
  const CharterRegistry = await ethers.getContractFactory("CharterRegistry");
  const registry = await CharterRegistry.deploy();
  const address = await registry.getAddress();

  console.log(`Deployment transaction: ${registry.deploymentTransaction()?.hash}`);
  await registry.waitForDeployment();

  const abiDirectory = path.resolve(process.cwd(), "subgraph", "abis");
  fs.mkdirSync(abiDirectory, { recursive: true });
  const abiPath = path.join(abiDirectory, "CharterRegistry.json");
  const artifact = require(path.resolve(process.cwd(), "artifacts", "contracts", "CharterRegistry.sol", "CharterRegistry.json"));
  fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2), "utf8");

  console.log("\n========================================");
  console.log("CONTRACT DEPLOYED");
  console.log("========================================");
  console.log(`CharterRegistry: ${address}`);
  console.log(`ABI written to: ${abiPath}`);
  console.log("\nAdd this to .env:");
  console.log(`CONTRACT_ADDRESS=${address}`);
}

main().catch((error) => {
  console.error("\n❌ Deployment failed.");
  console.error(error);
  process.exit(1);
});
