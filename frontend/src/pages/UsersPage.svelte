<script>
  import { onMount } from 'svelte'
  import { activeUserId } from '../lib/stores.js'
  import { usersApi } from '../lib/api.js'

  let users = []
  let loading = true
  let error = null
  let showModal = false
  let editingUser = null

  let formData = {
    name: '',
    whatsapp_number: '',
    timezone: 'UTC'
  }

  const timezones = [
    'UTC',
    'Asia/Kolkata',
    'Asia/Bishkek',
    'Europe/Moscow',
    'Europe/London',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]

  onMount(() => {
    loadUsers()
  })

  async function loadUsers() {
    try {
      loading = true
      error = null
      users = await usersApi.getAll()
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  function openCreateModal() {
    editingUser = null
    formData = {
      name: '',
      whatsapp_number: '',
      timezone: 'UTC'
    }
    showModal = true
  }

  function openEditModal(user) {
    editingUser = user
    formData = {
      name: user.name,
      whatsapp_number: user.whatsapp_number,
      timezone: user.timezone
    }
    showModal = true
  }

  async function handleSubmit() {
    try {
      if (editingUser) {
        await usersApi.update(editingUser.id, formData)
      } else {
        await usersApi.create(formData)
      }
      showModal = false
      await loadUsers()
    } catch (err) {
      error = err.message
    }
  }

  async function handleDelete(id) {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      try {
        await usersApi.delete(id)
        if ($activeUserId === id) {
          activeUserId.set(null)
        }
        await loadUsers()
      } catch (err) {
        error = err.message
      }
    }
  }

  function selectUser(id) {
    activeUserId.set(id)
  }
</script>

<div class="card">
  <div class="card-header">
    <h2 class="card-title">Пользователи</h2>
    <button class="btn btn-primary" onclick={openCreateModal}>
      + Создать пользователя
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if loading}
    <div class="loading">Загрузка пользователей...</div>
  {:else if users.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">👤</div>
      <div class="empty-state-text">Пока нет пользователей</div>
      <button class="btn btn-primary" onclick={openCreateModal}>
        Создать первого пользователя
      </button>
    </div>
  {:else}
    <ul class="list">
      {#each users as user (user.id)}
        <li class="list-item" class:active={$activeUserId === user.id}>
          <div class="list-item-content">
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem;">
              <strong style="font-size: 1.125rem;">{user.name}</strong>
              {#if $activeUserId === user.id}
                <span class="badge badge-success">Активен</span>
              {/if}
            </div>
            <div style="color: var(--text-light); font-size: 0.875rem;">
              📱 {user.whatsapp_number} • 🌍 {user.timezone}
            </div>
          </div>
          <div class="list-item-actions">
            {#if $activeUserId !== user.id}
              <button class="btn btn-primary btn-small" onclick={() => selectUser(user.id)}>
                Выбрать
              </button>
            {/if}
            <button class="btn btn-secondary btn-small" onclick={() => openEditModal(user)}>
              Редактировать
            </button>
            <button class="btn btn-danger btn-small" onclick={() => handleDelete(user.id)}>
              Удалить
            </button>
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</div>

{#if showModal}
  <div 
    class="modal-overlay" 
    role="button" 
    tabindex="0"
    onclick={() => showModal = false}
    onkeydown={(e) => e.key === 'Escape' && (showModal = false)}
  >
    <div 
      class="modal" 
      role="dialog"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <h3 class="modal-title">{editingUser ? 'Редактировать пользователя' : 'Создать пользователя'}</h3>
        <button class="modal-close" onclick={() => showModal = false}>×</button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div class="input-group">
          <label for="name">Имя *</label>
          <input 
            id="name"
            type="text" 
            bind:value={formData.name} 
            required 
            placeholder="Введите имя"
          />
        </div>

        <div class="input-group">
          <label for="whatsapp">Номер WhatsApp * (формат E.164)</label>
          <input 
            id="whatsapp"
            type="tel" 
            bind:value={formData.whatsapp_number} 
            required 
            placeholder="+996509690790"
          />
          <small style="color: var(--text-light);">Формат: +[код страны][номер]</small>
        </div>

        <div class="input-group">
          <label for="timezone">Часовой пояс *</label>
          <select id="timezone" bind:value={formData.timezone} required>
            {#each timezones as tz}
              <option value={tz}>{tz}</option>
            {/each}
          </select>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>
            Отмена
          </button>
          <button type="submit" class="btn btn-primary">
            {editingUser ? 'Обновить' : 'Создать'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .list-item.active {
    border-color: var(--primary);
    background: rgba(59, 130, 246, 0.05);
  }

  @media (max-width: 480px) {
    .list-item-content > div:first-child {
      flex-direction: column;
      align-items: flex-start !important;
      gap: 0.5rem !important;
    }

    .list-item-content strong {
      font-size: 1rem !important;
    }

    .list-item-content > div:last-child {
      font-size: 0.8rem !important;
      line-height: 1.5;
    }
  }
</style>

