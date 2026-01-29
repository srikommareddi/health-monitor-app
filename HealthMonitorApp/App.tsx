/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, { useEffect, useMemo, useState } from 'react';


import { StatusBar, StyleSheet, useColorScheme, View, Text, Pressable } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import GlucoseScreen from './screens/GlucoseScreen';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import InsightsScreen from './src/screens/InsightsScreen';
import LiveSessionScreen from './src/screens/LiveSessionScreen';
import JoinRoomScreen from './src/screens/JoinRoomScreen';
import EHRConnectScreen from './src/screens/EHRConnectScreen';
import { RootStackParamList } from './src/navigation/types';

type Trend = 'Rising' | 'Falling' | 'Stable';
type Zone = 'Rest' | 'Fat Burn' | 'Cardio' | 'Peak';

const Stack = createNativeStackNavigator<RootStackParamList>();

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function computeTrend(prev: number, next: number): Trend {
  const d = next - prev;
  if (Math.abs(d) <= 2) return 'Stable';
  return d > 0 ? 'Rising' : 'Falling';
}

function computeZone(hr: number): Zone {
  if (hr < 85) return 'Rest';
  if (hr < 110) return 'Fat Burn';
  if (hr < 140) return 'Cardio';
  return 'Peak';
}

function fmtTime(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}


function Card({
  title,
  value,
  subtitle,
  meta,
  onPress,
}: {
  title: string;
  value: string;
  subtitle: string;
  meta?: React.ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
      {meta ? <View style={{ marginTop: 10 }}>{meta}</View> : null}
      {onPress ? <Text style={styles.tapHint}>Tap for details →</Text> : null}
    </>
  );

  if (!onPress) return <View style={styles.card}>{content}</View>;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

function Pill({ label, textColor, bgColor, borderColor }: { label: string; textColor: string; bgColor: string; borderColor: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bgColor, borderColor }]}>
      <Text style={[styles.pillText, { color: textColor }]}>{label}</Text>
    </View>
  );
}


type DashboardProps = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

