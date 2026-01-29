import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import GlucoseSparkline from "./GlucoseSparkline";

type Props = {
  current: number; // mg/dL
  unit?: string;
  sparkData: number[];
  statusText?: string; // e.g., "Normal", "High", "Low"
  onPress?: () => void;
};

function getStatusColor(current: number) {
  // Example thresholds (customize)
  if (current < 70) return "#EB5757"; // red
  if (current > 180) return "#F2994A"; // orange
  return "#27AE60"; // green
}

export default function GlucoseCard({
  current,
  unit = "mg/dL",
  sparkData,
  statusText,
  onPress,
}: Props) {
  const badgeColor = getStatusColor(current);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Glucose</Text>
          <View style={styles.valueRow}>
            <Text style={styles.value}>{current}</Text>
            <Text style={styles.unit}>{unit}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badgeColor }]}>
            <Text style={styles.badgeText}>{statusText ?? "Stable"}</Text>
          </View>
        </View>

        <View style={styles.sparkWrap}>
          <Text style={styles.sparkLabel}>Last 24h</Text>
          <GlucoseSparkline data={sparkData} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E6E8EC",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 14, fontWeight: "600", color: "#111827" },
  valueRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 6 },
  value: { fontSize: 28, fontWeight: "800", color: "#111827" },
  unit: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  sparkWrap: { alignItems: "flex-end" },
  sparkLabel: { fontSize: 11, color: "#6B7280", marginBottom: 6, fontWeight: "600" },
});
