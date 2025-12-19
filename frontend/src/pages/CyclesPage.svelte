<script>
  import { onMount } from 'svelte'
  import { activeUserId } from '../lib/stores.js'
  import { cyclesApi, medicationsApi } from '../lib/api.js'

  let cycles = []
  let medications = []
  let loading = true
  let error = null
  let showModal = false
  let editingCycle = null

  let formData = {
    medication_id: '',
    take_days: 21,
    rest_days: 7,
    cycle_start: new Date().toISOString().split('T')[0],
    enabled: true
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
      const [cyclesData, medData] = await Promise.all([
        cyclesApi.getByUser($activeUserId),
        medicationsApi.getByUser($activeUserId)
      ])
      cycles = cyclesData
      medications = medData.filter(m => m.active)
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  function openCreateModal() {
    editingCycle = null
    formData = {
      medication_id: medications[0]?.id || '',
      take_days: 21,
      rest_days: 7,
      cycle_start: new Date().toISOString().split('T')[0],
      enabled: true
    }
    showModal = true
  }

  function openEditModal(cycle) {
    editingCycle = cycle
    formData = {
      medication_id: cycle.medication_id,
      take_days: cycle.take_days,
      rest_days: cycle.rest_days,
      cycle_start: cycle.cycle_start,
      enabled: cycle.enabled
    }
    showModal = true
  }

  async function handleSubmit() {
    try {
      if (editingCycle) {
        await cyclesApi.update(editingCycle.id, {
          take_days: parseInt(formData.take_days),
          rest_days: parseInt(formData.rest_days),
          cycle_start: formData.cycle_start,
          enabled: formData.enabled
        })
      } else {
        await cyclesApi.create({
          ...formData,
          take_days: parseInt(formData.take_days),
          rest_days: parseInt(formData.rest_days)
        })
      }
      showModal = false
      await loadData()
    } catch (err) {
      error = err.message
    }
  }

  async function handleDelete(id) {
    if (confirm('Вы уверены, что хотите удалить этот цикл?')) {
      try {
        await cyclesApi.delete(id)
        await loadData()
      } catch (err) {
        error = err.message
      }
    }
  }

  async function toggleEnabled(cycle) {
    try {
      await cyclesApi.update(cycle.id, { enabled: !cycle.enabled })
      await loadData()
    } catch (err) {
      error = err.message
    }
  }

  function getMedicationName(medId) {
    const med = medications.find(m => m.id === medId)
    return med ? med.name : cycles.find(c => c.medication_id === medId)?.medications?.name || 'Unknown'
  }

  function calculateCurrentStatus(cycle) {
    const today = new Date()
    const startDate = new Date(cycle.cycle_start)
    const daysSinceStart = Math.floor((today - startDate) / (1000 * 60 * 60 * 24))
    
    if (daysSinceStart < 0) {
      return { phase: 'Not started', daysRemaining: Math.abs(daysSinceStart) }
    }

    const cycleLength = cycle.take_days + cycle.rest_days
    const dayInCycle = daysSinceStart % cycleLength

    if (dayInCycle < cycle.take_days) {
      return { 
        phase: 'Taking', 
        daysRemaining: cycle.take_days - dayInCycle 
      }
    } else {
      return { 
        phase: 'Resting', 
        daysRemaining: cycleLength - dayInCycle 
      }
    }
  }
</script>

<div class="card">
  <div class="card-header">
    <h2 class="card-title">Циклы приёма</h2>
    <button class="btn btn-primary" onclick={openCreateModal} disabled={medications.length === 0}>
      + Добавить цикл
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if medications.length === 0 && !loading}
    <div class="empty-state">
      <div class="empty-state-icon">💊</div>
      <div class="empty-state-text">Нет активных лекарств</div>
      <p style="color: var(--text-light);">Добавьте лекарства, чтобы создать циклы</p>
    </div>
  {:else if loading}
    <div class="loading">Загрузка циклов...</div>
  {:else if cycles.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">🔄</div>
      <div class="empty-state-text">Пока нет циклов</div>
      <button class="btn btn-primary" onclick={openCreateModal}>
        Создать первый цикл
      </button>
    </div>
  {:else}
    <ul class="list">
      {#each cycles as cycle (cycle.id)}
        {@const status = calculateCurrentStatus(cycle)}
        <li class="list-item cycle-item">
          <div class="list-item-content">
            <div class="cycle-header">
              <strong class="cycle-name">
                {getMedicationName(cycle.medication_id)}
              </strong>
              <div class="cycle-badges">
                <span class="badge {cycle.enabled ? 'badge-success' : 'badge-secondary'}">
                  {cycle.enabled ? 'Активен' : 'Отключён'}
                </span>
                {#if cycle.enabled}
                  <span class="badge badge-warning">
                    {status.phase === 'Taking' ? 'Приём' : status.phase === 'Resting' ? 'Перерыв' : status.phase} - осталось {status.daysRemaining} дн.
                  </span>
                {/if}
              </div>
            </div>
            <div class="cycle-info">
              📅 Приём: {cycle.take_days} дн. • Перерыв: {cycle.rest_days} дн. • 
              Начало: {new Date(cycle.cycle_start).toLocaleDateString('ru-RU')}
            </div>
          </div>
          <div class="list-item-actions">
            <button 
              class="btn btn-small {cycle.enabled ? 'btn-secondary' : 'btn-success'}" 
              onclick={() => toggleEnabled(cycle)}
            >
              {cycle.enabled ? 'Отключить' : 'Включить'}
            </button>
            <button class="btn btn-secondary btn-small" onclick={() => openEditModal(cycle)}>
              Редактировать
            </button>
            <button class="btn btn-danger btn-small" onclick={() => handleDelete(cycle.id)}>
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
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <div class="modal-header">
        <h3 class="modal-title">{editingCycle ? 'Редактировать цикл' : 'Добавить цикл'}</h3>
        <button class="modal-close" onclick={() => showModal = false}>×</button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        {#if !editingCycle}
          <div class="input-group">
            <label for="medication">Лекарство *</label>
            <select id="medication" bind:value={formData.medication_id} required>
              {#each medications as med}
                <option value={med.id}>{med.name}</option>
              {/each}
            </select>
          </div>
        {/if}

        <div class="input-group">
          <label for="take_days">Дни приёма *</label>
          <input 
            id="take_days"
            type="number" 
            bind:value={formData.take_days} 
            required 
            min="1"
            placeholder="например, 21"
          />
        </div>

        <div class="input-group">
          <label for="rest_days">Дни перерыва *</label>
          <input 
            id="rest_days"
            type="number" 
            bind:value={formData.rest_days} 
            required 
            min="0"
            placeholder="например, 7"
          />
        </div>

        <div class="input-group">
          <label for="cycle_start">Дата начала цикла *</label>
          <input 
            id="cycle_start"
            type="date" 
            bind:value={formData.cycle_start} 
            required 
          />
        </div>

        <div class="checkbox-group">
          <input 
            id="enabled"
            type="checkbox" 
            bind:checked={formData.enabled}
          />
          <label for="enabled">Включён</label>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>
            Отмена
          </button>
          <button type="submit" class="btn btn-primary">
            {editingCycle ? 'Обновить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .cycle-item {
    position: relative;
  }

  .cycle-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
    flex-wrap: wrap;
  }

  .cycle-name {
    font-size: 1.125rem;
    flex: 1;
    min-width: 150px;
  }

  .cycle-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .cycle-info {
    color: var(--text-light);
    font-size: 0.875rem;
    word-break: break-word;
  }

  .badge-warning {
    background: var(--warning);
    color: white;
  }

  @media (max-width: 768px) {
    .cycle-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .cycle-name {
      font-size: 1rem;
      min-width: unset;
      width: 100%;
    }

    .cycle-badges {
      width: 100%;
    }

    .cycle-info {
      font-size: 0.8rem;
      line-height: 1.6;
    }
  }

  @media (max-width: 480px) {
    .cycle-name {
      font-size: 0.95rem;
    }

    .cycle-badges {
      flex-direction: column;
      align-items: flex-start;
    }

    .cycle-badges .badge {
      display: block;
      width: fit-content;
    }

    .cycle-info {
      font-size: 0.75rem;
    }
  }
</style>

