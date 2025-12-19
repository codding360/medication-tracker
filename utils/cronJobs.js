/**
 * Cron Jobs Configuration
 * Defines all scheduled tasks for the application
 */

import cron from 'node-cron'
import { checkMedicationReminders } from '../services/scheduler.js'

/**
 * Initialize all cron jobs
 */
export function initializeCronJobs() {
  console.log('⏰ Initializing cron jobs...')
  
  // Check medication reminders every minute
  // Cron pattern: '* * * * *' = every minute
  const reminderJob = cron.schedule('* * * * *', async () => {
    await checkMedicationReminders()
  }, {
    scheduled: true,
    timezone: process.env.CRON_TIMEZONE || 'UTC'
  })
  
  console.log('✓ Medication reminder job scheduled (every minute)')
  console.log(`✓ Timezone: ${process.env.CRON_TIMEZONE || 'UTC'}`)
  
  // Optional: Daily summary at 20:00
  // const summaryJob = cron.schedule('0 20 * * *', async () => {
  //   console.log('Sending daily medication summary...')
  //   // TODO: Implement daily summary
  // }, {
  //   scheduled: true,
  //   timezone: process.env.CRON_TIMEZONE || 'UTC'
  // })
  
  // Return jobs for management
  return {
    reminderJob
    // summaryJob
  }
}

/**
 * Stop all cron jobs
 */
export function stopAllCronJobs(jobs) {
  console.log('Stopping all cron jobs...')
  
  if (jobs.reminderJob) {
    jobs.reminderJob.stop()
    console.log('✓ Reminder job stopped')
  }
  
  // if (jobs.summaryJob) {
  //   jobs.summaryJob.stop()
  //   console.log('✓ Summary job stopped')
  // }
}

/**
 * Get cron job status
 */
export function getCronJobStatus(jobs) {
  return {
    reminderJob: {
      running: jobs.reminderJob ? true : false,
      schedule: '* * * * *', // every minute
      description: 'Check and send medication reminders'
    }
  }
}

