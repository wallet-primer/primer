import { Portfolio } from '@primer-finance/core'

export interface PrimerClientConfig {
    apiKey?: string
    baseUrl?: string
}

export class PrimerClient {
    private apiKey?: string
    private baseUrl: string

    constructor(config: PrimerClientConfig = {}) {
        this.apiKey = config.apiKey
        this.baseUrl = config.baseUrl || 'https://api.primer.finance'
    }

    async getPortfolio(address: string): Promise<Portfolio> {
        const response = await fetch(`${this.baseUrl}/v1/portfolio/${address}`, {
            headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {},
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch portfolio: ${response.statusText}`)
        }

        return response.json()
    }

    async getHealth(address: string): Promise<any> {
        const response = await fetch(`${this.baseUrl}/v1/health/${address}`, {
            headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {},
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch health: ${response.statusText}`)
        }

        return response.json()
    }

    async getProtocols(): Promise<any> {
        const response = await fetch(`${this.baseUrl}/v1/protocols`, {
            headers: this.apiKey ? { 'X-API-Key': this.apiKey } : {},
        })

        if (!response.ok) {
            throw new Error(`Failed to fetch protocols: ${response.statusText}`)
        }

        return response.json()
    }
}
