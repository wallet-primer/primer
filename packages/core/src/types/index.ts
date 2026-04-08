import { z } from 'zod'

export const AssetSchema = z.object({
    code: z.string(),
    issuer: z.string().nullable(),
    contractAddress: z.string().optional(),
})

export type Asset = z.infer<typeof AssetSchema>

export const PositionSchema = z.object({
    protocol: z.string(),
    type: z.enum(['deposit', 'borrow', 'lp', 'yield']),
    asset: AssetSchema,
    amount: z.string(),
    amountUsd: z.number().nullable(),
    apy: z.number().optional(),
    healthFactor: z.number().optional(),
})

export type Position = z.infer<typeof PositionSchema>

export const PortfolioSummarySchema = z.object({
    totalDepositsUsd: z.number(),
    totalBorrowsUsd: z.number(),
    netExposureUsd: z.number(),
    weightedHealthFactor: z.number(),
    liquidationRisk: z.enum(['low', 'medium', 'high', 'critical']),
})

export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>

export const PortfolioSchema = z.object({
    address: z.string(),
    resolvedAt: z.string(),
    totalValueUsd: z.number(),
    positions: z.array(PositionSchema),
    summary: PortfolioSummarySchema,
    partialData: z.boolean().optional(),
    failedProtocols: z.array(z.string()).optional(),
})

export type Portfolio = z.infer<typeof PortfolioSchema>

export const RawPositionSchema = z.object({
    protocol: z.string(),
    type: z.enum(['deposit', 'borrow', 'lp', 'yield']),
    asset: AssetSchema,
    amount: z.string(),
})

export type RawPosition = z.infer<typeof RawPositionSchema>
