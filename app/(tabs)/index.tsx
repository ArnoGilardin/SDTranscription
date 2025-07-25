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
import * as MediaLibrary from 'expo-media-library';
import { activateKeepAwakeAsync, deactivateKeepAwakeAsync } from 'expo-keep-awake';
import { THEME } from '@/constants/theme';

// Import FileSystem conditionally for native platforms
let FileSystem: any = null;
let RECORDINGS_DIRECTORY = '';

if (Platform.OS !== 'web') {
  FileSystem = require('expo-file-system');
  RECORDINGS_DIRECTORY = `${FileSystem.documentDirectory}recordings/`;
}

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

// Helper function to convert Blob to Base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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

      // Handle web MediaRecorder cleanup
      if (Platform.OS === 'web' && mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
          mediaRecorderRef.current = null;
          audioChunksRef.current = [];
        } catch (error) {
          console.error('Error stopping MediaRecorder:', error);
        }
      }

      // Handle native Audio.Recording cleanup
      if (Platform.OS !== 'web' && recording && !isUnloading.current) {
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

          if (FileSystem && RECORDINGS_DIRECTORY) {
            const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIRECTORY);
            if (!dirInfo.exists) {
              await FileSystem.makeDirectoryAsync(RECORDINGS_DIRECTORY, { intermediates: true });
            }
          }
        } catch (err) {
          console.error('Error requesting permissions:', err);
          setError(t('recording.permissionDenied'));
          setHasPermission(false);
        }
      } else {
        // Web platform - check for MediaRecorder support
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')) {
          setHasPermission(true);
        } else {
          setError('Recording not supported in this browser');
          setHasPermission(false);
        }
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

    if (!FileSystem) return uri;

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

      let savedUri = asset.uri;
      
      // For web, convert to Base64 for persistence
      if (Platform.OS === 'web') {
        try {
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          savedUri = await blobToBase64(blob);
        } catch (error) {
          console.error('Error converting imported file to Base64:', error);
          // Keep original URI if conversion fails
        }
      } else {
        savedUri = await saveRecordingToLibrary(asset.uri);
      }
      
      let durationInSeconds = 0;
      
      if (Platform.OS !== 'web') {
        const { sound } = await Audio.Sound.createAsync(
          { uri: savedUri },
          { shouldPlay: false }
        );
        const status = await sound.getStatusAsync();
        await sound.unloadAsync();
        durationInSeconds = Math.round((status as any).durationMillis / 1000);
      } else {
        // For web, we'll set a default duration since we can't easily get it
        durationInSeconds = 60; // Default 1 minute
      }

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

  const startWebRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped, processing audio...');
        console.log('currentRecordingId in onstop:', currentRecordingId);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob created, size:', audioBlob.size);
        
        // Convert to Base64 for persistence across page reloads
        const base64Uri = await blobToBase64(audioBlob);
        console.log('Base64 conversion complete, length:', base64Uri.length);
        
        // Use a captured recordingId since currentRecordingId might be reset
        const recordingId = currentRecordingId || Date.now().toString();
        if (recordingId) {
          console.log('Creating recording with ID:', recordingId);
          const newRecording = {
            id: recordingId,
            title: generateTitle(),
            uri: base64Uri, // Store as Base64 instead of blob URL
            duration,
            date: new Date().toISOString(),
            speakers: [],
          };
          console.log('Adding recording to store:', newRecording);
          addRecording(newRecording);
          console.log('Recording added successfully');
        } else {
          console.log('No recordingId found!');
        }
        
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      
      return true;
    } catch (error) {
      console.error('Error starting web recording:', error);
      throw error;
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
        } else {
          // For web, request microphone permission
          try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setHasPermission(true);
          } catch (error) {
            setError('Microphone permission denied');
            return;
          }
        }
      }

      const newRecordingId = Date.now().toString();
      setCurrentRecordingId(newRecordingId);
      startTime.current = new Date();
      setIsRecording(true);
      setDuration(0);

      if (Platform.OS === 'web') {
        await startWebRecording();
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });

        const { recording: newRecording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        
        await activateKeepAwakeAsync();
        setRecording(newRecording);
      }

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
    console.log('stopRecording called, state:', { 
      currentRecordingId, 
      isUnloading: isUnloading.current, 
      isRecording,
      platform: Platform.OS 
    });
    
    if (!currentRecordingId || isUnloading.current || !isRecording) {
      console.log('Early return from stopRecording due to conditions');
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

      if (Platform.OS === 'web') {
        // Stop web recording
        console.log('Stopping web recording, MediaRecorder state:', mediaRecorderRef.current?.state);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('Calling MediaRecorder.stop()');
          mediaRecorderRef.current.stop();
          // The recording will be saved in the MediaRecorder's onstop event
        } else {
          console.log('MediaRecorder not in recording state or not found');
        }
      } else {
        // Stop native recording
        console.log('Stopping native recording, recording object exists:', !!recording);
        if (recording) {
          console.log('Getting URI from recording...');
          // Get the URI before stopping the recording
          const uri = recording.getURI();
          console.log('Recording URI:', uri);
          
          // Stop and unload the recording
          console.log('Stopping and unloading recording...');
          await recording.stopAndUnloadAsync();
          console.log('Recording stopped and unloaded');
          
          await deactivateKeepAwakeAsync();
          console.log('Keep awake deactivated');
          
          if (uri) {
            console.log('Saving recording to library...');
            const savedUri = await saveRecordingToLibrary(uri);
            console.log('Recording saved, creating recording object...');
            const newRecording = {
              id: currentRecordingId,
              title: generateTitle(),
              uri: savedUri,
              duration,
              date: new Date().toISOString(),
              speakers: [],
            };
            console.log('Adding recording to store:', newRecording);
            addRecording(newRecording);
            console.log('Recording added successfully');
          } else {
            console.error('No URI found for recording');
          }
        } else {
          console.error('No recording object found');
        }
      }
      
    } catch (err: any) {
      console.error('Failed to stop recording', err);
      setError(t('recording.stopError'));
    } finally {
      // Don't reset currentRecordingId immediately for web - let the onstop event handle it
      if (Platform.OS !== 'web') {
        console.log('Cleaning up native recording state...');
        setRecording(null);
        setIsRecording(false);
        setCurrentRecordingId(null);
        isUnloading.current = false;
        startTime.current = null;
        setIsProcessing(false);
        console.log('Native recording cleanup complete');
      } else {
        // For web, only reset the UI state, keep currentRecordingId for onstop event
        setIsRecording(false);
        setIsProcessing(false);
        // Reset other states after a short delay to allow onstop to complete
        setTimeout(() => {
          setCurrentRecordingId(null);
          isUnloading.current = false;
          startTime.current = null;
        }, 100);
      }
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