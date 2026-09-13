import "dotenv/config";
import "dotenv/config";
import { Client, PrivateKey, TopicCreateTransaction } from "@hashgraph/sdk";

export {};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function createTopic(client: Client, memo: string): Promise<string> {
  const tx = await new TopicCreateTransaction().setTopicMemo(memo).execute(client);
  const receipt = await tx.getReceipt(client);
  const topicId = receipt.topicId?.toString();
  if (!topicId) throw new Error(`Topic creation failed for "${memo}"`);
  return topicId;
}

async function main() {
  const accountId = requireEnv("HEDERA_ACCOUNT_ID");
  const privateKeyString = requireEnv("HEDERA_PRIVATE_KEY");

  const privateKey = PrivateKey.fromStringECDSA(privateKeyString);
  const client = Client.forTestnet();
  client.setOperator(accountId, privateKey);

  try {
    const lifecycleTopicId = await createTopic(client, "MANDATE | Charter Lifecycle | v1");
    const executionTopicId = await createTopic(client, "MANDATE | Charter Execution | v1");

    console.log("\n========================================");
    console.log("SUCCESS");
    console.log("========================================");
    console.log(`LIFECYCLE_TOPIC_ID=${lifecycleTopicId}`);
    console.log(`EXECUTION_TOPIC_ID=${executionTopicId}`);
  } finally {
    client.close();
  }
}

main().catch((error) => {
  console.error("\n❌ HCS topic creation failed.");
  console.error(error);
  process.exit(1);
});
