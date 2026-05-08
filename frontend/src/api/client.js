const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('recall_token');
}

export function setToken(token) {
  localStorage.setItem('recall_token', token);
}

export function setEmail(email) {
  localStorage.setItem('recall_email', email);
}

export function getEmail() {
  return localStorage.getItem('recall_email');
}

export function setOnboardingComplete(val) {
  localStorage.setItem('recall_onboarding', val ? '1' : '0');
}

export function isOnboardingComplete() {
  return localStorage.getItem('recall_onboarding') === '1';
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace('.', '');
}

export function clearToken() {
  localStorage.removeItem('recall_token');
  localStorage.removeItem('recall_email');
}

export function isAuthenticated() {
  return !!getToken();
}

async function request(path, options = {}, skipRetry = false) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  // Attach token synchronously as requested
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (path === '/home' && !skipRetry) {
      console.warn('[API] 401 on /home, retrying in 500ms...');
      await new Promise(r => setTimeout(r, 500));
      return request(path, options, true); // Retry once
    }
    
    clearToken();
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Auth
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  setEmail(data.email);
  setOnboardingComplete(data.onboarding_complete);
  return data;
}

export async function register(email, password) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  setEmail(data.email);
  setOnboardingComplete(data.onboarding_complete);
  return data;
}

// Home (Dashboard)
export function getHome() {
  return request('/home');
}

// Library
export function getLibrary() {
  return request('/library');
}

export function getTopicStats() {
  return request('/stats/topics');
}

// Content
export function getContentDetail(contentId) {
  return request(`/content/${contentId}`);
}

export function deleteContent(contentId) {
  return request(`/content/${contentId}`, {
    method: 'DELETE',
  });
}

export async function ingestUrl(url) {
  return request('/content/ingest', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}

export function getRelatedContent(contentId) {
  return request(`/content/${contentId}/related`);
}

// Quiz
export function getContentQuestions(contentId) {
  return request(`/content/${contentId}/questions`);
}

export function recordQuiz(questionId, wasCorrect) {
  return request('/review/record', {
    method: 'POST',
    body: JSON.stringify({ question_id: questionId, was_correct: wasCorrect }),
  });
}

// Search
export function searchContent(query) {
  return request(`/search?q=${encodeURIComponent(query)}`);
}

// Highlights
export function saveHighlight(contentId, text, source) {
  return request(`/content/${contentId}/highlights`, {
    method: 'POST',
    body: JSON.stringify({ text, source }),
  });
}

export function getContentHighlights(contentId) {
  return request(`/content/${contentId}/highlights`);
}

export function getAllHighlights() {
  return request('/highlights');
}

export function deleteHighlight(contentId, highlightId) {
  return request(`/content/${contentId}/highlights/${highlightId}`, {
    method: 'DELETE',
  });
}

// Notes
export function getNotes() {
  return request('/notes');
}

export function createNote(title, body) {
  return request('/notes', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
}

export function updateNote(noteId, title, body) {
  return request(`/notes/${noteId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, body }),
  });
}

export function deleteNote(noteId) {
  return request(`/notes/${noteId}`, {
    method: 'DELETE',
  });
}
