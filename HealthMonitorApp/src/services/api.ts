import { API_BASE_URL } from '../config';

export async function fetchInsight(accessToken: string, payload: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}/v1/insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Failed to fetch insight');
  }

  return response.json();
}

export type HealthMetric = {
  id: number;
  metric_type: string;
  value: number;
  unit?: string | null;
  recorded_at: string;
};

export async function fetchLatestMetrics(accessToken: string, limit = 20, metricType?: string) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));
  if (metricType) {
    params.set('metric_type', metricType);
  }
  const response = await fetch(`${API_BASE_URL}/v1/metrics/latest?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Failed to fetch metrics');
  }

  return (await response.json()) as HealthMetric[];
}

export type EhrConnectionStatus = {
  connected: boolean;
  patient_id?: string | null;
  fhir_base_url?: string | null;
  expires_at?: string | null;
};

export type EhrVital = {
  id: string;
  name: string;
  value: string;
  unit?: string | null;
  recorded_at?: string | null;
};

export async function fetchEhrAuthUrl(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/v1/ehr/auth-url`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Failed to start EHR connection');
  }

  return response.json() as Promise<{ url: string; state: string }>;
}

export async function fetchEhrConnection(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/v1/ehr/connection`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Failed to fetch EHR status');
  }

  return response.json() as Promise<EhrConnectionStatus>;
}

export async function fetchEhrVitals(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/v1/ehr/vitals`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Failed to fetch vitals');
  }

  return response.json() as Promise<EhrVital[]>;
}

export async function disconnectEhr(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/v1/ehr/disconnect`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Failed to disconnect EHR');
  }

  return response.json();
}
