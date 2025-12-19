export default async function (fastify, opts) {
  const { supabase } = fastify

  // Get all cycles for a medication
  fastify.get('/medication/:medicationId', async (request, reply) => {
    const { medicationId } = request.params

    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('medication_id', medicationId)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Get all cycles for a user (with medication info)
  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params

    const { data, error } = await supabase
      .from('cycles')
      .select(`
        *,
        medications!inner (
          id,
          name,
          user_id
        )
      `)
      .eq('medications.user_id', userId)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Get single cycle
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params

    const { data, error } = await supabase
      .from('cycles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      reply.code(404).send({ error: 'Cycle not found' })
      return
    }

    return data
  })

  // Create cycle
  fastify.post('/', async (request, reply) => {
    const { medication_id, take_days, rest_days, cycle_start, enabled } = request.body

    if (!medication_id || !take_days || !rest_days || !cycle_start) {
      reply.code(400).send({ 
        error: 'Missing required fields: medication_id, take_days, rest_days, cycle_start' 
      })
      return
    }

    const { data, error } = await supabase
      .from('cycles')
      .insert([{ 
        medication_id, 
        take_days, 
        rest_days, 
        cycle_start, 
        enabled: enabled ?? true 
      }])
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Update cycle
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params
    const { take_days, rest_days, cycle_start, enabled } = request.body

    const updates = {}
    if (take_days !== undefined) updates.take_days = take_days
    if (rest_days !== undefined) updates.rest_days = rest_days
    if (cycle_start !== undefined) updates.cycle_start = cycle_start
    if (enabled !== undefined) updates.enabled = enabled

    const { data, error } = await supabase
      .from('cycles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Delete cycle
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params

    const { error } = await supabase
      .from('cycles')
      .delete()
      .eq('id', id)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return { success: true, message: 'Cycle deleted' }
  })
}

