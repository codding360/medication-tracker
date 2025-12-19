export default async function (fastify, opts) {
  const { supabase } = fastify

  // Get all medications for a user
  fastify.get('/user/:userId', async (request, reply) => {
    const { userId } = request.params

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Get single medication
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params

    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      reply.code(404).send({ error: 'Medication not found' })
      return
    }

    return data
  })

  // Create medication
  fastify.post('/', async (request, reply) => {
    const { user_id, name, dose, image_url, active } = request.body

    if (!user_id || !name || !dose) {
      reply.code(400).send({ error: 'Missing required fields: user_id, name, dose' })
      return
    }

    const { data, error } = await supabase
      .from('medications')
      .insert([{ user_id, name, dose, image_url, active: active ?? true }])
      .select()
      .single()

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return data
  })

  // Update medication
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params
    const { name, dose, image_url, active } = request.body

    const updates = {}
    if (name !== undefined) updates.name = name
    if (dose !== undefined) updates.dose = dose
    if (image_url !== undefined) updates.image_url = image_url
    if (active !== undefined) updates.active = active

    const { data, error } = await supabase
      .from('medications')
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

  // Delete medication
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params

    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', id)

    if (error) {
      reply.code(500).send({ error: error.message })
      return
    }

    return { success: true, message: 'Medication deleted' }
  })

  // Upload medication image
  fastify.post('/upload', async (request, reply) => {
    try {
      const data = await request.file()
      
      if (!data) {
        reply.code(400).send({ error: 'No file provided' })
        return
      }

      const buffer = await data.toBuffer()
      const filename = `${Date.now()}-${data.filename}`

      const { data: uploadData, error } = await supabase.storage
        .from('medication-images')
        .upload(filename, buffer, {
          contentType: data.mimetype,
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        reply.code(500).send({ error: error.message })
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('medication-images')
        .getPublicUrl(filename)

      return { image_url: publicUrl, path: uploadData.path }
    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  })
}

