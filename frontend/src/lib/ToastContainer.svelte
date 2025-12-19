<script>
  import { toastStore } from './toastStore.js'
  import Toast from './Toast.svelte'
</script>

<div class="toast-container">
  {#each $toastStore as toast (toast.id)}
    <Toast 
      message={toast.message} 
      type={toast.type} 
      duration={toast.duration}
      onClose={() => {}}
    />
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 9999;
  }
  
  .toast-container :global(.toast) {
    pointer-events: all;
  }
</style>

