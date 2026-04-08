import { RawPosition, Portfolio, PortfolioSummary } from '../types/index'

export interface NormalizerConfig {
    priceOracleUrl?: string
}

export class Normalizer {
    private config: NormalizerConfig

    constructor(config: NormalizerConfig = {}) {
        this.config = config
    }

    async normalize(
        address: string,
        rawPositions: RawPosition[]
    ): Promise<Portfolio> {
        // Deduplicate assets
        const deduplicatedPositions = this.deduplicateAssets(rawPositions)

        // Fetch prices
        const positionsWithPrices = await this.enrichWithPrices(
            deduplicatedPositions
        )

        // Compute metrics
        const summary = this.computeSummary(positionsWithPrices)

        return {
            address,
            resolvedAt: new Date().toISOString(),
            totalValueUsd: summary.totalDepositsUsd + summary.totalBorrowsUsd,
            positions: positionsWithPrices,
            summary,
        }
    }

    private deduplicateAssets(positions: RawPosition[]): RawPosition[] {
        // TODO: Implement asset deduplication logic
        return positions
    }

    private async enrichWithPrices(
        positions: RawPosition[]
    ): Promise<any[]> {
        // TODO: Fetch prices from oracle and enrich positions
        return positions.map((p) => ({
            ...p,
            amountUsd: null,
        }))
    }

    private computeSummary(positions: any[]): PortfolioSummary {
        const totalDepositsUsd = positions
            .filter((p) => p.type === 'deposit')
            .reduce((sum, p) => sum + (p.amountUsd || 0), 0)

        const totalBorrowsUsd = positions
            .filter((p) => p.type === 'borrow')
            .reduce((sum, p) => sum + (p.amountUsd || 0), 0)

        return {
            totalDepositsUsd,
            totalBorrowsUsd,
            netExposureUsd: totalDepositsUsd - totalBorrowsUsd,
            weightedHealthFactor: 1.0,
            liquidationRisk: 'low',
        }
    }
}
