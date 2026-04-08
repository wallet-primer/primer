#![no_std]

use soroban_sdk::{contract, contractimpl, Address, Env, Symbol, Vec};

#[contract]
pub struct HealthMonitor;

#[contractimpl]
impl HealthMonitor {
    /// Register an address for health monitoring
    pub fn register(
        env: Env,
        address: Address,
        health_threshold: u32,
        callback: Address,
    ) -> Result<(), Symbol> {
        address.require_auth();

        // Store monitoring configuration
        let key = Symbol::new(&env, "monitor");
        let mut monitors: Vec<(Address, u32, Address)> =
            env.storage().persistent().get(&key).unwrap_or_default();

        monitors.push_back((address.clone(), health_threshold, callback));
        env.storage().persistent().set(&key, &monitors);

        Ok(())
    }

    /// Unregister an address from monitoring
    pub fn unregister(env: Env, address: Address) -> Result<(), Symbol> {
        address.require_auth();

        let key = Symbol::new(&env, "monitor");
        let mut monitors: Vec<(Address, u32, Address)> =
            env.storage().persistent().get(&key).unwrap_or_default();

        monitors.retain(|(addr, _, _)| addr != &address);
        env.storage().persistent().set(&key, &monitors);

        Ok(())
    }

    /// Get all monitored addresses
    pub fn get_monitors(env: Env) -> Vec<(Address, u32, Address)> {
        let key = Symbol::new(&env, "monitor");
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or_default()
    }

    /// Check health and trigger callbacks if threshold breached
    pub fn check_health(env: Env, address: Address, current_health: u32) -> Result<(), Symbol> {
        let key = Symbol::new(&env, "monitor");
        let monitors: Vec<(Address, u32, Address)> =
            env.storage().persistent().get(&key).unwrap_or_default();

        for (monitored_addr, threshold, _callback) in monitors.iter() {
            if monitored_addr == &address && current_health < threshold {
                // TODO: Invoke callback contract
            }
        }

        Ok(())
    }
}
