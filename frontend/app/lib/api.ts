const ENV_API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return ENV_API_BASE_URL;
  }

  const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const envPointsToRemote = !ENV_API_BASE_URL.includes('localhost') && !ENV_API_BASE_URL.includes('127.0.0.1');

  // In local development, always use local backend so cookie auth works reliably.
  if (isLocalHost && envPointsToRemote) {
    return 'http://localhost:3000';
  }

  return ENV_API_BASE_URL;
}

export type ApiFetchOptions = RequestInit & {
  skipJsonContentType?: boolean;
};

export async function apiFetch(url: string, options: ApiFetchOptions = {}) {
  const apiBaseUrl = getApiBaseUrl();
  const hasAbsoluteUrl = url.startsWith('http');
  const fullUrl = hasAbsoluteUrl ? url : `${apiBaseUrl}${url}`;

  const headers = {
    ...(options.skipJsonContentType ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers || {}),
  };

  try {
    return await fetch(fullUrl, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch (error) {
    const isLocalHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const canFallback =
      !hasAbsoluteUrl &&
      isLocalHost &&
      apiBaseUrl !== 'http://localhost:3000';

    if (!canFallback) {
      throw error;
    }

    const fallbackUrl = `http://localhost:3000${url}`;
    return fetch(fallbackUrl, {
      ...options,
      headers,
      credentials: 'include',
    });
  }
}

export async function apiJson<T>(url: string, options: ApiFetchOptions = {}) {
  const response = await apiFetch(url, options);
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  return {
    response,
    payload: payload as T,
  };
}