function DashboardScreen({ navigation }: DashboardProps) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';
  const { logout } = useAuth();

  // Mock live data state
  const [glucose, setGlucose] = useState(112); // mg/dL
  const [prevGlucose, setPrevGlucose] = useState(112);
  const [heartRate, setHeartRate] = useState(76); // bpm
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Update every 3 seconds
  useEffect(() => {
    const id = setInterval(() => {
      setPrevGlucose((gPrev) => {
        const next = clamp(Math.round(gPrev + (Math.random() * 10 - 5)), 70, 220);
        setGlucose(next);
        return gPrev;
      });

      setHeartRate((hr) => clamp(Math.round(hr + (Math.random() * 8 - 4)), 55, 160));
      setLastUpdate(new Date());
    }, 3000);

    return () => clearInterval(id);
  }, []);

  const trend = useMemo(() => computeTrend(prevGlucose, glucose), [prevGlucose, glucose]);
  const zone = useMemo(() => computeZone(heartRate), [heartRate]);

  const theme = useMemo(
    () =>
      isDark
        ? {
            bg: '#0B0B0F',
            cardBg: '#111827',
            border: '#1F2937',
            text: '#F9FAFB',
            subtext: '#9CA3AF',
            pillBg: '#0F172A',
          }
        : {
            bg: '#FFFFFF',
            cardBg: '#F3F4F6',
            border: '#E5E7EB',
            text: '#111827',
            subtext: '#6B7280',
            pillBg: '#FFFFFF',
          },
    [isDark],
  );

  const trendText =
    trend === 'Rising' ? '📈 Rising' : trend === 'Falling' ? '📉 Falling' : '➖ Stable';
  const zoneText =
    zone === 'Rest'
      ? '😌 Rest'
      : zone === 'Fat Burn'
        ? '🚶 Fat Burn'
        : zone === 'Cardio'
          ? '🏃 Cardio'
          : '🔥 Peak';

  const updatedAt = fmtTime(lastUpdate);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.h1, { color: theme.text }]}>Thrive AI Companion</Text>
          <Pressable onPress={logout}>
            <Text style={[styles.signOut, { color: theme.subtext }]}>Sign out</Text>
          </Pressable>
        </View>
        <Text style={[styles.h2, { color: theme.subtext }]}>
          Live mock data • Updated {updatedAt}
        </Text>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <View style={[styles.cardWrap, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Card
              title="Glucose"
              value={`${glucose} mg/dL`}
              subtitle={`Last: ${prevGlucose} mg/dL`}
              meta={
                <View style={styles.metaRow}>
                  <Pill label={trendText} textColor={theme.text} bgColor={theme.pillBg} borderColor={theme.border} />
                  <View style={{ width: 8 }} />
                  <Pill label={`Δ ${glucose - prevGlucose}`} textColor={theme.text} bgColor={theme.pillBg} borderColor={theme.border} />
                </View>
              }
              onPress={() => navigation.navigate('Glucose')}
            />
          </View>
        </View>

        <View style={styles.col}>
          <View style={[styles.cardWrap, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Card
              title="Heart Rate"
              value={`${heartRate} bpm`}
              subtitle="Mock live reading"
              meta={
                <View style={styles.metaRow}>
                  <Pill label={zoneText} textColor={theme.text} bgColor={theme.pillBg} borderColor={theme.border} />
                  <View style={{ width: 8 }} />
                  <Pill label="Avg: 78" textColor={theme.text} bgColor={theme.pillBg} borderColor={theme.border} />
                </View>
              }
              onPress={() =>
                navigation.navigate('Detail', {
                  title: 'Heart Rate',
                  value: `${heartRate} bpm`,
                  subtitle: 'Mock live reading',
                  meta: `${zoneText} • Avg: 78`,
                  updatedAt,
                })
              }
            />
          </View>
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <View style={[styles.cardWrap, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Card
              title="Medication"
              value="Metformin"
              subtitle="Next dose: 12:30 PM"
              meta={
                <View style={styles.metaRow}>
                  <Pill label="✅ Taken today" textColor={theme.text} bgColor={theme.pillBg} borderColor={theme.border} />
                </View>
              }
              onPress={() =>
                navigation.navigate('Detail', {
                  title: 'Medication',
                  value: 'Metformin',
                  subtitle: 'Next dose: 12:30 PM',
                  meta: '✅ Taken today',
                  updatedAt,
                })
              }
            />
          </View>
        </View>

        <View style={styles.col}>
          <View style={[styles.cardWrap, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Card
              title="Sensors"
              value="2 connected"
              subtitle="CGM + Watch (mock)"
              meta={
                <View style={styles.metaRow}>
                  <Pill label="Sync: OK" textColor={theme.text} bgColor={theme.pillBg} borderColor={theme.border} />
                  <View style={{ width: 8 }} />
                  <Pill label="Battery: 78%" textColor={theme.text} bgColor={theme.pillBg} borderColor={theme.border} />
                </View>
              }
              onPress={() =>
                navigation.navigate('Detail', {
                  title: 'Sensors',
                  value: '2 connected',
                  subtitle: 'CGM + Watch (mock)',
                  meta: 'Sync: OK • Battery: 78%',
                  updatedAt,
                })
              }
            />
          </View>
        </View>
      </View>

      <Text style={[styles.footer, { color: theme.subtext }]}>
        Tap any card to see details.
      </Text>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          onPress={() => navigation.navigate('Insights')}
        >
          <Text style={[styles.actionButtonText, { color: theme.text }]}>AI Insights</Text>
        </Pressable>
        <View style={styles.actionSpacer} />
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          onPress={() => navigation.navigate('JoinRoom')}
        >
          <Text style={[styles.actionButtonText, { color: theme.text }]}>Live Session</Text>
        </Pressable>
      </View>
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.actionButton, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          onPress={() => navigation.navigate('EHRConnect')}
        >
          <Text style={[styles.actionButtonText, { color: theme.text }]}>EHR Connect</Text>
        </Pressable>
      </View>
    </View>
  );
}

type DetailProps = NativeStackScreenProps<RootStackParamList, 'Detail'>;

function DetailScreen({ route }: DetailProps) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === 'dark';

  const theme = useMemo(
    () =>
      isDark
        ? { bg: '#0B0B0F', cardBg: '#111827', border: '#1F2937', text: '#F9FAFB', subtext: '#9CA3AF' }
        : { bg: '#FFFFFF', cardBg: '#F3F4F6', border: '#E5E7EB', text: '#111827', subtext: '#6B7280' },
    [isDark],
  );

  const { title, value, subtitle, meta, updatedAt } = route.params;

  return (
    <View style={[styles.detailContainer, { backgroundColor: theme.bg, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <Text style={[styles.detailTitle, { color: theme.text }]}>{title}</Text>

      <View style={[styles.detailCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.detailPrimary, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.detailSecondary, { color: theme.subtext }]}>{subtitle}</Text>
        {meta ? <Text style={[styles.detailMeta, { color: theme.subtext }]}>{meta}</Text> : null}
        {updatedAt ? <Text style={[styles.detailMeta, { color: theme.subtext }]}>Updated: {updatedAt}</Text> : null}
      </View>

      <Text style={[styles.detailHint, { color: theme.subtext }]}>
        Next: add history + a small sparkline chart here.
      </Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function AppNavigator() {
  const { accessToken } = useAuth();

  if (!accessToken) {
    return (
      <Stack.Navigator>
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Stack.Screen name="Glucose" component={GlucoseScreen} options={{ title: 'Glucose Monitor' }} />
      <Stack.Screen name="Insights" component={InsightsScreen} options={{ title: 'AI Insights' }} />
      <Stack.Screen name="JoinRoom" component={JoinRoomScreen} options={{ title: 'Join Room' }} />
      <Stack.Screen name="EHRConnect" component={EHRConnectScreen} options={{ title: 'EHR Connect' }} />
      <Stack.Screen name="LiveSession" component={LiveSessionScreen} options={{ title: 'Live Session' }} />
      <Stack.Screen
        name="Detail"
        component={DetailScreen}
        options={({ route }) => ({ title: route.params.title })}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 8, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  h2: { fontSize: 13, fontWeight: '600' },
  signOut: { fontSize: 12, fontWeight: '700' },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  col: { width: '48%' },
  cardWrap: { borderRadius: 16, borderWidth: 1, padding: 1 },

  card: { borderRadius: 16, padding: 14, minHeight: 150 },
  pressed: { opacity: 0.85 },
  cardTitle: { fontSize: 12, fontWeight: '800', marginBottom: 8 },
  cardValue: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  cardSubtitle: { fontSize: 12, fontWeight: '600', opacity: 0.8 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  pill: { borderWidth: 1, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  pillText: { fontSize: 12, fontWeight: '700' },

  tapHint: { marginTop: 12, fontSize: 12, fontWeight: '700', opacity: 0.7 },

  footer: { marginTop: 14, fontSize: 12, fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  actionButton: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  actionButtonText: { fontSize: 13, fontWeight: '700' },
  actionSpacer: { width: 12 },

  detailContainer: { flex: 1, paddingHorizontal: 16 },
  detailTitle: { fontSize: 26, fontWeight: '900', marginTop: 12, marginBottom: 12 },
  detailCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  detailPrimary: { fontSize: 30, fontWeight: '900', marginBottom: 8 },
  detailSecondary: { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  detailMeta: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  detailHint: { marginTop: 16, fontSize: 12, fontWeight: '600' },
});
