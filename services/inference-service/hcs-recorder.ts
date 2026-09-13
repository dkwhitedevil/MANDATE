import { Client, TopicMessageSubmitTransaction } from "@hashgraph/sdk";

const client = Client.forTestnet();
client.setOperator(process.env.HEDERA_ACCOUNT_ID!, process.env.HEDERA_PRIVATE_KEY!);

interface ExecutionRecord {
  charterId: string;
  serviceAddress: string;
  amountHbar: number;
  txHash: string;
  prompt: string;
}

export async function recordExecutionOnHCS(record: ExecutionRecord): Promise<void> {
  const message = JSON.stringify({
    type: "CHARTER_EXECUTION",
    version: 1,
    timestamp: Date.now(),
    ...record
  });

  await new TopicMessageSubmitTransaction()
    .setTopicId(process.env.EXECUTION_TOPIC_ID!)
    .setMessage(message)
    .execute(client);

  console.log(`HCS execution logged for Charter ${record.charterId}`);
}
