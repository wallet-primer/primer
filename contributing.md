# Contributing to Primer

Thank you for your interest in contributing to Primer. We are building open infrastructure for the Stellar DeFi ecosystem and every contribution — whether it's a new protocol adapter, a bug report, a documentation improvement, or a code review — makes the project better for everyone.

This document explains how to get involved, what we expect from contributors, and how decisions get made.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Ways to Contribute](#ways-to-contribute)
- [Development Setup](#development-setup)
- [How to Submit a Pull Request](#how-to-submit-a-pull-request)
- [Adding a Protocol Adapter](#adding-a-protocol-adapter)
- [Commit Conventions](#commit-conventions)
- [Branch Naming](#branch-naming)
- [Testing Requirements](#testing-requirements)
- [Review Process](#review-process)
- [Issue Labels](#issue-labels)
- [Good First Issues](#good-first-issues)

---

## Code of Conduct

Primer follows the [Contributor Covenant](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). In short: be kind, be constructive, and assume good faith. We are a small team building in public and we want this to be a welcoming place for contributors of all experience levels.

Report violations to **conduct@primer.finance**.

---

## Ways to Contribute

### Report a bug

Open a [GitHub Issue](https://github.com/primer-finance/primer/issues/new?template=bug_report.md) with:

- A clear title describing the problem
- Steps to reproduce the issue
- Expected vs actual behaviour
- Your environment (OS, Bun version, Node version if applicable)
- Relevant logs or screenshots

### Request a feature or protocol

Open a [GitHub Discussion](https://github.com/primer-finance/primer/discussions) under the **Ideas** category. For protocol addition requests, include:

- Protocol name and mainnet contract address(es)
- Link to the protocol's documentation or source code
- A brief description of position types it exposes (lending, LP, CDP, etc.)

### Improve documentation

Docs live in the `/docs` directory and in markdown files at the repo root. Edit them directly and open a pull request — no issue needed for small fixes.

### Write or fix tests

Test coverage is critical for financial data infrastructure. If you spot a function without tests or a missed edge case, a PR adding tests is always welcome and will be reviewed promptly.

### Submit a protocol adapter

See the dedicated [Adding a Protocol Adapter](#adding-a-protocol-adapter) section below.

---

## Development Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Bun | 1.0+ | [bun.sh](https://bun.sh) |
| Rust | stable | [rustup.rs](https://rustup.rs) |
| Stellar CLI | latest | [developers.stellar.org](https://developers.stellar.org/docs/tools/developer-tools/cli/stellar-cli) |
| Git | any | system package manager |

### Clone and install

```bash
git clone https://github.com/primer-finance/primer
cd primer
bun install
```

### Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

```
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
HORIZON_URL=https://horizon-testnet.stellar.org
```

For local development, Testnet is recommended. Do not commit real keypairs or mainnet credentials.

### Run in development

```bash
# API server with hot reload
bun run dev:api

# Dashboard
bun run dev:dashboard

# Watch mode for core package
bun run dev:core
```

### Run tests

```bash
# All tests
bun run test

# Single package
bun run test --filter packages/core

# Watch mode
bun run test --watch
```

---

## How to Submit a Pull Request

1. **Fork** the repository and clone your fork locally
2. **Create a branch** from `main` using the naming convention below
3. **Make your changes**, keeping commits small and focused
4. **Write or update tests** for anything you change
5. **Run the full test suite** and ensure it passes
6. **Open a pull request** against `main` with a clear description

### Pull request description template

```
## What this does
A short summary of the change.

## Why
The motivation or problem being solved.

## How to test
Steps a reviewer can follow to verify the change works.

## Related issues
Closes #123
```

---

## Adding a Protocol Adapter

Protocol adapters live in `packages/core/src/adapters/`. Each adapter is responsible for:

1. Fetching on-chain position data for a given address from a specific protocol
2. Normalizing that data into the shared `Position` schema
3. Handling protocol-specific edge cases (e.g. Blend's backstop pool logic)

### Adapter interface

```typescript
import type { Address, Position, AdapterConfig } from '../types'

export interface ProtocolAdapter {
  name: string
  type: 'lending' | 'amm' | 'cdp' | 'yield' | 'other'
  contractAddresses: string[]
  getPositions(address: Address, config: AdapterConfig): Promise<Position[]>
  isHealthy(): Promise<boolean>
}
```

### Step-by-step

1. Create `packages/core/src/adapters/your-protocol.ts`
2. Implement the `ProtocolAdapter` interface
3. Add your adapter to `packages/core/src/adapters/index.ts`
4. Add a corresponding test file at `packages/core/src/adapters/__tests__/your-protocol.test.ts`
5. Update the supported protocols table in `README.md`
6. Add protocol documentation to `docs/protocols/your-protocol.md`

### Testing adapters

Adapters must include tests that mock Soroban RPC responses. Do not make live network calls in the test suite. Use the fixtures in `packages/core/src/adapters/__fixtures__/` as reference for mocking patterns.

```typescript
import { createMockRpc } from '../../__fixtures__/rpc'
import { YourProtocolAdapter } from '../your-protocol'

describe('YourProtocolAdapter', () => {
  it('returns normalized positions for a known address', async () => {
    const rpc = createMockRpc('your-protocol')
    const adapter = new YourProtocolAdapter({ rpc })
    const positions = await adapter.getPositions('GABC...XYZ', {})
    expect(positions).toMatchSnapshot()
  })
})
```

---

## Commit Conventions

Primer follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New feature or protocol adapter |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `refactor` | Code change that is not a feature or fix |
| `chore` | Build process, dependencies, tooling |
| `perf` | Performance improvement |

**Examples:**

```
feat(adapters): add Soroswap LP position support
fix(api): handle missing collateral field in Blend response
docs: add architecture diagram to ARCHITECTURE.md
test(core): add edge case for zero-balance positions
```

---

## Branch Naming

```
feat/adapter-soroswap
fix/blend-health-factor-overflow
docs/update-api-reference
chore/upgrade-bun-1-1
```

---

## Testing Requirements

All pull requests must:

- Pass the full test suite (`bun run test`)
- Maintain or improve code coverage for modified files
- Include tests for any new public functions or adapter methods
- Not introduce `console.log` statements in production code paths

For changes to the API package, also run:

```bash
bun run test:integration
```

---

## Review Process

- All PRs require at least **one approval** from a core maintainer before merging
- PRs from first-time contributors will receive feedback within **3 business days**
- Protocol adapter PRs require review from someone familiar with the target protocol
- Breaking changes to the public API require discussion in a GitHub Issue before a PR is opened
- We use **squash merges** to keep the main branch history clean

---

## Issue Labels

| Label | Meaning |
|-------|---------|
| `good first issue` | Well-scoped, beginner-friendly |
| `help wanted` | We'd love external help on this |
| `protocol: blend` | Related to the Blend adapter |
| `protocol: aquarius` | Related to the Aquarius adapter |
| `bug` | Something is broken |
| `enhancement` | New capability |
| `documentation` | Docs improvement |
| `priority: high` | Blocking a milestone |

---

## Good First Issues

Not sure where to start? Look for issues tagged [`good first issue`](https://github.com/primer-finance/primer/labels/good%20first%20issue). These are intentionally scoped to be completable in a few hours without deep protocol knowledge.

You can also browse the [project board](https://github.com/orgs/primer-finance/projects/1) to see what is actively being worked on and where help is most needed.

---

## Questions?

Join the conversation on [Discord](https://discord.gg/primer) in the `#contributing` channel, or open a [GitHub Discussion](https://github.com/primer-finance/primer/discussions). We are happy to help you find the right issue and get your first PR merged.