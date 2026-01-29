import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../config';
import { RootStackParamList } from '../navigation/types';

type JoinRoomProps = NativeStackScreenProps<RootStackParamList, 'JoinRoom'>;

export default function JoinRoomScreen({ navigation }: JoinRoomProps) {
  const { accessToken } = useAuth();
  const [roomName, setRoomName] = useState('thrive-ai');
  const [participantName, setParticipantName] = useState('mobile-user');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canJoin = useMemo(() => roomName.trim().length > 0 && !isLoading, [roomName, isLoading]);

  const requestToken = async () => {
    if (!accessToken || !canJoin) return;
    setIsLoading(true);
    setError(null);
    try {
      const normalizedRoomName = roomName.trim();
      const normalizedParticipant = participantName.trim() || 'mobile-user';
      const requestPayload = {
        room_name: normalizedRoomName,
        participant_name: normalizedParticipant,
      };
      const response = await fetch(`${API_BASE_URL}/v1/livekit/room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...requestPayload,
          payload: requestPayload,
        }),
      });

      if (!response.ok) {
        const rawMessage = await response.text();
        let message = rawMessage || 'Unable to join the room.';
        try {
          const data = JSON.parse(rawMessage);
          if (typeof data?.detail === 'string') {
            message = data.detail;
          } else if (Array.isArray(data?.detail) && data.detail.length > 0) {
            message = data.detail[0]?.msg ?? message;
          }
        } catch {
          // Keep the raw message if it's not JSON.
        }
        throw new Error(message);
      }

      const data = await response.json();
      if (!data?.token || !data?.url) {
        throw new Error('Missing LiveKit connection details.');
      }

      navigation.navigate('LiveSession', {
        token: data.token,
        url: data.url,
        roomName: normalizedRoomName,
        participantName: normalizedParticipant,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to join the room.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Join a LiveKit room</Text>
      <Text style={styles.subtitle}>Connect to a live session with video and audio.</Text>
      <Text style={styles.helperText}>API: {API_BASE_URL}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Room name</Text>
        <TextInput
          style={styles.input}
          value={roomName}
          onChangeText={setRoomName}
          placeholder="thrive-ai"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Participant name</Text>
        <TextInput
          style={styles.input}
          value={participantName}
          onChangeText={setParticipantName}
          placeholder="mobile-user"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Pressable style={[styles.button, !canJoin && styles.buttonDisabled]} onPress={requestToken} disabled={!canJoin}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Join room</Text>}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  helperText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 16 },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  button: { backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
  errorText: { color: '#B91C1C', fontWeight: '600', marginBottom: 12 },
});
