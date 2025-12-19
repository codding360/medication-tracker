export default async function (fastify, opts) {
  const { supabase } = fastify

  // Get preview for a specific time
  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params
    const { time } = request.query

    if (!time) {
      reply.code(400).send({ error: 'Missing required query parameter: time (format: HH:mm)' })
      return
    }

    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    if (!timeRegex.test(time)) {
      reply.code(400).send({ error: 'Invalid time format. Use HH:mm (24-hour format)' })
      return
    }

    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError) {
      reply.code(404).send({ error: 'User not found' })
      return
    }

    // Get all schedules for this time with medication info
    const { data: schedules, error: schedulesError } = await supabase
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
      .eq('time', time)
      .eq('medications.user_id', userId)
      .eq('medications.active', true)

    if (schedulesError) {
      reply.code(500).send({ error: schedulesError.message })
      return
    }

    // Get cycles for each medication to check if they should take it today
    const medicationIds = schedules.map(s => s.medication_id)
    
    const { data: cycles, error: cyclesError } = await supabase
      .from('cycles')
      .select('*')
      .in('medication_id', medicationIds)
      .eq('enabled', true)

    if (cyclesError) {
      reply.code(500).send({ error: cyclesError.message })
      return
    }

    // Filter medications based on cycle status
    const today = new Date()
    const filteredMedications = schedules
      .filter(schedule => {
        const cycle = cycles?.find(c => c.medication_id === schedule.medication_id)
        
        if (!cycle) {
          // No cycle means always take
          return true
        }

        // Calculate if today is a take day
        const startDate = new Date(cycle.cycle_start)
        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
        const cycleLength = cycle.take_days + cycle.rest_days
        const dayInCycle = daysSinceStart % cycleLength

        return dayInCycle < cycle.take_days
      })
      .map(schedule => ({
        medication_id: schedule.medication_id,
        name: schedule.medications.name,
        dose: schedule.medications.dose,
        image_url: schedule.medications.image_url
      }))

    return {
      user_id: userId,
      now: time,
      timezone: process.env.CRON_TIMEZONE || 'UTC',
      medications: filteredMedications
    }
  })
}

