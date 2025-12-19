<script>
  import { onMount } from 'svelte'
  import { activeUserId } from '../lib/stores.js'
  import { medicationsApi } from '../lib/api.js'

  let medications = []
  let loading = true
  let error = null
  let showModal = false
  let editingMed = null
  let uploading = false

  let formData = {
    name: '',
    dose: '',
    image_url: '',
    active: true
  }

  onMount(() => {
    loadMedications()
  })

  $: if ($activeUserId) {
    loadMedications()
  }

  async function loadMedications() {
    if (!$activeUserId) return

    try {
      loading = true
      error = null
      medications = await medicationsApi.getByUser($activeUserId)
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  function openCreateModal() {
    editingMed = null
    formData = {
      name: '',
      dose: '',
      image_url: '',
      active: true
    }
    showModal = true
  }

  function openEditModal(med) {
    editingMed = med
    formData = {
      name: med.name,
      dose: med.dose,
      image_url: med.image_url,
      active: med.active
    }
    showModal = true
  }

  async function handleFileUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      uploading = true
      const result = await medicationsApi.uploadImage(file)
      formData.image_url = result.image_url
    } catch (err) {
      error = 'Ошибка загрузки изображения: ' + err.message
    } finally {
      uploading = false
    }
  }

  async function handleSubmit() {
    try {
      if (!formData.image_url) {
        error = 'Изображение обязательно'
        return
      }

      if (editingMed) {
        await medicationsApi.update(editingMed.id, formData)
      } else {
        await medicationsApi.create({
          ...formData,
          user_id: $activeUserId
        })
      }
      showModal = false
      await loadMedications()
    } catch (err) {
      error = err.message
    }
  }

  async function handleDelete(id) {
    if (confirm('Вы уверены, что хотите удалить это лекарство?')) {
      try {
        await medicationsApi.delete(id)
        await loadMedications()
      } catch (err) {
        error = err.message
      }
    }
  }

  async function toggleActive(med) {
    try {
      await medicationsApi.update(med.id, { active: !med.active })
      await loadMedications()
    } catch (err) {
      error = err.message
    }
  }
</script>

<div class="card">
  <div class="card-header">
    <h2 class="card-title">Лекарства</h2>
    <button class="btn btn-primary" onclick={openCreateModal}>
      + Добавить лекарство
    </button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  {#if loading}
    <div class="loading">Загрузка лекарств...</div>
  {:else if medications.length === 0}
    <div class="empty-state">
      <div class="empty-state-icon">💊</div>
      <div class="empty-state-text">Пока нет лекарств</div>
      <button class="btn btn-primary" onclick={openCreateModal}>
        Добавить первое лекарство
      </button>
    </div>
  {:else}
    <div class="grid">
      {#each medications as med (med.id)}
        <div class="med-card">
          {#if med.image_url}
            <img src={med.image_url} alt={med.name} class="med-card-image" />
          {:else}
            <div class="med-card-image" style="display: flex; align-items: center; justify-content: center; color: var(--text-light);">
              Нет изображения
            </div>
          {/if}
          
          <div class="med-card-header">
            <div>
              <div class="med-card-title">{med.name}</div>
              <div class="med-card-dose">{med.dose}</div>
            </div>
            <span class="badge {med.active ? 'badge-success' : 'badge-secondary'}">
              {med.active ? 'Активно' : 'Неактивно'}
            </span>
          </div>

          <div class="med-card-actions">
            <button 
              class="btn btn-small {med.active ? 'btn-secondary' : 'btn-success'}" 
              onclick={() => toggleActive(med)}
            >
              {med.active ? 'Отключить' : 'Включить'}
            </button>
            <button class="btn btn-secondary btn-small" onclick={() => openEditModal(med)}>
              Редактировать
            </button>
            <button class="btn btn-danger btn-small" onclick={() => handleDelete(med.id)}>
              Удалить
            </button>
          </div>
        </div>
      {/each}
    </div>
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
        <h3 class="modal-title">{editingMed ? 'Редактировать лекарство' : 'Добавить лекарство'}</h3>
        <button class="modal-close" onclick={() => showModal = false}>×</button>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div class="input-group">
          <label for="name">Название *</label>
          <input 
            id="name"
            type="text" 
            bind:value={formData.name} 
            required 
            placeholder="например, Такролимус"
          />
        </div>

        <div class="input-group">
          <label for="dose">Дозировка *</label>
          <input 
            id="dose"
            type="text" 
            bind:value={formData.dose} 
            required 
            placeholder="например, 1 таблетка (5 мг)"
          />
        </div>

        <div class="input-group">
          <label for="image">Изображение * {uploading ? '(Загрузка...)' : ''}</label>
          <div class="file-input-wrapper">
            <button type="button" class="btn btn-secondary" disabled={uploading}>
              {formData.image_url ? 'Изменить изображение' : 'Выбрать изображение'}
            </button>
            <input 
              id="image"
              type="file" 
              accept="image/*"
              onchange={handleFileUpload}
              disabled={uploading}
            />
          </div>
          {#if formData.image_url}
            <img src={formData.image_url} alt="Превью" class="medication-image" style="margin-top: 0.5rem;" />
          {/if}
        </div>

        <div class="checkbox-group">
          <input 
            id="active"
            type="checkbox" 
            bind:checked={formData.active}
          />
          <label for="active">Активно</label>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick={() => showModal = false}>
            Отмена
          </button>
          <button type="submit" class="btn btn-primary" disabled={uploading || !formData.image_url}>
            {editingMed ? 'Обновить' : 'Добавить'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  @media (max-width: 480px) {
    .med-card-title {
      font-size: 1rem !important;
    }

    .med-card-dose {
      font-size: 0.8rem !important;
    }

    .med-card {
      padding: 0.875rem !important;
    }

    .med-card-image {
      height: 140px !important;
    }

    .med-card-actions {
      gap: 0.4rem !important;
    }

    .med-card-actions .btn {
      font-size: 0.75rem;
      padding: 0.4rem 0.6rem;
    }
  }
</style>

