import axios from "axios";

const BLOCKY402_URL = "https://api.blocky402.com";

export async function processX402Payment(
  paymentHeader: string,
  expectedAmountHbar: number
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    const payment = JSON.parse(Buffer.from(paymentHeader, "base64").toString());

    const response = await axios.post(
      `${BLOCKY402_URL}/verify`,
      {
        payment,
        expectedAmount: expectedAmountHbar,
        network: "hedera-testnet",
        recipient: process.env.SERVICE_WALLET_ADDRESS
      },
      {
        headers: { Authorization: `Bearer ${process.env.BLOCKY402_API_KEY}` }
      }
    );

    if (response.data.verified) {
      return { success: true, txHash: response.data.txHash };
    }

    return { success: false, error: response.data.error };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
