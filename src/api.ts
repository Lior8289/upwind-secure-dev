const API_URL = "http://localhost:3001";

function getToken(): string | null {
  return localStorage.getItem("token");
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

async function handleResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function getEvents() {
  const res = await fetch(`${API_URL}/api/events`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getEvent(id: string) {
  const res = await fetch(`${API_URL}/api/events/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getUsers() {
  const res = await fetch(`${API_URL}/api/users`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createUser(user: { email: string; password: string; role: string }) {
  const res = await fetch(`${API_URL}/api/users`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(user),
  });
  return handleResponse(res);
}

export async function updateUser(id: string, updates: { role?: string; status?: string }) {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  return handleResponse(res);
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_URL}/api/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return handleResponse(res);
}
