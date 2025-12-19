/**
 * Medication Reminder Scheduler
 * Checks schedules every minute and sends notifications
 */

import { createClient } from '@supabase/supabase-js'
import { sendWhatsAppMessage, sendWhatsAppImage, formatMedicationCaption, logNotification } from './notifications.js'
import { DateTime } from 'luxon'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const TIMEZONE = process.env.CRON_TIMEZONE || 'UTC'

/**
 * Check and send medication reminders for current time
 */
export async function checkMedicationReminders() {
  try {
    // Получаем текущее время в нужном часовом поясе
    const now = DateTime.now().setZone(TIMEZONE)
    const currentTime = now.toFormat('HH:mm')
    const currentDate = now.toISODate() // YYYY-MM-DD
    
    console.log(`\n🔔 Checking reminders for ${currentTime} (${TIMEZONE})...`)
    console.log(`   Date: ${now.toLocaleString(DateTime.DATETIME_FULL)}...`)
    
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
    const today = DateTime.now().setZone(TIMEZONE)
    const medicationsToRemind = []
    
    for (const schedule of schedules) {
      const medication = schedule.medications
      const cycle = cycles?.find(c => c.medication_id === medication.id)
      
      let shouldRemind = true
      let cycleStatus = null
      
      if (cycle) {
        const startDate = DateTime.fromISO(cycle.cycle_start, { zone: TIMEZONE })
        const daysSinceStart = Math.floor(today.diff(startDate, 'days').days)
        
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
          quantity: schedule.quantity, // Добавляем quantity из расписания
          cycleStatus
        })
      }
    }
    
    if (medicationsToRemind.length === 0) {
      console.log('No medications to remind (all in rest phase or disabled)')
      return
    }
    
    console.log(`${medicationsToRemind.length} medication(s) to remind`)
    
    let successCount = 0
    let failCount = 0
    
    // Send each medication with image
    for (let i = 0; i < medicationsToRemind.length; i++) {
      const med = medicationsToRemind[i]
      
      // Небольшая задержка между сообщениями (чтобы они шли по порядку)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
      
      if (med.image_url) {
        console.log(`   📸 Sending image ${i + 1}/${medicationsToRemind.length}: ${med.name}...`)
        
        const caption = formatMedicationCaption(med, time)
        
        const imageResult = await sendWhatsAppImage(
          user.whatsapp_number,
          med.image_url,
          caption
        )
        
        if (imageResult.success) {
          successCount++
          
          // Log to database
          await logNotification({
            user_id: user.id,
            channel: 'whatsapp',
            recipient: user.whatsapp_number,
            message: caption,
            status: 'sent',
            metadata: {
              medicationId: med.id,
              medicationName: med.name,
              time: time,
              hasImage: true,
              imageUrl: med.image_url
            }
          })
        } else {
          failCount++
          console.error(`   ✗ Failed to send image for ${med.name}`)
        }
      } else {
        // Если нет изображения, отправляем текстовое сообщение
        console.log(`   💬 Sending text ${i + 1}/${medicationsToRemind.length}: ${med.name}...`)
        
        const medMessage = formatMedicationCaption(med, time)
        
        const textResult = await sendWhatsAppMessage(
          user.whatsapp_number,
          medMessage,
          {
            userId: user.id,
            medicationId: med.id,
            medicationName: med.name,
            time: time,
            hasImage: false
          }
        )
        
        if (textResult.success) {
          successCount++
        } else {
          failCount++
        }
      }
    }
    
    console.log(`✓ Reminder complete for ${user.name}: ${successCount} sent, ${failCount} failed`)
    
  } catch (error) {
    console.error(`Error processing user ${userId}:`, error)
  }
}

/**
 * Run initial check on startup
 */
export function startScheduler() {
  const now = DateTime.now().setZone(TIMEZONE)
  
  console.log('🚀 Medication Reminder Scheduler started')
  console.log(`Server time: ${now.toLocaleString(DateTime.DATETIME_FULL)}`)
  console.log(`Timezone: ${TIMEZONE}`)
  console.log('Checking reminders every minute...\n')
  
  // Run initial check
  checkMedicationReminders()
}

