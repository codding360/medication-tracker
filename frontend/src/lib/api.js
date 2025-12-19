const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }

  return response.json()
}

// Users API
export const usersApi = {
  getAll: () => request('/api/users'),
  getOne: (id) => request(`/api/users/${id}`),
  create: (data) => request('/api/users', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => request(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => request(`/api/users/${id}`, { method: 'DELETE' })
}

// Medications API
export const medicationsApi = {
  getByUser: (userId) => request(`/api/medications/user/${userId}`),
  getOne: (id) => request(`/api/medications/${id}`),
  create: (data) => request('/api/medications', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => request(`/api/medications/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => request(`/api/medications/${id}`, { method: 'DELETE' }),
  uploadImage: async (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${API_URL}/api/medications/upload`, {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      throw new Error('Upload failed')
    }
    
    return response.json()
  }
}

// Schedules API
export const schedulesApi = {
  getByMedication: (medicationId) => request(`/api/schedules/medication/${medicationId}`),
  getByUser: (userId) => request(`/api/schedules/user/${userId}`),
  getOne: (id) => request(`/api/schedules/${id}`),
  create: (data) => request('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => request(`/api/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => request(`/api/schedules/${id}`, { method: 'DELETE' })
}

// Cycles API
export const cyclesApi = {
  getByMedication: (medicationId) => request(`/api/cycles/medication/${medicationId}`),
  getByUser: (userId) => request(`/api/cycles/user/${userId}`),
  getOne: (id) => request(`/api/cycles/${id}`),
  create: (data) => request('/api/cycles', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => request(`/api/cycles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => request(`/api/cycles/${id}`, { method: 'DELETE' })
}

// Preview API
export const previewApi = {
  get: (userId, time) => request(`/api/preview/${userId}?time=${time}`)
}

