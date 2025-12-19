<script>
  import { onMount } from 'svelte'

  let loading = true
  let error = null
  let instructions = null
  let userId = null

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  onMount(() => {
    // Получаем userId из URL
    const params = new URLSearchParams(window.location.search)
    userId = params.get('userId')
    
    if (!userId) {
      error = 'Не указан ID пользователя. Добавьте ?userId=XXX к URL'
      loading = false
      return
    }

    loadInstructions()
  })

  async function loadInstructions() {
    if (!userId) return

    try {
      loading = true
      error = null
      const response = await fetch(`${API_URL}/api/instructions/${userId}`)
      if (!response.ok) throw new Error('Ошибка загрузки данных')
      instructions = await response.json()
    } catch (err) {
      error = err.message
    } finally {
      loading = false
    }
  }

  function getCycleStatusText(cycle) {
    if (!cycle || !cycle.enabled) return null
    
    const status = cycle.status
    if (!status) return null

    if (status.phase === 'taking') {
      return `День ${status.dayInCycle} из ${status.totalTakeDays} (приём)`
    } else if (status.phase === 'resting') {
      return `День ${status.dayInCycle} из ${status.totalRestDays} (перерыв)`
    } else if (status.phase === 'not_started') {
      return `Начало через ${status.daysUntilStart} дн.`
    }
    return null
  }

  function getCycleBadgeClass(cycle) {
    if (!cycle || !cycle.status) return 'badge-secondary'
    if (cycle.status.phase === 'taking') return 'badge-success'
    if (cycle.status.phase === 'resting') return 'badge-warning'
    return 'badge-secondary'
  }

  function printInstructions() {
    window.print()
  }
</script>

