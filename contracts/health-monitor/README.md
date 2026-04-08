# Health Monitor Contract

On-chain liquidation monitoring contract for Primer. Allows users to register addresses for permissionless health factor monitoring without relying on Primer's centralized scheduler.

## Features

- Register addresses for health monitoring
- Set custom health factor thresholds
- Callback invocation when thresholds are breached
- Unregister from monitoring

## Building

```bash
soroban contract build --manifest-path contracts/health-monitor/Cargo.toml
```

## Testing

```bash
cargo test --manifest-path contracts/health-monitor/Cargo.toml
```

## Deployment

```bash
soroban contract deploy \
  --wasm contracts/health-monitor/target/wasm32-unknown-unknown/release/health_monitor.wasm \
  --source <your-account> \
  --network testnet
```

## Usage

### Register for monitoring

```javascript
const contract = new SorobanClient.Contract(contractId, spec);
await contract.register(
  address,
  healthThreshold,
  callbackAddress
);
```

### Check health

```javascript
await contract.check_health(address, currentHealthFactor);
```

### Unregister

```javascript
await contract.unregister(address);
```
