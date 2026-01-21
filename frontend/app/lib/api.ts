export async function apiFetch(url: string, options: any = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // ✅ IMPORTANT
  });

  return res;
}
