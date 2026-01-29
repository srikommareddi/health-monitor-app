import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  isTrackReference,
  RoomContext,
  VideoTrack,
  useConnectionState,
  useLiveKitRoom,
  useLocalParticipant,
  useTracks,
} from '@livekit/react-native';
import type { TrackReference } from '@livekit/react-native';
import { LogLevel, MediaDeviceFailure, Track, setLogLevel } from 'livekit-client';
import { useAuth } from '../auth/AuthContext';
import { API_BASE_URL } from '../config';
import { RootStackParamList } from '../navigation/types';
import { fetchLatestMetrics, type HealthMetric } from '../services/api';
import { addMetric, initMetricsDb, loadCachedMetrics, storeMetrics } from '../services/metricsStore';

type LiveSessionProps = NativeStackScreenProps<RootStackParamList, 'LiveSession'>;

type TrackGridItem = TrackReference | { simulated: true };

type TrackGridProps = {
  showSimulatedTile: boolean;
};

function TrackGrid({ showSimulatedTile }: TrackGridProps) {
  const rawTracks = useTracks([Track.Source.Camera, Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const tracks = rawTracks.filter(isTrackReference);
  const items: TrackGridItem[] = showSimulatedTile ? [...tracks, { simulated: true }] : tracks;

  if (items.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>Waiting for video tracks...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item, index) => {
        if ('simulated' in item) {
          return 'simulated-participant';
        }
        if ('publication' in item && item.publication?.trackSid) {
          return item.publication.trackSid;
        }
        return `track-${index}`;
      }}
      numColumns={2}
      columnWrapperStyle={styles.trackRow}
      renderItem={({ item }) =>
        'simulated' in item ? (
          <View style={[styles.trackTile, styles.simulatedTile]}>
            <View style={[styles.videoTrack, styles.simulatedVideo]} />
            <Text style={styles.trackLabel}>Simulated participant • video</Text>
          </View>
        ) : (
          <View style={styles.trackTile}>
            <VideoTrack style={styles.videoTrack} trackRef={item} />
            <Text style={styles.trackLabel}>
              {item.participant?.identity ?? 'Participant'} • {item.source}
            </Text>
          </View>
        )
      }
    />
  );
}

type MediaDiagnosticsProps = {
  onMessage: (message: string | null) => void;
};

function MediaDiagnostics({ onMessage }: MediaDiagnosticsProps) {
  const { cameraTrack, isCameraEnabled, lastCameraError, lastMicrophoneError } = useLocalParticipant();
  const [cameraStatusMessage, setCameraStatusMessage] = useState<string | null>(null);

  const mediaFailureMessage = useMemo(() => {
    const failure = MediaDeviceFailure.getFailure(lastCameraError ?? lastMicrophoneError);
    if (!failure) {
      return null;
    }
    switch (failure) {
      case MediaDeviceFailure.PermissionDenied:
        return 'Camera or microphone permission denied. Enable access in Settings.';
      case MediaDeviceFailure.NotFound:
        return 'No camera/microphone detected. Use a physical device if on simulator.';
      case MediaDeviceFailure.DeviceInUse:
        return 'Camera/microphone is already in use by another app.';
      case MediaDeviceFailure.Other:
      default:
        return 'Camera/microphone failed to start. Try reconnecting.';
    }
  }, [lastCameraError, lastMicrophoneError]);

  useEffect(() => {
    if (!isCameraEnabled) {
      setCameraStatusMessage(null);
      return;
    }

    const mediaStreamTrack = cameraTrack?.track?.mediaStreamTrack;
    if (mediaStreamTrack?.readyState === 'live') {
      setCameraStatusMessage(null);
      return;
    }

    const timer = setTimeout(() => {
      setCameraStatusMessage(
        'Camera is enabled but no video frames are available. On the iOS simulator this is expected; test on a physical device and verify camera permissions.',
      );
    }, 2000);

    return () => clearTimeout(timer);
  }, [cameraTrack?.track?.mediaStreamTrack, isCameraEnabled]);

  useEffect(() => {
    onMessage(mediaFailureMessage ?? cameraStatusMessage);
  }, [cameraStatusMessage, mediaFailureMessage, onMessage]);

  return null;
}

function ConnectionBanner() {
  const connectionState = useConnectionState();
  const bannerText =
    connectionState === 'reconnecting'
      ? 'Reconnecting…'
      : connectionState === 'disconnected'
        ? 'Disconnected. Trying to reconnect…'
        : null;

  if (!bannerText) {
    return null;
  }

  return (
    <View style={styles.connectionBanner}>
      <Text style={styles.connectionBannerText}>{bannerText}</Text>
    </View>
  );
}

