import { gql, request } from "graphql-request";

const SUBGRAPH_URL = process.env.SUBGRAPH_URL!;

const CHARTER_QUERY = gql`
  query GetCharter($id: ID!) {
    charter(id: $id) {
      id
      active
      domain
      budgetHbar
      usedHbar
      expiresAt
      tier
      reputation
    }
  }
`;

export async function verifyCharterViaGraph(charterId: string, requiredHbar: number): Promise<boolean> {
  try {
    const data: any = await request(SUBGRAPH_URL, CHARTER_QUERY, { id: charterId });
    const charter = data.charter;

    if (!charter) return false;
    if (!charter.active) return false;
    if (Date.now() / 1000 > parseInt(charter.expiresAt)) return false;

    const remaining = parseInt(charter.budgetHbar) - parseInt(charter.usedHbar);
    if (remaining < requiredHbar * 1e8) return false;

    return true;
  } catch {
    return false;
  }
}
