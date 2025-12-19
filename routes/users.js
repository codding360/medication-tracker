export default async function (fastify, opts) {
  const { supabase } = fastify

  // Get all users
  fastify.get('/', async (request, reply) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Get single user
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      reply.code(404).send({ error: 'User not found' })
      return
    }

    return data
  })

  // Create user
  fastify.post('/', async (request, reply) => {
    const { name, whatsapp_number } = request.body

    if (!name || !whatsapp_number) {
      reply.code(400).send({ error: 'Missing required fields: name, whatsapp_number' })
      return
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{ name, whatsapp_number }])
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Update user
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params
    const { name, whatsapp_number } = request.body

    const updates = {}
    if (name !== undefined) updates.name = name
    if (whatsapp_number !== undefined) updates.whatsapp_number = whatsapp_number

    const { data, error } = await supabase
      .from('users')
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

  // Delete user
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return { success: true, message: 'User deleted' }
  })
}