function MediaControls() {
  const { isMicrophoneEnabled, isCameraEnabled, localParticipant } = useLocalParticipant();
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleMicrophone = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleCamera = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={styles.controlsRow}>
      <Pressable
        style={[styles.controlButton, isMicrophoneEnabled ? styles.controlOn : styles.controlOff]}
        onPress={toggleMicrophone}
      >
        <Text
          style={[
            styles.controlButtonText,
            isMicrophoneEnabled ? styles.controlButtonTextOn : styles.controlButtonTextOff,
          ]}
        >
          {isMicrophoneEnabled ? 'Mic On' : 'Mic Off'}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.controlButton, isCameraEnabled ? styles.controlOn : styles.controlOff]}
        onPress={toggleCamera}
      >
        <Text
          style={[
            styles.controlButtonText,
            isCameraEnabled ? styles.controlButtonTextOn : styles.controlButtonTextOff,
          ]}
        >
          {isCameraEnabled ? 'Cam On' : 'Cam Off'}
        </Text>
      </Pressable>
    </View>
  );
}

export default function LiveSessionScreen({ route, navigation }: LiveSessionProps) {
  const { token, url, roomName, participantName } = route.params;
  const { accessToken } = useAuth();
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>(
    'connecting',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mediaErrorMessage, setMediaErrorMessage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [simulateParticipantsEnabled, setSimulateParticipantsEnabled] = useState(false);
  const [connectKey, setConnectKey] = useState(0);

  useEffect(() => {
    setLogLevel(LogLevel.debug);
  }, []);

  useEffect(() => {
    initMetricsDb();
  }, []);

  const loadMetrics = useCallback(async () => {
    if (!accessToken) return;
    setMetricsLoading(true);
    setMetricsError(null);
    try {
      const latest = await fetchLatestMetrics(accessToken, 20);
      setMetrics(latest);
      await storeMetrics(latest);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load metrics.';
      setMetricsError(message);
      if (metrics.length === 0) {
        const cached = await loadCachedMetrics(20);
        if (cached.length > 0) {
          setMetrics(cached);
        }
      }
    } finally {
      setMetricsLoading(false);
    }
  }, [accessToken, metrics.length]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  useEffect(() => {
    if (!accessToken) return;
    const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/v1/metrics/stream?token=${accessToken}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'snapshot' && Array.isArray(payload.data)) {
          const snapshot = payload.data as HealthMetric[];
          setMetrics(snapshot);
          storeMetrics(snapshot);
          return;
        }
        if (payload?.metric_type) {
          const metric = payload as HealthMetric;
          setMetrics((prev) => [metric, ...prev].slice(0, 50));
          addMetric(metric);
        }
      } catch {
        // ignore malformed payloads
      }
    };

    return () => socket.close();
  }, [accessToken]);

  useEffect(() => {
    const handleStateChange = (state: string) => {
      if (state === 'active') {
        loadMetrics();
      }
    };
    const subscription = AppState.addEventListener('change', handleStateChange);
    return () => subscription.remove();
  }, [loadMetrics]);

  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(() => {
      if (AppState.currentState === 'active') {
        loadMetrics();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [accessToken, loadMetrics]);

  const retryConnect = () => {
    setErrorMessage(null);
    setMediaErrorMessage(null);
    setConnectionState('connecting');
    setConnectKey((prev) => prev + 1);
  };

  const { room } = useLiveKitRoom({
    serverUrl: url,
    token,
    connect: true,
    audio: true,
    video: true,
    onConnected: () => {
      setConnectionState('connected');
      setErrorMessage(null);
    },
    onDisconnected: () => {
      setConnectionState('disconnected');
      setErrorMessage('Disconnected before media negotiation completed.');
    },
    onError: (error) => {
      setConnectionState('error');
      setErrorMessage(error.message);
    },
    onMediaDeviceFailure: (failure) => {
      if (!failure) {
        return;
      }
      setMediaErrorMessage(
        failure === MediaDeviceFailure.PermissionDenied
          ? 'Camera or microphone permission denied. Enable access in Settings.'
          : 'Camera/microphone failed to start. Try reconnecting.',
      );
    },
  });

  return (
    <View style={styles.room}>
      {room ? (
        <RoomContext.Provider value={room}>
          <View style={styles.container}>
            <MediaDiagnostics onMessage={setMediaErrorMessage} />
            <ConnectionBanner />
            <View style={styles.header}>
              <View>
                <Text style={styles.title}>{roomName}</Text>
                <Text style={styles.subtitle}>Connected as {participantName}</Text>
                <Text style={styles.serverText}>Server: {url}</Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  style={[
                    styles.simulateButton,
                    simulateParticipantsEnabled ? styles.simulateButtonActive : null,
                  ]}
                  onPress={() => setSimulateParticipantsEnabled((prev) => !prev)}
                >
                  <Text style={styles.simulateButtonText}>
                    {simulateParticipantsEnabled ? 'Stop Sim' : 'Simulate'}
                  </Text>
                </Pressable>
                <Pressable style={styles.leaveButton} onPress={() => navigation.goBack()}>
                  <Text style={styles.leaveButtonText}>Leave</Text>
                </Pressable>
              </View>
            </View>
            <MediaControls />

            {connectionState === 'connecting' ? (
              <View style={styles.statusCard}>
                <ActivityIndicator />
                <Text style={styles.statusText}>Connecting to LiveKit...</Text>
              </View>
            ) : null}

            {connectionState === 'error' && errorMessage ? (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>Connection failed</Text>
                <Text style={styles.errorText}>{errorMessage}</Text>
                <Pressable style={styles.retryButton} onPress={retryConnect}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </Pressable>
              </View>
            ) : null}

            {mediaErrorMessage ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Media unavailable</Text>
                <Text style={styles.warningText}>{mediaErrorMessage}</Text>
              </View>
            ) : null}

            {connectionState !== 'error' ? (
              <TrackGrid showSimulatedTile={simulateParticipantsEnabled} />
            ) : null}

            <View style={styles.metricsCard}>
              <Text style={styles.metricsTitle}>Latest metrics</Text>
              {metricsLoading ? <ActivityIndicator /> : null}
              {metricsError ? <Text style={styles.metricsError}>{metricsError}</Text> : null}
              {!metricsLoading && metrics.length === 0 ? (
                <Text style={styles.metricsEmpty}>No metrics yet.</Text>
              ) : null}
              {metrics.slice(0, 5).map((metric) => (
                <View key={`metric-${metric.id}`} style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{metric.metric_type}</Text>
                  <Text style={styles.metricValue}>
                    {metric.value}
                    {metric.unit ? ` ${metric.unit}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </RoomContext.Provider>
      ) : (
        <View style={styles.container}>
          <View style={styles.statusCard}>
            <ActivityIndicator />
            <Text style={styles.statusText}>Preparing LiveKit room...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  room: { flex: 1 },
  container: { flex: 1, padding: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  connectionBanner: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  connectionBannerText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  controlOn: {
    backgroundColor: '#111827',
  },
  controlOff: {
    backgroundColor: '#E5E7EB',
  },
  controlButtonText: {
    fontWeight: '700',
    fontSize: 12,
  },
  controlButtonTextOn: {
    color: '#fff',
  },
  controlButtonTextOff: {
    color: '#111827',
  },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  serverText: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginTop: 4 },
  simulateButton: {
    borderWidth: 1,
    borderColor: '#CBD5F5',
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  simulateButtonActive: {
    borderColor: '#1F2937',
    backgroundColor: '#E5E7EB',
  },
  simulateButtonText: { color: '#1F2937', fontWeight: '700', fontSize: 12 },
  leaveButton: { backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  leaveButtonText: { color: '#fff', fontWeight: '700' },
  statusCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  statusText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  errorCard: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  errorTitle: { fontSize: 13, fontWeight: '800', color: '#991B1B', marginBottom: 6 },
  errorText: { fontSize: 12, fontWeight: '600', color: '#7F1D1D', marginBottom: 10 },
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#111827', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  warningCard: {
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  warningTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 6 },
  warningText: { fontSize: 12, fontWeight: '600', color: '#92400E' },
  emptyState: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
  trackRow: { justifyContent: 'space-between', marginBottom: 12 },
  trackTile: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
  },
  simulatedTile: {
    borderStyle: 'dashed',
    borderColor: '#CBD5F5',
  },
  videoTrack: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#111827',
  },
  simulatedVideo: {
    backgroundColor: '#1F2937',
  },
  trackLabel: { marginTop: 6, fontSize: 11, fontWeight: '600' },
  metricsCard: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  metricsTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  metricsEmpty: { fontSize: 12, color: '#6B7280', fontWeight: '600' },
  metricsError: { fontSize: 12, color: '#B91C1C', fontWeight: '600', marginBottom: 6 },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  metricLabel: { fontSize: 12, fontWeight: '700', color: '#374151' },
  metricValue: { fontSize: 12, fontWeight: '700', color: '#111827' },
});
