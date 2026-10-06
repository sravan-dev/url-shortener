export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
  return data;
}

export const api = {
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  listLinks: (search = '') => request(`/links${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  createLink: (payload) => request('/links', { method: 'POST', body: payload }),
  updateLink: (id, payload) => request(`/links/${id}`, { method: 'PATCH', body: payload }),
  deleteLink: (id) => request(`/links/${id}`, { method: 'DELETE' }),
};
