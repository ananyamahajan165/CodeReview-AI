import api from './api'

export const authService = {
  register: (data) => api.post('/auth/register', data).then((r) => r.data),
  login: (data) => api.post('/auth/login', data).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data.user),
}
export const reviewService = {
  create: (data) => api.post('/reviews', data).then((r) => r.data.review),
  list: (params) => api.get('/reviews', { params }).then((r) => r.data),
  get: (id) => api.get(`/reviews/${id}`).then((r) => r.data.review),
  remove: (id) => api.delete(`/reviews/${id}`).then((r) => r.data),
}
export const dashboardService = { stats: () => api.get('/dashboard/stats').then((r) => r.data.stats) }
export const userService = {
  profile: () => api.get('/users/profile').then((r) => r.data.user),
  update: (data) => api.put('/users/profile', data).then((r) => r.data.user),
}
