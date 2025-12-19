<script>
  import { onMount } from 'svelte'
  
  export let message = ''
  export let type = 'info' // info, success, error, warning
  export let duration = 3000
  export let onClose = () => {}
  
  let visible = false
  
  onMount(() => {
    visible = true
    
    const timer = setTimeout(() => {
      visible = false
      setTimeout(onClose, 300) // Wait for fade out animation
    }, duration)
    
    return () => clearTimeout(timer)
  })
</script>

{#if visible}
  <div class="toast toast-{type}" class:visible>
    <div class="toast-content">
      <span class="toast-icon">
        {#if type === 'success'}✓{/if}
        {#if type === 'error'}✕{/if}
        {#if type === 'warning'}⚠{/if}
        {#if type === 'info'}ℹ{/if}
      </span>
      <span class="toast-message">{message}</span>
    </div>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 1rem 1.5rem;
    z-index: 9999;
    opacity: 0;
    transition: all 0.3s ease;
    max-width: 90vw;
    min-width: 250px;
  }
  
  .toast.visible {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  
  .toast-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .toast-icon {
    font-size: 1.25rem;
    font-weight: bold;
  }
  
  .toast-message {
    font-size: 0.95rem;
    flex: 1;
  }
  
  .toast-success {
    background: #10b981;
    color: white;
  }
  
  .toast-error {
    background: #ef4444;
    color: white;
  }
  
  .toast-warning {
    background: #f59e0b;
    color: white;
  }
  
  .toast-info {
    background: #3b82f6;
    color: white;
  }

  @media (max-width: 640px) {
    .toast {
      bottom: 1rem;
      min-width: unset;
      width: calc(100vw - 2rem);
    }
  }
</style>

