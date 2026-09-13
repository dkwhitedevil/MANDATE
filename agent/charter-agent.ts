import OpenAI from "openai";
import { gql, request } from "graphql-request";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface AgentConfig {
  charterId: string;
  agentWalletAddress: string;
  agentPrivateKey: string;
  task: string;
}

class CharterAgent {
  private charterId: string;
  private walletAddress: string;
  private privateKey: string;
  private subgraphUrl: string;

  constructor(config: AgentConfig) {
    this.charterId = config.charterId;
    this.walletAddress = config.agentWalletAddress;
    this.privateKey = config.agentPrivateKey;
    this.subgraphUrl = process.env.SUBGRAPH_URL!;
  }

  async checkCharterState(): Promise<{ valid: boolean; remainingHbar: number; reputation: number; domain: string }> {
    const query = gql`
      query GetCharter($id: ID!) {
        charter(id: $id) {
          active
          domain
          remainingHbar
          reputation
          expiresAt
        }
      }
    `;

    try {
      const data: any = await request(this.subgraphUrl, query, { id: this.charterId });
      const charter = data.charter;

      if (!charter || !charter.active) {
        return { valid: false, remainingHbar: 0, reputation: 0, domain: "" };
      }

      const expired = Date.now() / 1000 > parseInt(charter.expiresAt);
      return {
        valid: !expired,
        remainingHbar: parseInt(charter.remainingHbar) / 1e8,
        reputation: parseInt(charter.reputation),
        domain: charter.domain
      };
    } catch {
      return { valid: false, remainingHbar: 0, reputation: 0, domain: "" };
    }
  }

  async discoverServices(domain: string): Promise<Array<{ id: string; name: string; pricePerQueryHbar: number; reputation: number; endpoint: string }>> {
    const query = gql`
      query FindServices($domain: String!) {
        services(where: { domain: $domain, active: true }) {
          id
          name
          pricePerQueryHbar
          reputation
          endpoint
        }
      }
    `;

    try {
      const data: any = await request(this.subgraphUrl, query, { domain });
      return (data.services || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        pricePerQueryHbar: parseInt(s.pricePerQueryHbar) / 1e8,
        reputation: s.reputation,
        endpoint: s.endpoint || `${process.env.INFERENCE_SERVICE_URL}/v1/query`
      }));
    } catch {
      return [{
        id: "demo-service",
        name: "MANDATE Inference Service",
        pricePerQueryHbar: 0.002,
        reputation: 94,
        endpoint: `${process.env.INFERENCE_SERVICE_URL}/v1/query`
      }];
    }
  }

  async run(task: string): Promise<void> {
    const charterState = await this.checkCharterState();
    if (!charterState.valid) {
      throw new Error("Charter is invalid or expired");
    }

    const services = await this.discoverServices(charterState.domain);
    const affordable = services.filter((s) => s.pricePerQueryHbar <= charterState.remainingHbar);
    const chosen = affordable[0] || services[0];

    if (!chosen) {
      throw new Error("No available services for this charter");
    }

    const planningResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "user",
        content: `Generate a brief, high-value prompt for this task: "${task}". Return only the prompt.`
      }],
      max_tokens: 180
    });

    const generatedPrompt = planningResponse.choices[0].message.content || task;
    console.log(`[Agent] Selected service: ${chosen.name}`);
    console.log(`[Agent] Prompt: ${generatedPrompt}`);
    console.log(`[Agent] Charter remaining: ${charterState.remainingHbar} HBAR`);
    console.log(`[Agent] Service endpoint: ${chosen.endpoint}`);

    const response = await fetch(chosen.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Payment": Buffer.from(JSON.stringify({ demo: true, amount: chosen.pricePerQueryHbar })).toString("base64"),
        "X-Charter-Id": this.charterId
      },
      body: JSON.stringify({ prompt: generatedPrompt })
    });

    const result = await response.json();
    console.log(JSON.stringify({ status: response.status, result }, null, 2));
  }
}

async function main() {
  const agent = new CharterAgent({
    charterId: process.env.DEMO_CHARTER_ID || "1",
    agentWalletAddress: process.env.AGENT_WALLET_ADDRESS || "0xDemo",
    agentPrivateKey: process.env.AGENT_PRIVATE_KEY || "demo",
    task: "Research AI agent payment protocols"
  });

  await agent.run("Research AI agent payment protocols in 2026");
}

main().catch(console.error);
