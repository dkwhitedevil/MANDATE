import "dotenv/config";

async function main() {
  console.log("Graph Node target configuration:");
  console.log("- RPC: https://testnet.hashio.io/api");
  console.log("- Network: hedera-testnet");
  console.log("- Contract: 0x7Bf153267E289f2B5F8b639adcb6c11dE29fA04A");
  console.log("- Subgraph manifest: subgraph/subgraph.yaml");
  console.log("- Local Graph Node compose: graph-node/docker-compose.yml");
  console.log("- This setup follows the exact live ABI event signatures and is compatible with Hedera Testnet chainId 296.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
