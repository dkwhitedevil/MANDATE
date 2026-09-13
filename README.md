# MANDATE

A full-stack protocol scaffold for a human-backed AI agent chartering flow built around Hedera, The Graph, World ID, and x402-gated inference.

This repository follows the MANDATE name and preserves the protocol concepts from the Charter plan, but is organized as a practical implementation scaffold for the project.

## Project structure

```text
MANDATE/
├── contracts/
│   ├── CharterRegistry.sol
│   └── README.md
├── subgraph/
│   ├── schema.graphql
│   ├── subgraph.yaml
│   ├── abis/
│   │   └── CharterRegistry.json
│   └── src/
│       └── charter-registry.ts
├── services/
│   └── inference-service/
│       ├── server.ts
│       ├── x402-middleware.ts
│       ├── verify-charter.ts
│       └── hcs-recorder.ts
├── backend/
│   ├── verify-world-id.ts
│   └── routes/
│       └── charter.ts
├── agent/
│   └── charter-agent.ts
├── frontend/
│   └── app/
│       ├── page.tsx
│       └── agent/
│           └── page.tsx
├── scripts/
│   ├── deploy-contracts.ts
│   ├── register-hcs-topics.ts
│   ├── seed-demo.ts
│   └── register-service.ts
├── .env.example
├── package.json
├── tsconfig.json
├── hardhat.config.js
└── FEEDBACK-AGENTKIT.md
```

## Overview

MANDATE is an end-to-end protocol prototype for:
- human-backed AI agent identity via World ID
- dynamic spending budgets via Hedera smart contracts
- global charter state via The Graph
- payment verification via x402
- tamper-resistant execution logging via HCS

## Setup

```bash
npm install
cp .env.example .env
```

Then configure the required environment values before running the app.

## Smart contract deployment

```bash
npx hardhat compile
npx hardhat run scripts/deploy-contracts.ts --network hederaTestnet
```

## Subgraph

```bash
cd subgraph
graph auth --studio $SUBGRAPH_DEPLOY_KEY
graph codegen
graph build
graph deploy --studio charter-protocol
```

## Inference service

```bash
npm run dev:service
```

## Frontend dashboard

```bash
npm run dev:web
```

## Agent demo

```bash
npm run demo:agent
```

## Notes

This repository is intentionally scaffolded and ready for extension. The implementation is targeted at a hackathon workflow, with real environmental configuration required for deployment to live Hedera/Testnet systems.
