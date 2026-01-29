import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import {
  disconnectEhr,
  fetchEhrAuthUrl,
  fetchEhrConnection,
  fetchEhrVitals,
  type EhrConnectionStatus,
  type EhrVital,
} from '../services/api';

function formatTimestamp(timestamp?: string | null) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return date.toLocaleString();
}

export default function EHRConnectScreen() {
  const { accessToken } = useAuth();
  const [status, setStatus] = useState<EhrConnectionStatus | null>(null);
  const [vitals, setVitals] = useState<EhrVital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isFetchingVitals, setIsFetchingVitals] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchEhrConnection(accessToken);
      setStatus(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load EHR status.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleConnect = useCallback(async () => {
    if (!accessToken) return;
    setIsConnecting(true);
    setError(null);
    try {
      const { url } = await fetchEhrAuthUrl(accessToken);
      await Linking.openURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to start connection.';
      setError(message);
    } finally {
      setIsConnecting(false);
    }
  }, [accessToken]);

  const handleDisconnect = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      await disconnectEhr(accessToken);
      setStatus({ connected: false });
      setVitals([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to disconnect.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const handleFetchVitals = useCallback(async () => {
    if (!accessToken) return;
    setIsFetchingVitals(true);
    setError(null);
    try {
      const data = await fetchEhrVitals(accessToken);
      setVitals(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load vitals.';
      setError(message);
    } finally {
      setIsFetchingVitals(false);
    }
  }, [accessToken]);

  const statusText = useMemo(() => {
    if (!status) return 'Checking connection...';
    return status.connected ? 'Connected to EHR' : 'Not connected';
  }, [status]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EHR Connect</Text>
      <Text style={styles.subtitle}>Link to Epic SMART on FHIR and pull vitals.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{statusText}</Text>
        {status?.connected ? (
          <>
            <Text style={styles.meta}>FHIR base: {status.fhir_base_url ?? 'Unknown'}</Text>
            <Text style={styles.meta}>Patient: {status.patient_id ?? 'Unknown'}</Text>
            <Text style={styles.meta}>Token expires: {formatTimestamp(status.expires_at)}</Text>
          </>
        ) : (
          <Text style={styles.meta}>
            Tap Connect, complete the Epic login in your browser, then return here and refresh.
          </Text>
        )}

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Connect</Text>}
          </Pressable>
          <Pressable style={styles.button} onPress={refreshStatus} disabled={isLoading}>
            {isLoading ? <ActivityIndicator /> : <Text style={styles.buttonText}>Refresh</Text>}
          </Pressable>
          {status?.connected ? (
            <Pressable style={[styles.button, styles.destructiveButton]} onPress={handleDisconnect} disabled={isLoading}>
              <Text style={styles.destructiveText}>Disconnect</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.vitalsHeader}>
          <Text style={styles.label}>Latest vitals</Text>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={handleFetchVitals}
            disabled={!status?.connected || isFetchingVitals}
          >
            {isFetchingVitals ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Pull vitals</Text>}
          </Pressable>
        </View>

        {!status?.connected ? <Text style={styles.meta}>Connect to load vitals.</Text> : null}
        {status?.connected && vitals.length === 0 && !isFetchingVitals ? (
          <Text style={styles.meta}>No vitals pulled yet.</Text>
        ) : null}

        {vitals.map((vital) => (
          <View key={vital.id} style={styles.vitalRow}>
            <View>
              <Text style={styles.vitalName}>{vital.name}</Text>
              <Text style={styles.vitalMeta}>{formatTimestamp(vital.recorded_at)}</Text>
            </View>
            <Text style={styles.vitalValue}>
              {vital.value}
              {vital.unit ? ` ${vital.unit}` : ''}
            </Text>
          </View>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, fontWeight: '600', marginBottom: 16, color: '#6B7280' },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 6 },
  value: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  meta: { fontSize: 11, fontWeight: '600', color: '#6B7280', marginBottom: 4 },
  buttonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  button: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  primaryButton: { backgroundColor: '#111827', borderColor: '#111827' },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  buttonText: { color: '#111827', fontWeight: '700', fontSize: 12 },
  destructiveButton: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  destructiveText: { color: '#991B1B', fontWeight: '700', fontSize: 12 },
  vitalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  vitalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  vitalName: { fontSize: 13, fontWeight: '700' },
  vitalMeta: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  vitalValue: { fontSize: 14, fontWeight: '800' },
  errorText: { color: '#B91C1C', fontWeight: '700' },
});
