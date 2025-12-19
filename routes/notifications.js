/**
 * Notifications API Routes
 * Endpoints for managing and viewing notification history
 */

export default async function (fastify, opts) {
  const { supabase } = fastify

  // Get notification history for a user
  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params
    const { limit = 50, status } = request.query

    try {
      let query = supabase
        .from('notifications_log')
        .select('*')
        .eq('user_id', userId)
        .order('sent_at', { ascending: false })
        .limit(parseInt(limit))

      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        reply.code(500).send({ error: error.message })
        return
      }

      return data
    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  })

  // Get notification statistics
  fastify.get('/stats/:userId', async (request, reply) => {
    const { userId } = request.params
    const { days = 7 } = request.query

    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - parseInt(days))

      const { data, error } = await supabase
        .from('notifications_log')
        .select('status, channel, sent_at')
        .eq('user_id', userId)
        .gte('sent_at', startDate.toISOString())

      if (error) {
        reply.code(500).send({ error: error.message })
        return
      }

      // Calculate statistics
      const stats = {
        total: data.length,
        sent: data.filter(n => n.status === 'sent').length,
        failed: data.filter(n => n.status === 'failed').length,
        pending: data.filter(n => n.status === 'pending').length,
        byChannel: {}
      }

      data.forEach(n => {
        if (!stats.byChannel[n.channel]) {
          stats.byChannel[n.channel] = 0
        }
        stats.byChannel[n.channel]++
      })

      return stats
    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  })

  // Get all notifications (admin)
  fastify.get('/all', async (request, reply) => {
    const { limit = 100, status, channel } = request.query

    try {
      let query = supabase
        .from('notifications_log')
        .select(`
          *,
          users (
            id,
            name,
            whatsapp_number
          )
        `)
        .order('sent_at', { ascending: false })
        .limit(parseInt(limit))

      if (status) {
        query = query.eq('status', status)
      }

      if (channel) {
        query = query.eq('channel', channel)
      }

      const { data, error } = await query

      if (error) {
        reply.code(500).send({ error: error.message })
        return
      }

      return data
    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  })
}

