import { RawPosition, Asset } from '../types/index'

export type Address = string

export interface AdapterConfig {
    rpcUrl: string
    networkPassphrase: string
}

export interface ProtocolAdapter {
    name: string
    type: 'lending' | 'amm' | 'cdp' | 'yield' | 'other'
    contractAddresses: string[]
    getPositions(address: Address, config: AdapterConfig): Promise<RawPosition[]>
    isHealthy(): Promise<boolean>
}

export class BaseAdapter implements ProtocolAdapter {
    name: string
    type: 'lending' | 'amm' | 'cdp' | 'yield' | 'other'
    contractAddresses: string[]

    constructor(
        name: string,
        type: ProtocolAdapter['type'],
        contractAddresses: string[]
    ) {
        this.name = name
        this.type = type
        this.contractAddresses = contractAddresses
    }

    async getPositions(
        address: Address,
        config: AdapterConfig
    ): Promise<RawPosition[]> {
        throw new Error('Not implemented')
    }

    async isHealthy(): Promise<boolean> {
        return true
    }
}
