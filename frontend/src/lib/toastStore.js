import { writable } from 'svelte/store'

function createToastStore() {
  const { subscribe, update } = writable([])
  
  let idCounter = 0
  
  return {
    subscribe,
    show: (message, type = 'info', duration = 3000) => {
      const id = idCounter++
      const toast = { id, message, type, duration }
      
      update(toasts => [...toasts, toast])
      
      setTimeout(() => {
        update(toasts => toasts.filter(t => t.id !== id))
      }, duration + 300)
    },
    success: (message, duration) => {
      return createToastStore().show(message, 'success', duration)
    },
    error: (message, duration) => {
      return createToastStore().show(message, 'error', duration)
    },
    warning: (message, duration) => {
      return createToastStore().show(message, 'warning', duration)
    },
    info: (message, duration) => {
      return createToastStore().show(message, 'info', duration)
    }
  }
}

export const toastStore = createToastStore()

