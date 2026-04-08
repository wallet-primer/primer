# Architecture

This document describes how Primer is structured, how data flows through the system, and the reasoning behind key design decisions.

---

## Table of Contents

- [High-Level Overview](#high-level-overview)
- [Package Structure](#package-structure)
- [Data Flow](#data-flow)
- [Core Package](#core-package)
- [API Package](#api-package)
- [SDK Package](#sdk-package)
- [Dashboard Package](#dashboard-package)
- [Soroban Contracts](#soroban-contracts)
- [Caching Strategy](#caching-strategy)
- [Data Normalization](#data-normalization)
- [Error Handling](#error-handling)
- [Security Considerations](#security-considerations)
- [Deployment](#deployment)
- [Design Decisions](#design-decisions)

---

## High-Level Overview

```
                        ┌─────────────────────────────────┐
                        │          Stellar Network          │
                        │  (Soroban RPC / Horizon API)     │
                        └───────────────┬─────────────────┘
                                        │
                        ┌───────────────▼─────────────────┐
                        │         packages/core            │
                        │  Protocol Adapters + Normalizer  │
                        └──────┬────────────────┬─────────┘
                               │                │
               ┌───────────────▼───┐    ┌───────▼──────────────┐
               │   packages/api    │    │    packages/sdk       │
               │  REST + Webhooks  │    │   TypeScript SDK      │
               └───────────────────┘    └──────────────────────┘
                        │
          ┌─────────────▼──────────────┐
          │      packages/dashboard    │
          │        Next.js UI          │
          └────────────────────────────┘
```

Primer is a read-only aggregation layer. It never holds user funds, never requires wallet connection for read queries, and never writes to the chain on behalf of users. All data originates from public on-chain state.

---

## Package Structure

```
primer/
├── packages/
│   ├── core/               # Protocol adapters, normalizer, shared types
│   │   ├── src/
│   │   │   ├── adapters/   # One file per protocol
│   │   │   ├── normalizer/ # Transforms raw data into Position schema
│   │   │   ├── types/      # Shared TypeScript types and schemas (Zod)
│   │   │   ├── rpc/        # Soroban RPC client wrapper
│   │   │   └── utils/      # Asset price feeds, math helpers
│   │   └── package.json
│   │
│   ├── api/                # HTTP API server
│   │   ├── src/
│   │   │   ├── routes/     # Route handlers
│   │   │   ├── middleware/  # Auth, rate limiting, caching
│   │   │   ├── webhooks/   # Liquidation alert webhooks
│   │   │   └── server.ts
│   │   └── package.json
│   │
│   ├── sdk/                # Published TypeScript SDK
│   │   ├── src/
│   │   │   ├── client.ts   # PrimerClient class
│   │   │   └── types.ts    # Re-exported from core
│   │   └── package.json
│   │
│   └── dashboard/          # Web UI
│       ├── app/            # Next.js App Router pages
│       ├── components/     # React components
│       └── package.json
│
├── contracts/              # Soroban smart contracts (Rust)
│   └── health-monitor/     # On-chain liquidation watcher
│
├── docs/                   # Extended documentation
├── scripts/                # CI, deployment, seed scripts
└── infra/                  # Docker, Fly.io, environment configs
```

---

## Data Flow

### Portfolio query (read path)

```
User/Client
    │
    │  GET /v1/portfolio/GABC...XYZ
    ▼
API Server
    │
    ├── Check Redis cache (TTL: 30s)
    │       └── Cache HIT → return cached response
    │
    └── Cache MISS
            │
            ├── Resolve address type (G-address vs C-address)
            │
            ├── Fan out to all registered adapters (parallel)
            │       ├── BlendAdapter.getPositions(address)
            │       ├── AquariusAdapter.getPositions(address)
            │       ├── SoroswapAdapter.getPositions(address)
            │       └── FxDAOAdapter.getPositions(address)
            │
            ├── Each adapter:
            │       ├── Call Soroban RPC (getLedgerEntries / simulateTransaction)
            │       ├── Decode XDR response
            │       └── Return raw protocol-specific data
            │
            ├── Normalizer.normalize(rawPositions[])
            │       ├── Map assets to canonical identifiers
            │       ├── Fetch USD prices from price oracle
            │       ├── Compute health factors
            │       └── Aggregate totals
            │
            ├── Write to Redis cache
            │
            └── Return Portfolio response
```

### Liquidation monitoring (alert path)

```
Scheduler (every 60s)
    │
    └── For each monitored address:
            │
            ├── Fetch positions (as above)
            │
            ├── Evaluate health rules
            │       ├── healthFactor < 1.3 → WARNING
            │       └── healthFactor < 1.1 → CRITICAL
            │
            └── If threshold crossed:
                    ├── Emit webhook to registered endpoints
                    └── Write alert to database (dedup: 1 alert per address per hour)
```

---

## Core Package

The core package is the heart of Primer. It contains no HTTP server logic and has no runtime dependencies on the API package — it can be used standalone in any TypeScript runtime.

### Protocol Adapters

Each adapter implements the `ProtocolAdapter` interface:

```typescript
interface ProtocolAdapter {
  name: string
  type: 'lending' | 'amm' | 'cdp' | 'yield' | 'other'
  contractAddresses: string[]
  getPositions(address: Address, config: AdapterConfig): Promise<RawPosition[]>
  isHealthy(): Promise<boolean>
}
```

Adapters are responsible for:

- Constructing the correct Soroban RPC calls for their protocol
- Decoding XDR-encoded ledger entries using the Stellar JavaScript SDK
- Handling pagination (some protocols store positions across multiple ledger entries)
- Mapping protocol-specific asset representations to standard Stellar asset IDs

Adapters are **not** responsible for USD pricing, health factor calculation, or cross-protocol aggregation — those concerns belong to the normalizer.

### Normalizer

The normalizer takes an array of `RawPosition[]` from multiple adapters and produces a single `Portfolio` object. It:

1. **Deduplicates assets** — the same underlying asset may be represented differently across protocols (e.g. USDC as a classic asset vs. a Soroban token contract)
2. **Fetches prices** — calls the configured price oracle (default: Stellar Expert + Coingecko fallback) to convert all amounts to USD
3. **Computes derived metrics** — total value, net exposure, collateral ratio, health factor
4. **Classifies risk** — `low` / `medium` / `high` / `liquidation-risk` based on health factors

### Shared Types

All cross-package types are defined in `packages/core/src/types/` using [Zod](https://zod.dev) schemas. This gives us runtime validation at API boundaries in addition to compile-time TypeScript safety.

Key types:

```typescript
type Asset = {
  code: string            // e.g. "USDC"
  issuer: string | null   // null for XLM
  contractAddress?: string // if it's a Soroban token
}

type Position = {
  protocol: string
  type: 'deposit' | 'borrow' | 'lp' | 'yield'
  asset: Asset
  amount: string          // BigInt string, raw on-chain units
  amountUsd: number
  apy?: number
  healthFactor?: number
}

type Portfolio = {
  address: string
  resolvedAt: string      // ISO 8601
  totalValueUsd: number
  positions: Position[]
  summary: {
    totalDepositsUsd: number
    totalBorrowsUsd: number
    netExposureUsd: number
    weightedHealthFactor: number
    liquidationRisk: 'low' | 'medium' | 'high' | 'critical'
  }
}
```

---

## API Package

The API server is built with [Hono](https://hono.dev) running on [Bun](https://bun.sh). Hono was chosen for its first-class Bun support, small bundle size, and TypeScript-native design.

### Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/v1/portfolio/:address` | Full portfolio for an address |
| `GET` | `/v1/portfolio/:address/protocol/:name` | Single-protocol positions |
| `GET` | `/v1/health/:address` | Health factors and liquidation risk only |
| `POST` | `/v1/alerts/subscribe` | Register a webhook for liquidation alerts |
| `DELETE` | `/v1/alerts/unsubscribe` | Remove a webhook registration |
| `GET` | `/v1/protocols` | List all supported protocols and their status |
| `GET` | `/healthz` | Server health check |

### Middleware stack

```
Request
  → CORS
  → Rate limiter (100 req/min per IP, 1000 req/min per API key)
  → Request ID injection
  → Logger
  → Cache check (Redis)
  → Route handler
  → Response schema validation (Zod)
  → Cache write
Response
```

### Rate limiting

Anonymous requests are limited to 100 requests per minute per IP. Developers can register for a free API key to access a higher limit. Rate limit headers follow the `RateLimit-*` draft standard.

---

## SDK Package

The SDK is a thin wrapper around the API that provides:

- A typed `PrimerClient` class
- Auto-retry with exponential backoff on 429 and 5xx responses
- Webhook event types for liquidation alerts
- Optional Zod validation of API responses

```typescript
import { PrimerClient } from '@primer-finance/sdk'

const primer = new PrimerClient({ apiKey: 'your-key' })

const portfolio = await primer.getPortfolio('GABC...XYZ')
console.log(portfolio.summary.liquidationRisk)

// Subscribe to alerts
primer.on('liquidation-warning', (event) => {
  console.log(`${event.address} health factor: ${event.healthFactor}`)
})
```

The SDK is published to npm as `@primer-finance/sdk` and targets modern ESM environments. CommonJS build is included for compatibility.

---

## Dashboard Package

The dashboard is a [Next.js](https://nextjs.org) application using the App Router. It consumes the public API directly from the browser — there is no dashboard-specific backend.

### Key pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/[address]` | Portfolio view for any address |
| `/[address]/protocol/[name]` | Protocol-specific position detail |
| `/alerts` | Manage liquidation alert subscriptions |
| `/docs` | Embedded documentation |

### Design principles

- **No wallet connection required** for read-only portfolio views — any address can be inspected by anyone
- **Wallet connection optional** — connecting a wallet enables saving alert subscriptions and preferences to local storage
- Server components used for initial data fetch; client components used for real-time updates via polling

---

## Soroban Contracts

The `contracts/health-monitor` contract is an optional on-chain component that allows users to register addresses for permissionless liquidation monitoring without relying on Primer's centralized scheduler.

It is written in Rust using the [Soroban SDK](https://developers.stellar.org/docs/smart-contracts) and stores:

- A list of monitored addresses
- Per-address health thresholds
- Callback contract addresses to invoke when thresholds are breached

This contract is **not required** to use Primer's API or dashboard — it is an advanced feature for power users who want fully on-chain alerting guarantees.

---

## Caching Strategy

| Layer | TTL | Scope |
|-------|-----|-------|
| Redis | 30 seconds | Full portfolio per address |
| Redis | 60 seconds | Protocol adapter raw responses |
| Redis | 300 seconds | Asset price data |
| HTTP headers | `Cache-Control: public, max-age=30` | Public API responses |

Positions are not user-sensitive (they are public on-chain data), so all caching is server-side and shared across all users querying the same address. This significantly reduces RPC load as Primer grows.

Cache invalidation is time-based only — there is no event-driven invalidation. This is a known trade-off: a user who just made a transaction may see stale data for up to 30 seconds.

---

## Data Normalization

### Asset identity

Stellar assets can be represented in multiple ways:

- Classic assets: `USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- Soroban token contracts: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4INSKCV2RS232SXIJ4LJ`
- Native XLM: no issuer

Primer maintains a canonical asset registry that maps all known representations of the same asset to a single `Asset` object. This prevents double-counting when a user has USDC as a classic Stellar asset and also has USDC deposited in a Soroban lending protocol.

### Price feeds

Asset prices are fetched from:

1. **Primary:** Stellar Expert market data API (DEX-based prices)
2. **Fallback:** Coingecko for major assets not actively traded on Stellar DEX
3. **Hardcoded:** Fully-backed stablecoins (USDC, EURC) are priced at $1.00 with no oracle dependency

All prices are denominated in USD. Price fetch failures do not cause the portfolio request to fail — affected assets are returned with `amountUsd: null` and a `priceUnavailable: true` flag.

---

## Error Handling

### Adapter failures

If a single protocol adapter fails (e.g. RPC timeout, contract error), the remaining adapters continue and the failed adapter's results are omitted from the response. The response includes a `partialData: true` flag and a `failedProtocols: ['Blend']` array so callers can handle this appropriately.

### RPC errors

Soroban RPC calls are retried up to 3 times with exponential backoff before an adapter is considered failed. Common transient errors (rate limits, network timeouts) are retried; persistent errors (contract not found, invalid address) are not.

### Validation

All adapter outputs are validated against Zod schemas before entering the normalizer. Malformed data from a single protocol causes that adapter's results to be dropped and logged, without affecting the rest of the response.

---

## Security Considerations

- **Read-only by design:** Primer never holds private keys, never constructs transactions on behalf of users, and never requires wallet signatures for any read operation
- **No PII:** Stellar addresses are public. Primer does not collect email addresses, IP addresses beyond rate limiting, or any identity information
- **API keys:** Are hashed (Argon2id) before storage. A leaked API key can be rotated immediately from the dashboard
- **Webhook endpoints:** Are validated at registration time (must return 200 to a test ping) and signed with HMAC-SHA256 on each delivery so receivers can verify authenticity
- **RPC endpoints:** Primer supports configuring multiple RPC endpoints with automatic failover. For production, we recommend using a private RPC endpoint rather than public ones to avoid rate limits

---

## Deployment

### Production stack

| Component | Service |
|-----------|---------|
| API server | Fly.io (multi-region) |
| Dashboard | Vercel |
| Redis | Upstash (global edge) |
| Postgres | Neon (serverless, for alert subscriptions) |
| RPC | Private Soroban RPC node |
| Monitoring | Betterstack |

### Environment variables

```bash
# Stellar
STELLAR_RPC_URL=
STELLAR_NETWORK_PASSPHRASE=
HORIZON_URL=

# Cache
REDIS_URL=

# Database (for alerts)
DATABASE_URL=

# Price feeds
COINGECKO_API_KEY=

# Security
WEBHOOK_SIGNING_SECRET=
API_KEY_SALT=

# Observability
BETTERSTACK_SOURCE_TOKEN=
```

### Healthcheck

`GET /healthz` returns:

```json
{
  "status": "ok",
  "rpc": "ok",
  "cache": "ok",
  "adapters": {
    "blend": "ok",
    "aquarius": "ok",
    "soroswap": "degraded"
  }
}
```

---

## Design Decisions

### Why Bun + Hono over Node + Express?

Bun's native TypeScript execution and fast startup time reduce CI iteration cycles. Hono's request/response model maps cleanly to Bun's built-in HTTP server with no additional adapter layer. Both are well-supported in Fly.io deployments.

### Why not index on-chain data into a database?

Indexing requires running an ingestion pipeline that stays in sync with the Stellar ledger. For our initial use case — point-in-time portfolio queries — live RPC queries with aggressive caching are simpler to operate and have no consistency lag. We may revisit this if latency becomes a bottleneck as the protocol list grows.

### Why Zod for types?

TypeScript types are erased at runtime. Protocol adapters receive untyped data from the Soroban RPC that may not match our expectations — especially as protocols upgrade their contracts. Zod gives us runtime validation with the same schema we use for type inference, so our types and our runtime checks never diverge.

### Why support both G-addresses and C-addresses?

Stellar is actively migrating toward C-addresses (Soroban smart accounts) as the next-generation account model. Many Soroban DeFi protocols already use C-addresses internally or plan to require them. Building C-address support from day one ensures Primer remains useful as the ecosystem transitions and positions us to support smart wallet features (social recovery, session keys) as they roll out.