<div class="instructions-page">
  {#if instructions}
    <button class="print-fab" onclick={printInstructions} title="Печать">
      🖨️
    </button>
  {/if}

  <div class="card">
    <div class="card-header">
      <h2 class="card-title">📋 Инструкция по приёму лекарств</h2>
    </div>

    {#if loading}
      <div class="loading">
        <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
        <div>Загрузка инструкции...</div>
      </div>
    {:else if error}
      <div class="error">{error}</div>
    {:else if instructions}
      <!-- User info -->
      <div class="user-info-card">
        <div class="user-info-header">
          <h3>Пациент</h3>
        </div>
        <div class="user-info-body">
          <div class="info-row">
            <span class="info-label">Имя:</span>
            <span class="info-value">{instructions.user.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">WhatsApp:</span>
            <span class="info-value">{instructions.user.whatsapp_number}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Часовой пояс:</span>
            <span class="info-value">{instructions.user.timezone}</span>
          </div>
        </div>
      </div>

      {#if instructions.medications.length === 0}
        <div class="empty-state">
          <div class="empty-state-icon">💊</div>
          <div class="empty-state-text">Нет активных лекарств</div>
          <p style="color: var(--text-light);">
            Добавьте лекарства на странице "Лекарства"
          </p>
        </div>
      {:else}
        <!-- Medications list -->
        <div class="medications-instructions">
          <h3 class="section-title">
            Лекарства ({instructions.medications.length})
          </h3>

          {#each instructions.medications as med, index}
            <div class="medication-instruction-card">
              <div class="med-instruction-header">
                <div class="med-number">{index + 1}</div>
                <div class="med-main-info">
                  <h4 class="med-instruction-name">{med.name}</h4>
                  <div class="med-instruction-dose">📋 {med.dose}</div>
                </div>
                {#if med.image_url}
                  <img src={med.image_url} alt={med.name} class="med-instruction-image" />
                {/if}
              </div>

              <div class="med-instruction-body">
                <!-- Schedule -->
                {#if med.schedules.length > 0}
                  <div class="instruction-section">
                    <div class="instruction-label">⏰ Расписание приёма:</div>
                    <div class="schedule-times">
                      {#each med.schedules as schedule}
                        <span class="time-badge">{schedule.time}</span>
                      {/each}
                    </div>
                  </div>
                {:else}
                  <div class="instruction-section">
                    <div class="instruction-label">⏰ Расписание:</div>
                    <div class="no-schedule">Расписание не установлено</div>
                  </div>
                {/if}

                <!-- Cycle -->
                {#if med.cycle}
                  <div class="instruction-section">
                    <div class="instruction-label">🔄 Цикл приёма:</div>
                    {#if med.cycle.enabled}
                      <div class="cycle-info-detailed">
                        <div class="cycle-params">
                          <span>Приём: <strong>{med.cycle.take_days} дней</strong></span>
                          <span>Перерыв: <strong>{med.cycle.rest_days} дней</strong></span>
                          <span>Начало: <strong>{new Date(med.cycle.cycle_start).toLocaleDateString('ru-RU')}</strong></span>
                        </div>
                        {#if med.cycle.status}
                          <div class="cycle-current-status">
                            <span class="badge {getCycleBadgeClass(med.cycle)}">
                              {getCycleStatusText(med.cycle)}
                            </span>
                            {#if med.cycle.status.phase === 'taking'}
                              <span class="status-hint">✓ Сегодня принимать</span>
                            {:else if med.cycle.status.phase === 'resting'}
                              <span class="status-hint">⏸ Сегодня перерыв</span>
                            {/if}
                          </div>
                        {/if}
                      </div>
                    {:else}
                      <div class="cycle-disabled">Цикл отключён</div>
                    {/if}
                  </div>
                {:else}
                  <div class="instruction-section">
                    <div class="instruction-label">🔄 Цикл:</div>
                    <div class="no-cycle">
                      <span class="badge badge-secondary">📅 Ежедневно</span>
                      <span class="no-cycle-text">Принимать каждый день</span>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>

        <!-- Footer info -->
        <div class="instructions-footer">
          <p>
            <strong>Важно:</strong> Эта инструкция актуальна на момент просмотра.
            Всегда следуйте рекомендациям врача.
          </p>
          <p class="generated-date">
            Создано: {new Date(instructions.generated_at).toLocaleString('ru-RU')}
          </p>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .instructions-page {
    max-width: 900px;
    margin: 0 auto;
  }

  .user-info-card {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
    color: white;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .user-info-header h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    opacity: 0.9;
  }

  .user-info-body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  }

  .info-row:last-child {
    border-bottom: none;
  }

  .info-label {
    opacity: 0.9;
  }

  .info-value {
    font-weight: 600;
  }

  .section-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    color: var(--text);
  }

  .medications-instructions {
    margin-bottom: 2rem;
  }

  .medication-instruction-card {
    background: white;
    border: 2px solid var(--border);
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .med-instruction-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid var(--border);
  }

  .med-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .med-main-info {
    flex: 1;
  }

  .med-instruction-name {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.5rem 0;
    color: var(--text);
  }

  .med-instruction-dose {
    font-size: 1rem;
    color: var(--text-light);
  }

  .med-instruction-image {
    width: 100px;
    height: 100px;
    border-radius: 0.5rem;
    object-fit: cover;
    border: 2px solid var(--border);
    flex-shrink: 0;
  }

  .med-instruction-body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .instruction-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .instruction-label {
    font-weight: 600;
    font-size: 1.05rem;
    color: var(--text);
  }

  .schedule-times {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .time-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    background: var(--primary);
    color: white;
    border-radius: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .cycle-info-detailed {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
    border-left: 4px solid var(--primary);
  }

  .cycle-params {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 0.75rem;
    font-size: 0.95rem;
  }

  .cycle-current-status {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border);
  }

  .status-hint {
    font-size: 0.95rem;
    color: var(--text-light);
  }

  .badge-warning {
    background: var(--warning);
    color: white;
  }

  .no-schedule,
  .cycle-disabled,
  .no-cycle {
    color: var(--text-light);
    font-style: italic;
  }

  .no-cycle {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .no-cycle-text {
    font-size: 0.95rem;
  }

  .instructions-footer {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-top: 2rem;
  }

  .instructions-footer p {
    margin: 0 0 0.75rem 0;
    line-height: 1.6;
  }

  .instructions-footer p:last-child {
    margin-bottom: 0;
  }

  .generated-date {
    font-size: 0.875rem;
    color: var(--text-light);
  }

  @media (max-width: 768px) {
    .med-instruction-header {
      flex-wrap: wrap;
    }

    .med-instruction-image {
      width: 80px;
      height: 80px;
    }

    .med-instruction-name {
      font-size: 1.25rem;
    }

    .cycle-params {
      flex-direction: column;
      gap: 0.5rem;
    }

    .user-info-card {
      padding: 1rem;
    }
  }

  @media (max-width: 480px) {
    .medication-instruction-card {
      padding: 1rem;
    }

    .med-number {
      width: 32px;
      height: 32px;
      font-size: 1rem;
    }

    .med-instruction-name {
      font-size: 1.1rem;
    }

    .med-instruction-dose {
      font-size: 0.9rem;
    }

    .med-instruction-image {
      width: 70px;
      height: 70px;
    }

    .time-badge {
      font-size: 1rem;
      padding: 0.4rem 0.8rem;
    }
  }

  .print-fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--primary);
    color: white;
    border: none;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    font-size: 1.5rem;
    transition: all 0.3s;
    z-index: 100;
  }

  .print-fab:hover {
    background: var(--primary-dark);
    transform: scale(1.1);
  }

  .print-fab:active {
    transform: scale(0.95);
  }

  @media (max-width: 768px) {
    .print-fab {
      bottom: 1rem;
      right: 1rem;
      width: 48px;
      height: 48px;
      font-size: 1.25rem;
    }
  }

  @media print {
    .print-fab,
    .card-header button {
      display: none !important;
    }

    .medication-instruction-card {
      page-break-inside: avoid;
      box-shadow: none;
      border: 1px solid #000;
    }

    .instructions-page {
      max-width: 100%;
    }

    body {
      background: white;
    }

    .card {
      border: none;
      box-shadow: none;
    }
  }
</style>
