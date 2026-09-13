import express from "express";
import { ethers } from "ethers";
import { verifyWorldIDProof } from "../verify-world-id.js";
import CharterRegistryABI from "../../subgraph/abis/CharterRegistry.json" with { type: "json" };

const router = express.Router();

const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
const signer = new ethers.Wallet(process.env.HEDERA_PRIVATE_KEY!, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS!, CharterRegistryABI, signer);

router.post("/mint", async (req, res) => {
  const { worldProof, domain, budgetHbar, durationDays, walletAddress } = req.body;

  if (!worldProof || !domain || !budgetHbar || !walletAddress) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const isSelfieCheck = worldProof.verification_level === "device";
  const maxBudget = isSelfieCheck ? 10 : 1000;
  if (budgetHbar > maxBudget) {
    return res.status(400).json({
      error: `Budget exceeds limit for ${isSelfieCheck ? "Selfie Check" : "Orb"} verification (max ${maxBudget} HBAR)`
    });
  }

  const verification = await verifyWorldIDProof(worldProof, walletAddress);
  if (!verification.valid) {
    return res.status(401).json({ error: "Invalid World ID proof" });
  }

  const nullifierBytes32 = ethers.zeroPadValue(ethers.toBeHex(verification.nullifierHash!), 32);
  const budgetTinybars = BigInt(Math.floor(budgetHbar * 1e8));
  const durationSeconds = durationDays * 24 * 60 * 60;

  try {
    const tx = await contract.mintCharter(
      nullifierBytes32,
      domain,
      budgetTinybars,
      durationSeconds,
      verification.tier!,
      ""
    );

    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log: any) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e: any) => e?.name === "CharterCreated");

    const charterId = event?.args?.charterId?.toString();

    return res.json({
      success: true,
      charterId,
      txHash: receipt.hash,
      tier: isSelfieCheck ? "selfie" : "orb",
      budgetHbar,
      domain,
      expiresAt: new Date(Date.now() + durationSeconds * 1000).toISOString()
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Unknown error" });
  }
});

export default router;
