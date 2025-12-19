/**
 * Notifications Service
 * Handles sending notifications via different channels (WhatsApp, Email, etc.)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * Convert E.164 phone number to Green-API chatId format
 * Example: +996700112233 → 996700112233@c.us
 */
function phoneNumberToChatId(phoneNumber) {
  // Remove + and any non-digit characters
  const digits = phoneNumber.replace(/\D/g, '')
  return `${digits}@c.us`
}

/**
 * Send WhatsApp image with caption via Green-API
 * 
 * @param {string} phoneNumber - WhatsApp number in E.164 format
 * @param {string} imageUrl - URL изображения
 * @param {string} caption - Подпись к изображению
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendWhatsAppImage(phoneNumber, imageUrl, caption = '') {
  try {
    const apiUrl = process.env.GREEN_API_URL
    const idInstance = process.env.GREEN_API_ID_INSTANCE
    const apiToken = process.env.GREEN_API_TOKEN_INSTANCE
    
    if (!apiUrl || !idInstance || !apiToken) {
      console.log('⚠️  Green-API not configured. Image not sent.')
      return { success: false, error: 'Green-API not configured' }
    }
    
    const chatId = phoneNumberToChatId(phoneNumber)
    const url = `${apiUrl}/waInstance${idInstance}/sendFileByUrl/${apiToken}`
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: chatId,
        urlFile: imageUrl,
        fileName: 'medication.jpg',
        caption: caption
      })
    })
    
    const responseData = await response.json()
    
    if (!response.ok) {
      throw new Error(`Green-API error: ${JSON.stringify(responseData)}`)
    }
    
    console.log(`   ✓ Image sent: ${imageUrl.substring(0, 50)}...`)
    
    return {
      success: true,
      messageId: responseData.idMessage || null,
      response: responseData
    }
    
  } catch (error) {
    console.error(`   ✗ Error sending image: ${error.message}`)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Send WhatsApp notification to user via Green-API
 * 
 * @param {string} phoneNumber - WhatsApp number in E.164 format (+996700112233)
 * @param {string} message - Message text
 * @param {Object} metadata - Additional metadata (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendWhatsAppMessage(phoneNumber, message, metadata = {}) {
  try {
    console.log('='.repeat(60))
    console.log('📱 WHATSAPP MESSAGE (Green-API)')
    console.log('='.repeat(60))
    console.log(`To: ${phoneNumber}`)
    console.log(`Time: ${new Date().toLocaleString('ru-RU')}`)
    console.log('-'.repeat(60))
    console.log(message)
    console.log('='.repeat(60))
    
    // Check if Green-API is configured
    const apiUrl = process.env.GREEN_API_URL
    const idInstance = process.env.GREEN_API_ID_INSTANCE
    const apiToken = process.env.GREEN_API_TOKEN_INSTANCE
    
    if (!apiUrl || !idInstance || !apiToken) {
      console.log('⚠️  Green-API not configured. Message logged only.')
      console.log('   Set GREEN_API_URL, GREEN_API_ID_INSTANCE, GREEN_API_TOKEN_INSTANCE in .env')
      console.log('='.repeat(60))
      
      // Log to database
      await logNotification({
        user_id: metadata.userId,
        channel: 'whatsapp',
        recipient: phoneNumber,
        message: message,
        status: 'pending',
        error: 'Green-API not configured',
        metadata: metadata
      })
      
      return {
        success: false,
        error: 'Green-API not configured'
      }
    }
    
    // Convert phone number to chatId format
    const chatId = phoneNumberToChatId(phoneNumber)
    console.log(`ChatId: ${chatId}`)
    
    // Build Green-API URL
    const url = `${apiUrl}/waInstance${idInstance}/sendMessage/${apiToken}`
    
    // Send message via Green-API
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatId: chatId,
        message: message
      })
    })
    
    const responseData = await response.json()
    
    if (!response.ok) {
      throw new Error(`Green-API error: ${JSON.stringify(responseData)}`)
    }
    
    console.log('✓ Message sent successfully!')
    console.log('Response:', responseData)
    console.log('='.repeat(60))
    
    // Log notification to database
    await logNotification({
      user_id: metadata.userId,
      channel: 'whatsapp',
      recipient: phoneNumber,
      message: message,
      status: 'sent',
      metadata: {
        ...metadata,
        greenApiResponse: responseData
      }
    })
    
    return {
      success: true,
      messageId: responseData.idMessage || null,
      response: responseData
    }
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error)
    
    // Log failed notification
    await logNotification({
      user_id: metadata.userId,
      channel: 'whatsapp',
      recipient: phoneNumber,
      message: message,
      status: 'failed',
      error: error.message,
      metadata: metadata
    })
    
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Format medication caption for WhatsApp image
 */
export function formatMedicationCaption(med, time) {
  const lines = []
  
  lines.push(`💊 *${med.name}*`)
  lines.push('')
  lines.push(`⏰ Время приёма: *${time}*`)
  lines.push('')
  
  // Используем quantity если есть, иначе dose
  const dosage = med.quantity || med.dose
  lines.push(`📋 Доза: ${dosage}`)
  
  if (med.cycleStatus) {
    if (med.cycleStatus.phase === 'taking') {
      lines.push('')
      lines.push(`🔄 День ${med.cycleStatus.dayInCycle} из ${med.cycleStatus.totalTakeDays} (приём)`)
      lines.push(`✅ Сегодня принимать`)
    } else if (med.cycleStatus.phase === 'resting') {
      lines.push('')
      lines.push(`⏸ День ${med.cycleStatus.dayInCycle} из ${med.cycleStatus.totalRestDays} (перерыв)`)
    }
  } else {
    lines.push('')
    lines.push(`📅 Принимать ежедневно`)
  }
  
  lines.push('')
  lines.push(`_Не забудьте принять лекарство вовремя!_`)
  
  return lines.join('\n')
}

/**
 * Log notification to database
 */
export async function logNotification(data) {
  try {
    const { error } = await supabase
      .from('notifications_log')
      .insert([{
        user_id: data.user_id,
        channel: data.channel,
        recipient: data.recipient,
        message: data.message,
        status: data.status,
        error: data.error || null,
        metadata: data.metadata || {},
        sent_at: new Date().toISOString()
      }])
    
    if (error) {
      console.error('Error logging notification:', error)
    }
  } catch (error) {
    console.error('Error in logNotification:', error)
  }
}

/**
 * Get notification history for user
 */
export async function getNotificationHistory(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('notifications_log')
      .select('*')
      .eq('user_id', userId)
      .order('sent_at', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting notification history:', error)
    return []
  }
}

