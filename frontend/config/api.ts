export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export const API_ENDPOINTS = {
  auth: {
    login: `${API_BASE_URL}/api/auth/login`,
    signup: `${API_BASE_URL}/api/auth/signup`,
    me: `${API_BASE_URL}/api/auth/user/me`,
  },
  invoices: {
    list: `${API_BASE_URL}/api/invoices`,
    counts: `${API_BASE_URL}/api/invoices/counts`,
    byId: (id: string) => `${API_BASE_URL}/api/invoices/${id}`,
    review: (id: string) => `${API_BASE_URL}/api/invoices/${id}/review`,
    file: (id: string, token: string) =>
      `${API_BASE_URL}/api/invoices/${id}/file?token=${token}`,
  },
  upload: `${API_BASE_URL}/api/upload`,
  reports: {
    export: `${API_BASE_URL}/api/reports/export`,
  },
} as const;
