export default async function (fastify, opts) {
  const { supabase } = fastify

  // Get full medication instructions for a user
  fastify.get('/:userId', async (request, reply) => {
    const { userId } = request.params

    try {
      // Get user info
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) {
        reply.code(404).send({ error: 'Пользователь не найден' })
        return
      }

      // Get all active medications for user
      const { data: medications, error: medsError } = await supabase
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('name', { ascending: true })

      if (medsError) {
        reply.code(500).send({ error: medsError.message })
        return
      }

      // Get all schedules for user's medications
      const medicationIds = medications.map(m => m.id)
      
      const { data: schedules, error: schedError } = await supabase
        .from('schedules')
        .select('*')
        .in('medication_id', medicationIds)
        .order('time', { ascending: true })

      if (schedError) {
        reply.code(500).send({ error: schedError.message })
        return
      }

      // Get all cycles for user's medications
      const { data: cycles, error: cyclesError } = await supabase
        .from('cycles')
        .select('*')
        .in('medication_id', medicationIds)

      if (cyclesError) {
        reply.code(500).send({ error: cyclesError.message })
        return
      }

      // Build complete instructions
      const instructions = medications.map(med => {
        const medSchedules = schedules.filter(s => s.medication_id === med.id)
          .map(s => ({
            id: s.id,
            time: s.time,
            quantity: s.quantity
          }))
        const medCycle = cycles.find(c => c.medication_id === med.id)

        // Calculate cycle status
        let cycleStatus = null
        if (medCycle && medCycle.enabled) {
          const today = new Date()
          const startDate = new Date(medCycle.cycle_start)
          const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
          
          if (daysSinceStart >= 0) {
            const cycleLength = medCycle.take_days + medCycle.rest_days
            const dayInCycle = daysSinceStart % cycleLength

            if (dayInCycle < medCycle.take_days) {
              cycleStatus = {
                phase: 'taking',
                dayInCycle: dayInCycle + 1,
                daysRemaining: medCycle.take_days - dayInCycle,
                totalTakeDays: medCycle.take_days,
                totalRestDays: medCycle.rest_days
              }
            } else {
              cycleStatus = {
                phase: 'resting',
                dayInCycle: dayInCycle - medCycle.take_days + 1,
                daysRemaining: cycleLength - dayInCycle,
                totalTakeDays: medCycle.take_days,
                totalRestDays: medCycle.rest_days
              }
            }
          } else {
            cycleStatus = {
              phase: 'not_started',
              daysUntilStart: Math.abs(daysSinceStart),
              totalTakeDays: medCycle.take_days,
              totalRestDays: medCycle.rest_days
            }
          }
        }

        return {
          id: med.id,
          name: med.name,
          dose: med.dose,
          image_url: med.image_url,
          schedules: medSchedules,
          cycle: medCycle ? {
            id: medCycle.id,
            enabled: medCycle.enabled,
            take_days: medCycle.take_days,
            rest_days: medCycle.rest_days,
            cycle_start: medCycle.cycle_start,
            status: cycleStatus
          } : null
        }
      })

      return {
        user: {
          id: user.id,
          name: user.name,
          whatsapp_number: user.whatsapp_number,
          timezone: process.env.CRON_TIMEZONE || 'UTC'
        },
        medications: instructions,
        generated_at: new Date().toISOString()
      }

    } catch (error) {
      reply.code(500).send({ error: error.message })
    }
  })
}

