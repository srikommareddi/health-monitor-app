import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';

export default function LoginScreen() {
  const { login, loginDev, isLoading, error } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thrive AI Companion</Text>
      <Text style={styles.subtitle}>Personalized health insights powered by AI.</Text>

      <Pressable style={styles.button} onPress={login} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue with Auth0</Text>}
      </Pressable>

      {__DEV__ ? (
        <Pressable style={[styles.button, styles.devButton]} onPress={loginDev} disabled={isLoading}>
          <Text style={[styles.buttonText, styles.devButtonText]}>Continue in Dev Mode</Text>
        </Pressable>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { fontSize: 14, fontWeight: '600', marginBottom: 20, textAlign: 'center' },
  button: { backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
  buttonText: { color: '#fff', fontWeight: '700' },
  devButton: { marginTop: 12, backgroundColor: '#E5E7EB' },
  devButtonText: { color: '#111827' },
  errorText: { marginTop: 16, color: '#B91C1C', fontWeight: '600', textAlign: 'center' },
});
