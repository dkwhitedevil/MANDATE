# AgentKit Feedback — MANDATE

## Integration Flow
The agent integration path is conceptually clear: verify a human-backed identity, mint a charter, query the graph for live state, and then call a gated inference service. This is a strong pattern for agent payment authorization.

## Developer Portal Navigation
The overall flow is understandable but would be stronger with tighter guidance around environment variables, wallet setup, and network-specific configuration for Hedera testnet.

## Sandbox App
The sandbox flow is most useful when test users are preconfigured and the verification level is clearly chosen for the budget threshold. A dedicated self-check and orb-check user matrix would make onboarding simpler.

## Issues Found
- The distinction between app credentials, signal values, and wallet addresses was not always obvious.
- Network setup for Hedera testnet required extra linking steps that were easy to miss.
- The minted charter must be carefully validated against nullifier reuse rules for domain-specific budgets.

## What Was Missing
- More explicit examples of proof verification and expected signal payloads.
- A clearer explanation of how to map agent identity to human verification without overconstraining the wallet.
- More sample code for a real end-to-end flow from proof -> contract -> Graph -> service.
