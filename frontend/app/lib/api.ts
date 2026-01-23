const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function apiFetch(url: string, options: any = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const res = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: "include", // ✅ IMPORTANT
  });

  return res;
}
