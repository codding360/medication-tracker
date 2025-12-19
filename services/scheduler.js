/**
 * Medication Reminder Scheduler
 * Checks schedules every minute and sends notifications
 */

import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage, formatMedicationReminder } from './notifications.js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Check and send medication reminders for current time
 */
export async function checkMedicationReminders() {
  try {
    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    
    console.log(`\n🔔 Checking reminders for ${currentTime}...`)
    
    // Get all schedules for current time
    const { data: schedules, error: schedError } = await supabase
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
      .eq('time', currentTime)
      .eq('medications.active', true)
    
    if (schedError) {
      console.error('Error fetching schedules:', schedError)
      return
    }
    
    if (!schedules || schedules.length === 0) {
      console.log('No reminders for this time')
      return
    }
    
    console.log(`Found ${schedules.length} scheduled medications`)
    
    // Group by user
    const userSchedules = {}
    schedules.forEach(schedule => {
      const userId = schedule.medications.user_id
      if (!userSchedules[userId]) {
        userSchedules[userId] = []
      }
      userSchedules[userId].push(schedule)
    })
    
    // Process each user
    for (const [userId, userSchedulesList] of Object.entries(userSchedules)) {
      await processUserReminders(userId, userSchedulesList, currentTime)
    }
    
    console.log('✓ Reminder check completed\n')
    
  } catch (error) {
    console.error('Error in checkMedicationReminders:', error)
  }
}

/**
 * Process reminders for a specific user
 */
async function processUserReminders(userId, schedules, time) {
  try {
    // Get user info
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      console.error(`User ${userId} not found`)
      return
    }
    
    console.log(`\n📤 Processing reminders for ${user.name} (${user.whatsapp_number})`)
    
    // Get medication IDs
    const medicationIds = schedules.map(s => s.medication_id)
    
    // Get cycles for these medications
    const { data: cycles, error: cyclesError } = await supabase
      .from('cycles')
      .select('*')
      .in('medication_id', medicationIds)
      .eq('enabled', true)
    
    if (cyclesError) {
      console.error('Error fetching cycles:', cyclesError)
    }
    
    // Filter medications based on cycles
    const today = new Date()
    const medicationsToRemind = []
    
    for (const schedule of schedules) {
      const medication = schedule.medications
      const cycle = cycles?.find(c => c.medication_id === medication.id)
      
      let shouldRemind = true
      let cycleStatus = null
      
      if (cycle) {
        const startDate = new Date(cycle.cycle_start)
        const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
        
        if (daysSinceStart >= 0) {
          const cycleLength = cycle.take_days + cycle.rest_days
          const dayInCycle = daysSinceStart % cycleLength
          
          if (dayInCycle < cycle.take_days) {
            // Taking phase
            shouldRemind = true
            cycleStatus = {
              phase: 'taking',
              dayInCycle: dayInCycle + 1,
              totalTakeDays: cycle.take_days,
              totalRestDays: cycle.rest_days
            }
          } else {
            // Resting phase
            shouldRemind = false
            cycleStatus = {
              phase: 'resting',
              dayInCycle: dayInCycle - cycle.take_days + 1,
              totalRestDays: cycle.rest_days
            }
          }
        } else {
          // Cycle not started yet
          shouldRemind = false
        }
      }
      
      if (shouldRemind) {
        medicationsToRemind.push({
          ...medication,
          cycleStatus
        })
      }
    }
    
    if (medicationsToRemind.length === 0) {
      console.log('No medications to remind (all in rest phase or disabled)')
      return
    }
    
    console.log(`${medicationsToRemind.length} medication(s) to remind`)
    
    // Format message
    const message = formatMedicationReminder(user, medicationsToRemind, time)
    
    // Send WhatsApp notification
    const result = await sendWhatsAppMessage(
      user.whatsapp_number,
      message,
      {
        userId: user.id,
        userName: user.name,
        time: time,
        medicationCount: medicationsToRemind.length,
        medications: medicationsToRemind.map(m => ({
          id: m.id,
          name: m.name,
          dose: m.dose
        }))
      }
    )
    
    if (result.success) {
      console.log(`✓ Reminder sent to ${user.name}`)
    } else {
      console.error(`✗ Failed to send reminder to ${user.name}:`, result.error)
    }
    
  } catch (error) {
    console.error(`Error processing user ${userId}:`, error)
  }
}

/**
 * Run initial check on startup
 */
export function startScheduler() {
  console.log('🚀 Medication Reminder Scheduler started')
  console.log(`Server time: ${new Date().toLocaleString('ru-RU')}`)
  console.log('Checking reminders every minute...\n')
  
  // Run initial check
  checkMedicationReminders()
}

