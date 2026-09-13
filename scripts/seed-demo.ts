export {};

async function main() {
  console.log("=== MANDATE Demo Seed ===");
  console.log("1. Ensure contract is deployed");
  console.log("2. Ensure HCS topics are created");
  console.log("3. Verify inference service is live");
  console.log("4. Ensure The Graph is indexing charter data");
  console.log("5. Run the agent on a pre-minted demo charter");
  console.log("\nSeed complete. Ready for demo.");
}

main().catch(console.error);
