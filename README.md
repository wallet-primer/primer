# Primer

> Your unified DeFi lens on Stellar — one address in, everything out.

Primer is an open-source DeFi position aggregator and analytics layer built on the [Stellar](https://stellar.org) network and [Soroban](https://stellar.org/soroban) smart contract platform. It gives users and developers a single, normalized view of their entire on-chain exposure across every major Stellar DeFi protocol — deposits, borrows, LP positions, yield, and liquidation health — in one place.

---

## Why Primer?

The Stellar DeFi ecosystem is growing rapidly. Protocols like Blend, Aquarius, Soroswap, and FxDAO each have their own data formats, account models, and position semantics. As a user, tracking your exposure across all of them means visiting multiple interfaces, doing mental math, and still not seeing the full picture.

Primer fixes that.

---

## What Primer Does

- **Position Aggregation** — Accept any Stellar G-address or C-address (smart wallet) and return a unified portfolio view across all supported Soroban protocols
- **Health Monitoring** — Real-time collateral ratio tracking with alerts when ratios approach liquidation thresholds
- **Yield Tracking** — Accrued yield, historical APY, and projected earnings across lending and LP positions
- **Developer API** — A clean REST + webhook API so wallets, bots, and apps can embed Primer data without reinventing the wheel

---

## Supported Protocols

| Protocol | Type | Status |
|----------|------|--------|
| Blend | Lending / Borrowing | ✅ Supported |
| Aquarius | AMM / Liquidity | ✅ Supported |
| Soroswap | DEX / LP | ✅ Supported |
| FxDAO | CDP / Stablecoin | 🔧 In progress |
| Mystic | RWA Money Market | 🗓 Planned |
| BOND Hive | Yield / Fixed Income | 🗓 Planned |

---

## Repository Structure

```
primer/
├── packages/
│   ├── core/           # Protocol adapters and normalization logic
│   ├── api/            # REST API server (Hono + Bun)
│   ├── sdk/            # TypeScript SDK for integrators
│   └── dashboard/      # Web dashboard (Next.js)
├── contracts/          # Soroban smart contracts (Rust)
├── docs/               # Documentation and guides
├── scripts/            # Development and deployment scripts
└── infra/              # Infrastructure configuration
```

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- [Rust](https://rustup.rs) (for contract development)
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli)
- A Stellar RPC endpoint (Futurenet or Mainnet)

### Install

```bash
git clone https://github.com/primer-finance/primer
cd primer
bun install
```

### Configure

```bash
cp .env.example .env
# Edit .env with your RPC endpoint and API keys
```

### Run locally

```bash
# Start the API server
bun run dev:api

# Start the dashboard
bun run dev:dashboard

# Run all tests
bun run test
```

---

## API Reference

### Get portfolio for an address

```http
GET /v1/portfolio/:address
```

**Response**

```json
{
  "address": "GABC...XYZ",
  "totalValueUsd": 12450.82,
  "protocols": [
    {
      "name": "Blend",
      "type": "lending",
      "deposits": [{ "asset": "USDC", "amount": "5000", "apy": "4.2%" }],
      "borrows": [{ "asset": "XLM", "amount": "10000", "rate": "2.1%" }],
      "healthFactor": 1.84
    }
  ],
  "totalYieldAccrued": 183.40,
  "liquidationRisk": "low"
}
```

Full API documentation is available at [docs.primer.finance](https://docs.primer.finance).

---

## Grants & Funding

Primer is funded in part through the [Stellar Community Fund (SCF)](https://communityfund.stellar.org) and the Stellar Development Foundation's ecosystem programs. We are committed to keeping the core aggregation layer open-source and freely accessible to all developers building on Stellar.

---

## Contributing

We welcome contributions of all kinds — protocol adapters, bug fixes, documentation, and ideas. See [CONTRIBUTING.md](./CONTRIBUTING.md) to get started.

---

## Architecture

For a deep dive into how Primer works under the hood, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## License

[MIT](./LICENSE) — free to use, modify, and distribute.

---

## Community

- [Discord](https://discord.gg/primer)
- [Twitter / X](https://twitter.com/primer_finance)
- [Stellar Dev Discord](https://discord.gg/stellar)