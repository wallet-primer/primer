import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'

const app = new Hono()

// Middleware
app.use(cors())
app.use(logger())

// Routes
app.get('/healthz', (c) => {
    return c.json({
        status: 'ok',
        rpc: 'ok',
        cache: 'ok',
        adapters: {
            blend: 'ok',
            aquarius: 'ok',
            soroswap: 'ok',
        },
    })
})

app.get('/v1/portfolio/:address', (c) => {
    const address = c.req.param('address')
    return c.json({
        address,
        resolvedAt: new Date().toISOString(),
        totalValueUsd: 0,
        positions: [],
        summary: {
            totalDepositsUsd: 0,
            totalBorrowsUsd: 0,
            netExposureUsd: 0,
            weightedHealthFactor: 1.0,
            liquidationRisk: 'low',
        },
    })
})

app.get('/v1/health/:address', (c) => {
    const address = c.req.param('address')
    return c.json({
        address,
        healthFactor: 1.0,
        liquidationRisk: 'low',
    })
})

app.get('/v1/protocols', (c) => {
    return c.json({
        protocols: [
            { name: 'blend', status: 'ok', type: 'lending' },
            { name: 'aquarius', status: 'ok', type: 'amm' },
            { name: 'soroswap', status: 'ok', type: 'amm' },
        ],
    })
})

app.post('/v1/alerts/subscribe', (c) => {
    return c.json({ success: true, message: 'Webhook registered' })
})

app.delete('/v1/alerts/unsubscribe', (c) => {
    return c.json({ success: true, message: 'Webhook unregistered' })
})

export default app
