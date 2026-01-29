import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import GlucoseCard from '../components/GlucoseCard';

type GlucoseReading = {
  timestamp: Date;
  value: number;
};

type StatsPeriod = '24h' | '7d' | '30d';

export default function GlucoseScreen() {
  const isDark = useColorScheme() === 'dark';
  const [currentGlucose, setCurrentGlucose] = useState(112);
  const [glucoseHistory, setGlucoseHistory] = useState<GlucoseReading[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<StatsPeriod>('24h');

  // Initialize history with some mock data
  useEffect(() => {
    const now = Date.now();
    const mockHistory: GlucoseReading[] = [];

    // Generate 24 hours of data (every 15 minutes)
    for (let i = 96; i >= 0; i--) {
      const timestamp = new Date(now - i * 15 * 60 * 1000);
      const baseValue = 110;
      const variation = Math.sin(i / 10) * 20 + Math.random() * 15;
      const value = Math.round(baseValue + variation);
      mockHistory.push({ timestamp, value });
    }

    setGlucoseHistory(mockHistory);
  }, []);

  // Simulate live glucose updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentGlucose((prev) => {
        const change = (Math.random() - 0.5) * 10;
        const newValue = Math.max(70, Math.min(220, prev + change));
        return Math.round(newValue);
      });

      setGlucoseHistory((prev) => {
        const newReading: GlucoseReading = {
          timestamp: new Date(),
          value: currentGlucose,
        };
        return [...prev.slice(-96), newReading]; // Keep last 24 hours
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [currentGlucose]);

  const theme = useMemo(
    () =>
      isDark
        ? {
            bg: '#0B0B0F',
            cardBg: '#111827',
            border: '#1F2937',
            text: '#F9FAFB',
            subtext: '#9CA3AF',
          }
        : {
            bg: '#FFFFFF',
            cardBg: '#F3F4F6',
            border: '#E5E7EB',
            text: '#111827',
            subtext: '#6B7280',
          },
    [isDark]
  );

  const getStatusText = (value: number): string => {
    if (value < 70) return 'Low';
    if (value < 100) return 'Normal';
    if (value < 140) return 'Elevated';
    if (value < 180) return 'High';
    return 'Very High';
  };

  const stats = useMemo(() => {
    if (glucoseHistory.length === 0) {
      return { avg: 0, min: 0, max: 0, inRange: 0 };
    }

    const values = glucoseHistory.map((r) => r.value);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const inRangeCount = values.filter((v) => v >= 70 && v <= 180).length;
    const inRange = Math.round((inRangeCount / values.length) * 100);

    return { avg, min, max, inRange };
  }, [glucoseHistory]);

  const sparkData = useMemo(() => {
    return glucoseHistory.slice(-24).map((r) => r.value);
  }, [glucoseHistory]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>
            Glucose Monitoring
          </Text>
          <Text style={[styles.subtitle, { color: theme.subtext }]}>
            Real-time tracking and analytics
          </Text>
        </View>

        <View style={styles.cardContainer}>
          <GlucoseCard
            current={currentGlucose}
            unit="mg/dL"
            sparkData={sparkData}
            statusText={getStatusText(currentGlucose)}
          />
        </View>

        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Statistics (24h)
          </Text>

          <View style={styles.statsGrid}>
            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.subtext }]}>
                Average
              </Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stats.avg}
              </Text>
              <Text style={[styles.statUnit, { color: theme.subtext }]}>
                mg/dL
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.subtext }]}>
                Time in Range
              </Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stats.inRange}%
              </Text>
              <Text style={[styles.statUnit, { color: theme.subtext }]}>
                70-180 mg/dL
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.subtext }]}>
                Lowest
              </Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stats.min}
              </Text>
              <Text style={[styles.statUnit, { color: theme.subtext }]}>
                mg/dL
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.statLabel, { color: theme.subtext }]}>
                Highest
              </Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {stats.max}
              </Text>
              <Text style={[styles.statUnit, { color: theme.subtext }]}>
                mg/dL
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.rangesSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Target Ranges
          </Text>

          <View
            style={[
              styles.rangeCard,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
            ]}
          >
            <View style={styles.rangeRow}>
              <View style={[styles.rangeBadge, { backgroundColor: '#27AE60' }]} />
              <Text style={[styles.rangeText, { color: theme.text }]}>
                Normal: 70-140 mg/dL
              </Text>
            </View>

            <View style={styles.rangeRow}>
              <View style={[styles.rangeBadge, { backgroundColor: '#F2994A' }]} />
              <Text style={[styles.rangeText, { color: theme.text }]}>
                Elevated: 140-180 mg/dL
              </Text>
            </View>

            <View style={styles.rangeRow}>
              <View style={[styles.rangeBadge, { backgroundColor: '#EB5757' }]} />
              <Text style={[styles.rangeText, { color: theme.text }]}>
                High: {'>'} 180 mg/dL or {'<'} 70 mg/dL
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoSection}>
          <Text style={[styles.infoText, { color: theme.subtext }]}>
            Data updates every 3 seconds. Readings are for demonstration purposes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  cardContainer: {
    marginBottom: 24,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: (Dimensions.get('window').width - 48) / 2,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  rangesSection: {
    marginBottom: 24,
  },
  rangeCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rangeBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    marginBottom: 20,
  },
  infoText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});
