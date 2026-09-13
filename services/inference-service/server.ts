import express from "express";
import OpenAI from "openai";
import { processX402Payment } from "./x402-middleware.js";
import { verifyCharterViaGraph } from "./verify-charter.js";
import { recordExecutionOnHCS } from "./hcs-recorder.js";

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PRICE_PER_QUERY_HBAR = 0.002;

app.post("/v1/query", async (req, res) => {
  const paymentHeader = req.headers["x-payment"];
  const charterId = req.headers["x-charter-id"];

  if (!paymentHeader) {
    return res.status(402).json({
      x402Version: 1,
      error: "Payment required",
      accepts: [{
        scheme: "exact",
        network: "hedera-testnet",
        maxAmountRequired: String(PRICE_PER_QUERY_HBAR),
        resource: `${process.env.SERVICE_WALLET_ADDRESS}`,
        description: "MANDATE charter-verified AI inference query",
        mimeType: "application/json",
        payTo: process.env.SERVICE_WALLET_ADDRESS,
        maxTimeoutSeconds: 60,
        asset: "HBAR",
        extra: {
          requiresCharter: true,
          charterDomain: "inference",
          charterQueryUrl: process.env.SUBGRAPH_URL
        }
      }]
    });
  }

  const paymentValid = await processX402Payment(paymentHeader as string, PRICE_PER_QUERY_HBAR);
  if (!paymentValid.success) {
    return res.status(402).json({ error: "Payment verification failed", detail: paymentValid.error });
  }

  if (charterId) {
    const charterValid = await verifyCharterViaGraph(charterId as string, PRICE_PER_QUERY_HBAR);
    if (!charterValid) {
      return res.status(403).json({ error: "Charter invalid or budget exceeded" });
    }
  }

  const { prompt, model = "gpt-4o-mini" } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500
    });

    const result = completion.choices[0].message.content;

    if (charterId) {
      await recordExecutionOnHCS({
        charterId: charterId as string,
        serviceAddress: process.env.SERVICE_WALLET_ADDRESS!,
        amountHbar: PRICE_PER_QUERY_HBAR,
        txHash: paymentValid.txHash || "0x0",
        prompt: prompt.substring(0, 100)
      });
    }

    return res.json({
      result,
      charterVerified: !!charterId,
      paymentTxHash: paymentValid.txHash,
      costHbar: PRICE_PER_QUERY_HBAR
    });
  } catch (error) {
    console.error("Inference error:", error);
    return res.status(500).json({ error: "Inference failed" });
  }
});

app.listen(3001, () => console.log("MANDATE inference service running on :3001"));
