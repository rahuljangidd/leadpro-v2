import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/me/password', data),
};

export const leadsAPI = {
  getAll: (params) => api.get('/leads', { params }),
  get: (id) => api.get(`/leads/${id}`),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  delete: (id) => api.delete(`/leads/${id}`),
};

export const interactionsAPI = {
  create: (leadId, data) => api.post(`/interactions/lead/${leadId}`, data),
  uploadImages: (interactionId, formData) =>
    api.post(`/interactions/${interactionId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateImageCaption: (interactionId, imageId, data) =>
    api.put(`/interactions/${interactionId}/images/${imageId}`, data),
  deleteImage: (interactionId, imageId) =>
    api.delete(`/interactions/${interactionId}/images/${imageId}`),
  delete: (id) => api.delete(`/interactions/${id}`),
};

export const remindersAPI = {
  getAll: (params) => api.get('/reminders', { params }),
  create: (leadId, data) => api.post(`/reminders/lead/${leadId}`, data),
  complete: (id) => api.put(`/reminders/${id}/done`),
  delete: (id) => api.delete(`/reminders/${id}`),
};

export const attachmentsAPI = {
  upload: (leadId, formData) =>
    api.post(`/attachments/lead/${leadId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  delete: (id) => api.delete(`/attachments/${id}`),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const dashboardAPI = {
  stats: () => api.get('/dashboard/stats'),
  activity: () => api.get('/dashboard/activity'),
};

export const masterlistAPI = {
  getAll: (params) => api.get('/master-items', { params }),
  create: (data) => api.post('/master-items', data),
  update: (id, data) => api.put(`/master-items/${id}`, data),
  delete: (id) => api.delete(`/master-items/${id}`),
};

export const projectsAPI = {
  getAll: (params) => api.get('/projects', { params }),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  addPaymentMilestone: (id, data) => api.post(`/projects/${id}/payment-schedule`, data),
  updateMilestone: (pmId, data) => api.put(`/projects/payment-schedule/${pmId}`, data),
  uploadSiteImages: (id, formData) =>
    api.post(`/projects/${id}/site-images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  deleteSiteImage: (projectId, imageId) =>
    api.delete(`/projects/${projectId}/site-images/${imageId}`),
  getDesign: (id) => api.get(`/projects/${id}/design`),
  addDesignPhase: (id, data) => api.post(`/projects/${id}/design/phases`, data),
  updateDesignPhase: (projectId, phaseId, data) =>
    api.put(`/projects/${projectId}/design/phases/${phaseId}`, data),
  uploadDesignImages: (projectId, phaseId, formData) =>
    api.post(`/projects/${projectId}/design/phases/${phaseId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateDesignImage: (projectId, imageId, data) =>
    api.put(`/projects/${projectId}/design/images/${imageId}`, data),
};

export const quotationsAPI = {
  getAll: (params) => api.get('/quotations', { params }),
  get: (id) => api.get(`/quotations/${id}`),
  create: (data) => api.post('/quotations', data),
  update: (id, data) => api.put(`/quotations/${id}`, data),
  submit: (id) => api.post(`/quotations/${id}/submit`),
  approve: (id, data) => api.post(`/quotations/${id}/approve`, data),
  reject: (id, data) => api.post(`/quotations/${id}/reject`, data),
  markSent: (id) => api.post(`/quotations/${id}/mark-sent`),
  markSigned: (id) => api.post(`/quotations/${id}/mark-signed`),
  newVersion: (id) => api.post(`/quotations/${id}/new-version`),
  saveSignoff: (id, data) => api.post(`/quotations/${id}/signoff`, data),
};

export const financeAPI = {
  getEntries: (params) => api.get('/finance/entries', { params }),
  createEntry: (formData) =>
    api.post('/finance/entries', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  updateEntry: (id, data) => api.put(`/finance/entries/${id}`, data),
  voidEntry: (id, data) => api.post(`/finance/entries/${id}/void`, data),
  getLedger: (params) => api.get('/finance/ledger', { params }),
  getParties: () => api.get('/finance/parties'),
  getFixedCosts: (params) => api.get('/finance/fixed-costs', { params }),
  createFixedCost: (data) => api.post('/finance/fixed-costs', data),
  updateFixedCost: (id, data) => api.put(`/finance/fixed-costs/${id}`, data),
  deleteFixedCost: (id) => api.delete(`/finance/fixed-costs/${id}`),
  getMonthly: (params) => api.get('/finance/monthly', { params }),
};
