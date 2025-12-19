<script>
  import { activeUserId, activeUser } from './lib/stores.js'
  import { usersApi } from './lib/api.js'
  import { toastStore } from './lib/toastStore.js'
  import ToastContainer from './lib/ToastContainer.svelte'
  
  import UsersPage from './pages/UsersPage.svelte'
  import MedicationsPage from './pages/MedicationsPage.svelte'
  import SchedulesPage from './pages/SchedulesPage.svelte'
  import CyclesPage from './pages/CyclesPage.svelte'
  import PreviewPage from './pages/PreviewPage.svelte'

  let currentPage = 'users'

  $: if ($activeUserId) {
    loadUser()
  }

  async function loadUser() {
    if ($activeUserId) {
      try {
        const user = await usersApi.getOne($activeUserId)
        activeUser.set(user)
      } catch (error) {
        console.error('Failed to load user:', error)
      }
    }
  }

  function changePage(page) {
    if (!$activeUserId && page !== 'users') {
      toastStore.show('Пожалуйста, сначала выберите пользователя', 'warning')
      return
    }
    currentPage = page
  }
</script>

<div class="app">
  <header class="header">
    <div class="header-content">
      <div class="logo">💊 Трекер лекарств</div>
      <nav class="nav">
        <button 
          class="nav-btn" 
          class:active={currentPage === 'users'}
          onclick={() => changePage('users')}
        >
          Пользователи
        </button>
        <button 
          class="nav-btn" 
          class:active={currentPage === 'medications'}
          onclick={() => changePage('medications')}
          disabled={!$activeUserId}
        >
          Лекарства
        </button>
        <button 
          class="nav-btn" 
          class:active={currentPage === 'schedules'}
          onclick={() => changePage('schedules')}
          disabled={!$activeUserId}
        >
          Расписание
        </button>
        <button 
          class="nav-btn" 
          class:active={currentPage === 'cycles'}
          onclick={() => changePage('cycles')}
          disabled={!$activeUserId}
        >
          Циклы
        </button>
        <button 
          class="nav-btn" 
          class:active={currentPage === 'preview'}
          onclick={() => changePage('preview')}
          disabled={!$activeUserId}
        >
          Превью
        </button>
      </nav>
    </div>
  </header>

  <main class="container">
    {#if $activeUser}
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong>Активный пользователь:</strong> {$activeUser.name}
            <span style="color: var(--text-light); margin-left: 1rem;">
              {$activeUser.whatsapp_number} • {$activeUser.timezone}
            </span>
          </div>
          <button class="btn btn-secondary btn-small" onclick={() => { 
            activeUserId.set(null) 
            changePage('users')} }
            disabled={!$activeUserId}
          >
            Сменить
          </button>
        </div>
      </div>
    {/if}

    {#if currentPage === 'users'}
      <UsersPage />
    {:else if currentPage === 'medications'}
      <MedicationsPage />
    {:else if currentPage === 'schedules'}
      <SchedulesPage />
    {:else if currentPage === 'cycles'}
      <CyclesPage />
    {:else if currentPage === 'preview'}
      <PreviewPage />
    {/if}
  </main>
</div>

<ToastContainer />

