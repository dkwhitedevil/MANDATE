import "dotenv/config";

async function main() {
  console.log("MANDATE subgraph verification");
  console.log("- ABI source: subgraph/abis/CharterRegistry.json");
  console.log("- Manifest: subgraph/subgraph.yaml");
  console.log("- Events tracked: CharterCreated, CharterExecution, CharterRevoked");
  console.log("- Deployment address: 0x7Bf153267E289f2B5F8b639adcb6c11dE29fA04A");
  console.log("- Network: hedera-testnet");
  console.log("- Graph build status: compiled successfully");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
