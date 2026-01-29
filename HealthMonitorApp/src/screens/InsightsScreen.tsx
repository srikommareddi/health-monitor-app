import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { fetchInsight } from '../services/api';

export default function InsightsScreen() {
  const { accessToken } = useAuth();
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestInsight = async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const data = await fetchInsight(accessToken, {
        metric_name: 'glucose',
        metric_value: 118,
        trend: 'rising',
        notes: 'Post lunch check-in.',
        context: { meal: 'salad', activity: 'light walk' },
      });
      setSummary(data.summary);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Insights</Text>
      <Text style={styles.subtitle}>Pull a quick recommendation from the backend.</Text>

      <Pressable style={styles.button} onPress={requestInsight} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Generate insight</Text>}
      </Pressable>

      {summary ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Latest summary</Text>
          <Text style={styles.cardText}>{summary}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, fontWeight: '600', marginBottom: 14 },
  button: { backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  card: { marginTop: 20, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  cardText: { fontSize: 14, fontWeight: '600' },
});
