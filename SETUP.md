# Project Setup Guide

## Prerequisites

- Node.js 20+
- Bun (for API server)
- Rust 1.70+ (for Soroban contracts)
- Soroban CLI

## Installation

### 1. Install Node dependencies

```bash
npm install
```

### 2. Install Rust and Soroban CLI

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Soroban CLI
cargo install soroban-cli
```

### 3. Install Bun (optional, for faster API development)

```bash
curl -fsSL https://bun.sh/install | bash
```

## Development

### Start all services

```bash
npm run dev
```

This starts:
- API server on `http://localhost:3000`
- Dashboard on `http://localhost:3001`
- TypeScript watchers for core and SDK

### Build all packages

```bash
npm run build
```

### Run tests

```bash
npm run test
```

### Lint code

```bash
npm run lint
```

## Soroban Contract Development

### Build contract

```bash
soroban contract build --manifest-path contracts/health-monitor/Cargo.toml
```

### Test contract

```bash
cargo test --manifest-path contracts/health-monitor/Cargo.toml
```

### Deploy to testnet

```bash
soroban contract deploy \
  --wasm contracts/health-monitor/target/wasm32-unknown-unknown/release/health_monitor.wasm \
  --source <your-account> \
  --network testnet
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required for local development:
- `STELLAR_RPC_URL` — Soroban RPC endpoint
- `REDIS_URL` — Redis connection string (optional, defaults to localhost)

## Project Structure

```
primer/
├── packages/
│   ├── core/       # Protocol adapters, normalizer, types
│   ├── api/        # REST API server (Hono + Bun)
│   ├── sdk/        # TypeScript SDK
│   └── dashboard/  # Next.js UI
├── contracts/
│   └── health-monitor/  # Soroban contract (Rust)
├── docs/           # Extended documentation
├── scripts/        # CI, deployment, seed scripts
└── infra/          # Docker, Fly.io configs
```

## Deployment

### API (Fly.io)

```bash
flyctl deploy
```

### Dashboard (Vercel)

```bash
vercel deploy
```

### Contract (Stellar testnet)

See [contracts/health-monitor/README.md](contracts/health-monitor/README.md)

## Troubleshooting

### Port already in use

Change ports in `.env.local`:
```bash
API_PORT=3001
DASHBOARD_PORT=3002
```

### Redis connection error

Ensure Redis is running:
```bash
redis-server
```

Or use Upstash Redis in production (configured via `REDIS_URL`).

### Soroban CLI not found

Reinstall Soroban CLI:
```bash
cargo install soroban-cli --locked
```

## Contributing

See [contributing.md](contributing.md) for guidelines.
