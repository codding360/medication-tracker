export default async function (fastify, opts) {
  const { supabase } = fastify

  // Get all schedules for a medication
  fastify.get('/medication/:medicationId', async (request, reply) => {
    const { medicationId } = request.params

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('medication_id', medicationId)
      .order('time', { ascending: true })

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Get all schedules for a user (with medication info)
  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params

    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        medications!inner (
          id,
          name,
          dose,
          image_url,
          active,
          user_id
        )
      `)
      .eq('medications.user_id', userId)
      .eq('medications.active', true)
      .order('time', { ascending: true })

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Get single schedule
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params

    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      reply.code(404).send({ error: 'Schedule not found' })
      return
    }

    return data
  })

  // Create schedule
  fastify.post('/', async (request, reply) => {
    const { medication_id, time } = request.body

    if (!medication_id || !time) {
      reply.code(400).send({ error: 'Missing required fields: medication_id, time' })
      return
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(time)) {
      reply.code(400).send({ error: 'Invalid time format. Use HH:mm (24-hour format)' })
      return
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert([{ medication_id, time }])
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Update schedule
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params
    const { time } = request.body

    if (time !== undefined) {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(time)) {
        reply.code(400).send({ error: 'Invalid time format. Use HH:mm (24-hour format)' })
        return
      }
    }

    const { data, error } = await supabase
      .from('schedules')
      .update({ time })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Delete schedule
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params

    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return { success: true, message: 'Schedule deleted' }
  })
}

