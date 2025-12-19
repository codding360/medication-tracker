<script>
  import { activeUserId } from '../lib/stores.js'

  function openInstructions() {
    if (!$activeUserId) {
      alert('Пожалуйста, выберите пользователя')
      return
    }
    
    const url = `/instructions.html?userId=${$activeUserId}`
    window.open(url, '_blank')
  }

  function copyLink() {
    if (!$activeUserId) {
      alert('Пожалуйста, выберите пользователя')
      return
    }
    
    const url = `${window.location.origin}/instructions.html?userId=${$activeUserId}`
    navigator.clipboard.writeText(url).then(() => {
      alert('Ссылка скопирована в буфер обмена!')
    })
  }
</script>

<div class="preview-page">
  <div class="card">
    <div class="card-header">
      <h2 class="card-title">📋 Инструкция по приёму лекарств</h2>
    </div>

    {#if !$activeUserId}
      <div class="empty-state">
        <div class="empty-state-icon">👤</div>
        <div class="empty-state-text">Выберите пользователя</div>
        <p style="color: var(--text-light);">
          Перейдите на страницу "Пользователи" и выберите пользователя
        </p>
      </div>
    {:else}
      <div class="preview-description">
        <p>
          Полная инструкция по приёму всех лекарств пациента открывается на отдельной странице.
          Эта страница содержит:
        </p>
        <ul>
          <li>✓ Все активные лекарства</li>
          <li>✓ Расписание приёма для каждого</li>
          <li>✓ Информацию о циклах</li>
          <li>✓ Текущий статус (сегодня принимать или перерыв)</li>
        </ul>
        <p>
          Вы можете открыть инструкцию, скопировать ссылку для отправки пациенту или распечатать.
        </p>
      </div>

      <div class="preview-actions">
        <button class="btn btn-primary btn-large" onclick={openInstructions}>
          📄 Открыть инструкцию
        </button>
        <button class="btn btn-secondary btn-large" onclick={copyLink}>
          🔗 Скопировать ссылку
        </button>
      </div>

      <div class="preview-hint">
        <div class="hint-icon">💡</div>
        <div class="hint-content">
          <strong>Совет:</strong> Скопируйте ссылку и отправьте пациенту через WhatsApp, 
          чтобы он всегда мог посмотреть свою инструкцию по приёму лекарств.
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .preview-page {
    max-width: 800px;
    margin: 0 auto;
  }

  .preview-description {
    background: #f8f9fa;
    padding: 1.5rem;
    border-radius: 0.5rem;
    margin-bottom: 2rem;
    line-height: 1.8;
  }

  .preview-description ul {
    margin: 1rem 0;
    padding-left: 1.5rem;
  }

  .preview-description li {
    margin: 0.5rem 0;
    font-size: 1.05rem;
  }

  .preview-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .btn-large {
    flex: 1;
    padding: 1rem 1.5rem;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .preview-hint {
    background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
    border-left: 4px solid var(--warning);
    padding: 1rem;
    border-radius: 0.5rem;
    display: flex;
    gap: 1rem;
    align-items: start;
  }

  .hint-icon {
    font-size: 2rem;
    flex-shrink: 0;
  }

  .hint-content {
    flex: 1;
    line-height: 1.6;
  }

  @media (max-width: 768px) {
    .preview-actions {
      flex-direction: column;
    }

    .btn-large {
      width: 100%;
    }
  }

  @media (max-width: 480px) {
    .preview-description {
      padding: 1rem;
      font-size: 0.95rem;
    }

    .preview-description li {
      font-size: 0.95rem;
    }

    .btn-large {
      font-size: 1rem;
      padding: 0.875rem 1.25rem;
    }

    .hint-icon {
      font-size: 1.5rem;
    }

    .hint-content {
      font-size: 0.9rem;
    }
  }
</style>
