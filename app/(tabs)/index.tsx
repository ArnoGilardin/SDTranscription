import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { Mic, Square, Upload, Plus, User } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordingsStore, Speaker } from '@/stores/recordingsStore';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from 'expo-keep-awake';
import { THEME } from '@/constants/theme';

const RECORDINGS_DIRECTORY = `${FileSystem.documentDirectory}recordings/`;

const DEFAULT_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
];

export default function RecordScreen() {
  const { t } = useLanguage();
  const { addRecording, recordings } = useRecordingsStore();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [currentRecordingId, setCurrentRecordingId] = useState<string | null>(null);
  const durationTimer = useRef<NodeJS.Timeout | null>(null);
  const isUnloading = useRef(false);
  const startTime = useRef<Date | null>(null);

  // Cleanup function to handle recording stop and resource cleanup
  const cleanupRecording = async () => {
    try {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }

      if (Platform.OS !== 'web') {
        try {
          await deactivateKeepAwakeAsync();
        } catch (error) {
          console.error('Error deactivating keep awake:', error);
        }
      }

      if (recording && !isUnloading.current) {
        isUnloading.current = true;
        try {
          await recording.stopAndUnloadAsync();
        } catch (error) {
          console.error('Error stopping recording:', error);
        }
        setRecording(null);
      }

      setIsRecording(false);
      setCurrentRecordingId(null);
      isUnloading.current = false;
      startTime.current = null;
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  };

  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        try {
          const { status: audioStatus } = await Audio.requestPermissionsAsync();
          const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
          setHasPermission(audioStatus === 'granted' && mediaStatus === 'granted');
          
          if (audioStatus !== 'granted' || mediaStatus !== 'granted') {
            setError(t('recording.permissionDenied'));
          }

          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
          });

          const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIRECTORY);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(RECORDINGS_DIRECTORY, { intermediates: true });
          }
        } catch (err) {
          console.error('Error requesting permissions:', err);
          setError(t('recording.permissionDenied'));
          setHasPermission(false);
        }
      } else {
        setHasPermission(true);
      }
    })();

    // Cleanup on component unmount
    return () => {
      cleanupRecording();
    };
  }, []);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withRepeat(
            withSequence(
              withSpring(1),
              withSpring(1.2),
              withSpring(1)
            ),
            -1,
            true
          ),
        },
      ],
      backgroundColor: withTiming(isRecording ? THEME.colors.accentLight : THEME.colors.cardBackground, { duration: 300 }),
    };
  });

  const opacityStyle = useAnimatedStyle(() => {
    return {
      opacity: withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.linear }),
          withTiming(0.3, { duration: 500, easing: Easing.linear })
        ),
        -1,
        true
      ),
    };
  });

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const generateTitle = () => {
    if (!startTime.current) return 'Recording';
    const date = startTime.current;
    return `Recording ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const saveRecordingToLibrary = async (uri: string) => {
    if (Platform.OS === 'web') return uri;

    try {
      const timestamp = new Date().getTime();
      const newFileName = `recording_${timestamp}.m4a`;
      const newUri = `${RECORDINGS_DIRECTORY}${newFileName}`;

      await FileSystem.copyAsync({
        from: uri,
        to: newUri
      });

      const asset = await MediaLibrary.createAssetAsync(newUri);
      await MediaLibrary.createAlbumAsync('Transcript', asset, false);

      return newUri;
    } catch (error) {
      console.error('Error saving recording:', error);
      return uri;
    }
  };

  const handleImportFile = async () => {
    try {
      setError(null);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (!asset) {
        throw new Error('No file selected');
      }

      const savedUri = await saveRecordingToLibrary(asset.uri);
      const { sound } = await Audio.Sound.createAsync(
        { uri: savedUri },
        { shouldPlay: false }
      );
      const status = await sound.getStatusAsync();
      await sound.unloadAsync();

      const durationInSeconds = Math.round((status as any).durationMillis / 1000);

      const newRecording = {
        id: Date.now().toString(),
        title: asset.name || 'Imported Audio',
        uri: savedUri,
        duration: durationInSeconds,
        date: new Date().toISOString(),
        speakers: [],
      };

      addRecording(newRecording);
    } catch (err) {
      console.error('Import error:', err);
      setError(t('recording.importError'));
    }
  };

  async function startRecording() {
    try {
      if (isRecording || isProcessing) return;
      
      setError(null);

      if (!hasPermission) {
        if (Platform.OS !== 'web') {
          const { status } = await Audio.requestPermissionsAsync();
          if (status !== 'granted') {
            setError(t('recording.permissionDenied'));
            return;
          }
          setHasPermission(true);
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      if (Platform.OS !== 'web') {
        await activateKeepAwakeAsync();
      }
      
      const newRecordingId = Date.now().toString();
      setCurrentRecordingId(newRecordingId);
      startTime.current = new Date();
      setRecording(newRecording);
      setIsRecording(true);
      setDuration(0);

      durationTimer.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording', err);
      setError(t('recording.startError'));
      await cleanupRecording();
    }
  }

  async function stopRecording() {
    if (!recording || !currentRecordingId || isUnloading.current || !isRecording) {
      return;
    }

    try {
      setIsProcessing(true);
      isUnloading.current = true;

      // Stop the duration timer first
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }

      // Get the URI before stopping the recording
      const uri = recording.getURI();
      
      // Stop and unload the recording
      await recording.stopAndUnloadAsync();
      
      if (Platform.OS !== 'web') {
        await deactivateKeepAwakeAsync();
      }
      
      if (uri) {
        const savedUri = await saveRecordingToLibrary(uri);
        const newRecording = {
          id: currentRecordingId,
          title: generateTitle(),
          uri: savedUri,
          duration,
          date: new Date().toISOString(),
          speakers: [],
        };
        addRecording(newRecording);
      }
      
    } catch (err) {
      console.error('Failed to stop recording', err);
      setError(t('recording.stopError'));
    } finally {
      setRecording(null);
      setIsRecording(false);
      setCurrentRecordingId(null);
      isUnloading.current = false;
      startTime.current = null;
      setIsProcessing(false);
    }
  }

  const currentRecording = currentRecordingId 
    ? recordings.find(r => r.id === currentRecordingId)
    : null;

  const addNewSpeaker = () => {
    if (!currentRecordingId || !currentRecording) return;

    const newSpeakerId = (currentRecording.speakers.length + 1).toString();
    const newSpeaker: Speaker = {
      id: newSpeakerId,
      name: `Speaker ${newSpeakerId}`,
      color: DEFAULT_COLORS[currentRecording.speakers.length % DEFAULT_COLORS.length]
    };

    useRecordingsStore.getState().addSpeaker(currentRecordingId, newSpeaker);
    useRecordingsStore.getState().updateCurrentSpeaker(currentRecordingId, newSpeaker.id);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={THEME.colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('recording.title')}</Text>
        <TouchableOpacity 
          style={[styles.uploadButton, isRecording && styles.uploadButtonDisabled]}
          onPress={handleImportFile}
          disabled={isRecording}
        >
          <Upload size={24} color={isRecording ? THEME.colors.text : THEME.colors.accent} />
          <Text style={[styles.uploadText, isRecording && styles.uploadTextDisabled]}>
            {t('recording.upload')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.recordingContainer}>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        <View style={styles.durationContainer}>
          {isRecording ? (
            <>
              <Animated.Text 
                style={[styles.duration, opacityStyle]}
              >
                {formatDuration(duration)}
              </Animated.Text>
              <Text style={styles.recordingStatus}>{t('recording.recording')}</Text>
            </>
          ) : (
            <Text style={styles.readyStatus}>00:00</Text>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.recordButton}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}>
          <Animated.View style={[styles.pulseCircle, isRecording && pulseStyle]}>
            {isProcessing ? (
              <ActivityIndicator size="large" color={THEME.colors.accent} />
            ) : isRecording ? (
              <Square size={32} color={THEME.colors.error} />
            ) : (
              <Mic size={32} color={THEME.colors.accent} />
            )}
          </Animated.View>
        </TouchableOpacity>

        {isRecording && currentRecording && (
          <View style={styles.speakersContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.speakersScroll}
            >
              {currentRecording.speakers.map((speaker) => (
                <TouchableOpacity
                  key={speaker.id}
                  style={[
                    styles.speakerButton,
                    { backgroundColor: speaker.color },
                    currentRecording.currentSpeakerId === speaker.id && styles.speakerButtonActive
                  ]}
                  onPress={() => useRecordingsStore.getState().updateCurrentSpeaker(currentRecordingId, speaker.id)}
                >
                  <User size={20} color="#FFF" />
                  <Text style={styles.speakerName}>{speaker.name}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.addSpeakerButton}
                onPress={addNewSpeaker}
              >
                <Plus size={24} color={THEME.colors.accent} />
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
        
        <Text style={styles.hint}>
          {isProcessing 
            ? t('recording.processing')
            : isRecording 
              ? t('recording.stopHint') 
              : t('recording.startHint')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    padding: THEME.spacing.md,
    paddingTop: 60,
    backgroundColor: THEME.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  title: {
    ...THEME.typography.h1,
    marginBottom: THEME.spacing.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  uploadButtonDisabled: {
    opacity: 0.5,
  },
  uploadText: {
    ...THEME.typography.button,
    marginLeft: THEME.spacing.sm,
    color: THEME.colors.accent,
  },
  uploadTextDisabled: {
    color: THEME.colors.text,
  },
  recordingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  durationContainer: {
    alignItems: 'center',
    marginBottom: THEME.spacing.xl,
    minHeight: 120,
    justifyContent: 'center',
  },
  recordingStatus: {
    ...THEME.typography.body,
    color: THEME.colors.error,
    marginTop: THEME.spacing.sm,
    opacity: 0.8,
  },
  readyStatus: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 72,
    color: THEME.colors.text,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  duration: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 72,
    color: THEME.colors.error,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
  },
  errorText: {
    ...THEME.typography.body,
    color: THEME.colors.error,
    textAlign: 'center',
    marginBottom: THEME.spacing.md,
    backgroundColor: THEME.colors.accentLight,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  pulseCircle: {
    width: 64,
    height: 64,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  speakersContainer: {
    marginTop: THEME.spacing.xl,
    width: '100%',
  },
  speakersScroll: {
    paddingHorizontal: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  speakerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.full,
    marginRight: THEME.spacing.sm,
    opacity: 0.8,
  },
  speakerButtonActive: {
    opacity: 1,
    transform: [{ scale: 1.05 }],
  },
  speakerName: {
    ...THEME.typography.button,
    color: '#FFF',
    marginLeft: THEME.spacing.sm,
  },
  addSpeakerButton: {
    width: 44,
    height: 44,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  hint: {
    ...THEME.typography.caption,
    marginTop: THEME.spacing.lg,
    textAlign: 'center',
  },
});