<script>
  import { onMount } from 'svelte'
  import { activeUserId } from '../lib/stores.js'
  import { schedulesApi, medicationsApi } from '../lib/api.js'

  let schedules = []
  let medications = []
  let loading = true
  let error = null
  let showModal = false
  let editingSchedule = null

  let formData = {
    medication_id: '',
    time: '',
    quantity: ''
  }

  onMount(() => {
    loadData()
  })

  $: if ($activeUserId) {
    loadData()
  }

  async function loadData() {
    if (!$activeUserId) return

    try {
      loading = true
      error = null
      const [schedData, medData] = await Promise.all([
        schedulesApi.getByUser($activeUserId),
        medicationsApi.getByUser($activeUserId)
      ])
      schedules = schedData
      medications = medData.filter(m => m.active)
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  function openCreateModal() {
    editingSchedule = null
    formData = {
      medication_id: medications[0]?.id || '',
      time: '08:00',
      quantity: ''
    }
    showModal = true
  }

  function openEditModal(schedule) {
    editingSchedule = schedule
    formData = {
      medication_id: schedule.medication_id,
      time: schedule.time,
      quantity: schedule.quantity || ''
    }
    showModal = true
  }

  async function handleSubmit() {
    try {
      if (editingSchedule) {
        await schedulesApi.update(editingSchedule.id, { 
          time: formData.time,
          quantity: formData.quantity 
        })
      } else {
        await schedulesApi.create(formData)
      }
      showModal = false
      await loadData()
    } catch (err) {
      error = err.message
    }
  }

  async function handleDelete(id) {
    if (confirm('Вы уверены, что хотите удалить это расписание?')) {
      try {
        await schedulesApi.delete(id)
        await loadData()
      } catch (err) {
        error = err.message
      }
    }
  }

  function getMedicationName(medId) {
    const med = medications.find(m => m.id === medId)
    return med ? med.name : 'Unknown'
  }

  function groupSchedulesByTime() {
    const grouped = {}
    schedules.forEach(schedule => {
      if (!grouped[schedule.time]) {
        grouped[schedule.time] = []
      }
      grouped[schedule.time].push(schedule)
    })
    return Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))
  }
</script>

<div class="card">
  <div class="card-header">
    <h2 class="card-title">Расписание приёма</h2>
    <button class="btn btn-primary" onclick={openCreateModal} disabled={medications.length === 0}>
      + Добавить расписание
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if medications.length === 0 && !loading}
    <div class="empty-state">
      <div class="empty-state-icon">💊</div>
      <div class="empty-state-text">Нет активных лекарств</div>
      <p style="color: var(--text-light);">Добавьте лекарства, чтобы создать расписание</p>
    </div>
  {:else if loading}
    <div class="loading">Загрузка расписания...</div>
  {:else if schedules.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">⏰</div>
      <div class="empty-state-text">Пока нет расписания</div>
      <button class="btn btn-primary" onclick={openCreateModal}>
        Создать первое расписание
      </button>
    </div>
  {:else}
    {#each groupSchedulesByTime() as [time, timeSchedules]}
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.5rem; margin-bottom: 1rem; color: var(--primary);">
          🕐 {time}
        </h3>
        <ul class="list">
          {#each timeSchedules as schedule (schedule.id)}
            <li class="list-item">
              <div class="list-item-content">
                <div style="font-weight: 500; margin-bottom: 0.25rem;">
                  {schedule.medications?.name || getMedicationName(schedule.medication_id)}
                </div>
                <div style="color: var(--text-light); font-size: 0.875rem;">
                  {#if schedule.quantity}
                    <strong style="color: var(--primary);">{schedule.quantity}</strong>
                    {#if schedule.medications?.dose}
                      <span style="color: var(--text-light);"> • {schedule.medications?.dose}</span>
                    {/if}
                  {:else}
                    {schedule.medications?.dose || ''}
                  {/if}
                </div>
              </div>
              <div class="list-item-actions">
                <button class="btn btn-secondary btn-small" onclick={() => openEditModal(schedule)}>
                  Изменить время
                </button>
                <button class="btn btn-danger btn-small" onclick={() => handleDelete(schedule.id)}>
                  Удалить
                </button>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
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
        <h3 class="modal-title">{editingSchedule ? 'Редактировать расписание' : 'Добавить расписание'}</h3>
        <button class="modal-close" onclick={() => showModal = false}>×</button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {#if !editingSchedule}
          <div class="input-group">
            <label for="medication">Лекарство *</label>
            <select id="medication" bind:value={formData.medication_id} required>
              {#each medications as med}
                <option value={med.id}>{med.name} - {med.dose}</option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="input-group">
          <label for="time">Время * (24-часовой формат)</label>
          <input 
            id="time"
            type="time" 
            bind:value={formData.time} 
            required 
          />
        </div>

        <div class="input-group">
          <label for="quantity">Количество (опционально)</label>
          <input 
            id="quantity"
            type="text" 
            bind:value={formData.quantity} 
            placeholder="например, 1 таблетка, 2 капсулы, 5 капель"
          />
          <small style="color: var(--text-light);">
            Если не указано, будет использоваться дозировка из лекарства
          </small>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>
            Отмена
          </button>
          <button type="submit" class="btn btn-primary">
            {editingSchedule ? 'Обновить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  @media (max-width: 768px) {
    h3 {
      font-size: 1.25rem !important;
    }
  }

  @media (max-width: 480px) {
    h3 {
      font-size: 1.1rem !important;
    }

    .list-item-content > div:first-child {
      font-size: 0.95rem;
    }

    .list-item-content > div:last-child {
      font-size: 0.8rem;
    }
  }
</style>

