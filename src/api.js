const base = '/api'

async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`)
  }
  return data
}

export const api = {
  me: () => request('/auth/me'),
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  confirm: (token) => request('/auth/confirm', { method: 'POST', body: JSON.stringify({ token }) }),
  verifyOtp: (email, code) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) }),
  resend: (email) => request('/auth/resend', { method: 'POST', body: JSON.stringify({ email }) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  onboarding: (payload) => request('/auth/onboarding', { method: 'POST', body: JSON.stringify(payload) }),
  catalog: () => request('/catalog'),
  exportCatalog: () => request('/export/catalog'),
  exportProgress: () => request('/export/progress'),
  state: () => request('/state'),
  setProgress: (payload) => request('/progress', { method: 'POST', body: JSON.stringify(payload) }),
  adminStats: () => request('/admin/stats'),
  adminCatalog: () => request('/admin/catalog'),
  adminSaveResource: (payload) =>
    request('/admin/resources', { method: 'POST', body: JSON.stringify(payload) }),
  adminSavePath: (payload) =>
    request('/admin/paths', { method: 'POST', body: JSON.stringify(payload) }),
  adminUpload: (payload) =>
    request('/admin/upload', { method: 'POST', body: JSON.stringify(payload) }),
  adminDeleteResource: (id) =>
    request(`/admin/resources/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adminDeletePath: (id) => request(`/admin/paths/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  communityMessages: () => request('/community/messages'),
  postCommunityMessage: (payload) =>
    request('/community/messages', { method: 'POST', body: JSON.stringify(payload) }),
  uploadCommunityAttachment: (data) =>
    request('/community/attachments', { method: 'POST', body: JSON.stringify({ data }) }),
  deleteCommunityMessage: (id) =>
    request(`/community/messages/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  attachmentUrl: (id) => `${base}/community/attachments/${encodeURIComponent(id)}`,
}
