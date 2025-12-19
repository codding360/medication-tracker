import Fastify from 'fastify'
import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { initializeCronJobs, stopAllCronJobs } from './utils/cronJobs.js'
import { startScheduler } from './services/scheduler.js'

dotenv.config()

// Store cron jobs for cleanup
let cronJobs = null

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const isProduction = process.env.NODE_ENV === 'production'

const fastify = Fastify({
  logger: true
})

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Register plugins
await fastify.register(cors, {
  origin: true
})

await fastify.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})

// Serve static files in production
if (isProduction) {
  await fastify.register(fastifyStatic, {
    root: path.join(__dirname, 'dist'),
    prefix: '/'
  })
  
  console.log('📦 Serving static files from dist/')
}

// Make supabase available in routes
fastify.decorate('supabase', supabase)

// Import routes
import usersRoutes from './routes/users.js'
import medicationsRoutes from './routes/medications.js'
import schedulesRoutes from './routes/schedules.js'
import cyclesRoutes from './routes/cycles.js'
import previewRoutes from './routes/preview.js'
import instructionsRoutes from './routes/instructions.js'
import notificationsRoutes from './routes/notifications.js'

fastify.register(usersRoutes, { prefix: '/api/users' })
fastify.register(medicationsRoutes, { prefix: '/api/medications' })
fastify.register(schedulesRoutes, { prefix: '/api/schedules' })
fastify.register(cyclesRoutes, { prefix: '/api/cycles' })
fastify.register(previewRoutes, { prefix: '/api/preview' })
fastify.register(instructionsRoutes, { prefix: '/api/instructions' })
fastify.register(notificationsRoutes, { prefix: '/api/notifications' })

// Health check
fastify.get('/api/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000
    const host = process.env.HOST || '0.0.0.0'
    
    await fastify.listen({ port, host })
    
    // Initialize cron jobs after server starts
    if (process.env.ENABLE_SCHEDULER !== 'false') {
      console.log('\n' + '='.repeat(60))
      console.log('🔔 MEDICATION REMINDER SCHEDULER')
      console.log('='.repeat(60))
      
      // Start scheduler service
      startScheduler()
      
      // Initialize cron jobs
      cronJobs = initializeCronJobs()
      
      console.log('='.repeat(60) + '\n')
    } else {
      console.log('⚠️  Scheduler disabled (ENABLE_SCHEDULER=false)')
    }
    
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down gracefully...')
  
  // Stop cron jobs
  if (cronJobs) {
    stopAllCronJobs(cronJobs)
  }
  
  // Close fastify
  await fastify.close()
  
  console.log('✓ Server stopped')
  process.exit(0)
})

start()
