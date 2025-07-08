import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, ScrollView, Alert } from 'react-native';
import { FileText, RefreshCcw, Download, Share2, Play, Pause, TriangleAlert as AlertTriangle, Settings } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordingsStore } from '@/stores/recordingsStore';
import { transcribeAudio, transcribeAudioRemote } from '@/utils/openai';
import { useState, useRef, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { jsPDF } from 'jspdf';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';
import { THEME } from '@/constants/theme';
import { router } from 'expo-router';

const UPLOADS_DIRECTORY = `${FileSystem.documentDirectory}uploads/`;

// Helper function to convert Base64 to Blob for transcription
const base64ToBlob = (base64: string): Blob => {
  if (!base64.startsWith('data:')) {
    throw new Error('Invalid Base64 format');
  }
  
  const [header, data] = base64.split(',');
  const mimeType = header.match(/:(.*?);/)?.[1] || 'audio/webm';
  const byteCharacters = atob(data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

// Helper function to convert Base64 to Blob URL for web playback
const base64ToBlobUrl = (base64: string): string => {
  if (!base64.startsWith('data:')) {
    return base64; // Not a Base64 string, return as-is
  }
  
  try {
    return base64; // Base64 data URLs can be used directly as audio src
  } catch (error) {
    console.error('Error handling Base64 URL:', error);
    return base64;
  }
};

export default function TranscriptsScreen() {
  const { t } = useLanguage();
  const { recordings, updateTranscript, transcriptionSettings } = useRecordingsStore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'available' | 'unavailable'>('unknown');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const currentTimeRef = useRef<number>(0);
  const progressValue = useSharedValue(0);
  const eventListenersRef = useRef<{ [key: string]: EventListener }>({});

  useEffect(() => {
    // Create uploads directory if it doesn't exist
    (async () => {
      if (Platform.OS !== 'web') {
        try {
          const dirInfo = await FileSystem.getInfoAsync(UPLOADS_DIRECTORY);
          if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(UPLOADS_DIRECTORY, { intermediates: true });
          }
        } catch (error) {
          console.error('Error creating uploads directory:', error);
        }
      }
    })();

    // Check service status on mount
    checkServiceStatus();

    return () => {
      cleanupAudio();
    };
  }, []);

  const checkServiceStatus = async () => {
    if (transcriptionSettings.mode === 'remote') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch('https://gilardinservice.shop/api/whisper', {
          method: 'GET',
          mode: 'cors',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        // If we get a 405 (Method Not Allowed), the service is reachable but doesn't support GET
        // This is actually a good sign - the service exists
        setServiceStatus(response.status === 405 || response.ok ? 'available' : 'unavailable');
      } catch (error) {
        console.log('Service health check failed:', error);
        setServiceStatus('unavailable');
      }
    }
  };

  const setupAudioEventListeners = () => {
    if (!audioRef.current) return;

    const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      currentTimeRef.current = audioRef.current.currentTime;
      const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      if (!isNaN(progress)) {
        progressValue.value = withTiming(progress);
      }
    };

    const handleEnded = () => {
      setPlayingId(null);
      setIsPlaying(false);
      progressValue.value = withTiming(0);
    };

    const handleError = (e: Event) => {
      console.error('Audio playback error:', e);
      setError(t('transcripts.playbackError'));
      setPlayingId(null);
      setIsPlaying(false);
    };

    const handleLoadedData = () => {
      // Audio is ready to play
      if (audioRef.current && isPlaying) {
        audioRef.current.play().catch((error) => {
          console.error('Playback error:', error);
          setError(t('transcripts.playbackError'));
          setPlayingId(null);
          setIsPlaying(false);
        });
      }
    };

    // Store event listeners for cleanup
    eventListenersRef.current = {
      timeupdate: handleTimeUpdate as EventListener,
      ended: handleEnded as EventListener,
      error: handleError as EventListener,
      loadeddata: handleLoadedData as EventListener,
    };

    // Add event listeners
    Object.entries(eventListenersRef.current).forEach(([event, listener]) => {
      audioRef.current?.addEventListener(event, listener);
    });
  };

  const cleanupAudio = () => {
    if (audioRef.current) {
      // Remove event listeners
      Object.entries(eventListenersRef.current).forEach(([event, listener]) => {
        audioRef.current?.removeEventListener(event, listener);
      });
      
      // Pause and clear source
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load(); // Force cleanup of internal state
      
      // Nullify the audio reference to prevent stale references
      audioRef.current = null;
      
      // Clear event listeners reference
      eventListenersRef.current = {};
    }
    
    // Reset state values
    setPlayingId(null);
    setIsPlaying(false);
    progressValue.value = 0;
  };

  const saveTranscriptToFile = async (recording: any, transcript: string) => {
    if (Platform.OS === 'web') {
      return; // Skip file saving on web for now
    }

    try {
      const fileName = `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      const filePath = `${UPLOADS_DIRECTORY}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, transcript, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      console.log(`Transcript saved to: ${filePath}`);
    } catch (error) {
      console.error('Error saving transcript to file:', error);
    }
  };

  const handlePlayPause = async (recording: any) => {
    try {
      if (Platform.OS !== 'web') {
        console.error('Audio playback only supported on web');
        return;
      }

      // If the same recording is playing, pause it
      if (playingId === recording.id && isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      // Complete cleanup of existing audio element before creating new one
      cleanupAudio();

      // Create a fresh audio element
      audioRef.current = new Audio();
      setupAudioEventListeners();

      // Convert Base64 to usable URL if needed
      const audioUrl = base64ToBlobUrl(recording.uri);
      audioRef.current.src = audioUrl;
      audioRef.current.load();
      
      setPlayingId(recording.id);
      setIsPlaying(true);
      
      // The actual play will be triggered by the loadeddata event listener
    } catch (error) {
      console.error('Error playing sound:', error);
      setError(t('transcripts.playbackError'));
      setPlayingId(null);
      setIsPlaying(false);
    }
  };

  const handleTranscribe = async (id: string, uri: string) => {
    try {
      setProcessingId(id);
      setError(null);

      // Check if this is a Base64 encoded audio (web recording)
      let audioData: string | Blob = uri;

      if (Platform.OS === 'web' && uri.startsWith('data:')) {
        // Convert Base64 to Blob for transcription
        try {
          const audioBlob = base64ToBlob(uri);
          
          // Check file size (25MB limit)
          if (audioBlob.size > 25 * 1024 * 1024) {
            throw new Error('Le fichier audio est trop volumineux. La taille maximale est de 25 Mo.');
          }
          
          // Pass the blob directly to transcription functions
          audioData = audioBlob;
        } catch (error) {
          console.error('Error processing Base64 audio:', error);
          throw new Error('Erreur lors du traitement de l\'enregistrement audio.');
        }
      } else if (Platform.OS !== 'web') {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('Audio file not found');
        }
        audioData = uri;
      }

      let transcript: string;

      if (transcriptionSettings.mode === 'remote') {
        if (!transcriptionSettings.remoteApiKey) {
          throw new Error('Clé API manquante. Veuillez configurer votre clé API dans les paramètres.');
        }
        
        // Check service status before attempting transcription
        if (serviceStatus === 'unavailable') {
          throw new Error('Le service de transcription distant est indisponible. Veuillez essayer le mode local ou réessayer plus tard.');
        }
        
        transcript = await transcribeAudioRemote(
          audioData, 
          transcriptionSettings.remoteApiKey, 
          transcriptionSettings.model
        );
      } else if (transcriptionSettings.mode === 'openai') {
        if (!transcriptionSettings.openaiApiKey) {
          throw new Error('Clé API OpenAI manquante. Veuillez configurer votre clé API dans les paramètres.');
        }
        
        const recording = recordings.find(r => r.id === id);
        const result = await transcribeAudio(audioData, recording?.speakers || [], transcriptionSettings.openaiApiKey);
        transcript = result.transcript;
      } else {
        throw new Error('Mode de transcription local non implémenté.');
      }
      
      if (!transcript) {
        throw new Error('No transcription generated');
      }

      // Save transcript to local file
      const recording = recordings.find(r => r.id === id);
      if (recording) {
        await saveTranscriptToFile(recording, transcript);
      }

      const words = transcript.split(' ').map((word, index) => ({
        text: word,
        startTime: index * 0.3,
      }));

      updateTranscript(id, transcript, words);
    } catch (err: any) {
      console.error('Transcription error:', err);
      
      // Provide more user-friendly error messages
      let errorMessage = err.message || t('transcripts.transcriptionError');
      
      // Check for specific network-related errors
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('Network') ||
          errorMessage.includes('connexion') ||
          errorMessage.includes('CORS')) {
        errorMessage = 'Problème de connexion au service de transcription. Le service semble avoir des problèmes de configuration CORS. Veuillez essayer le mode local.';
        
        // Update service status
        setServiceStatus('unavailable');
      }
      
      setError(errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const exportTranscript = async (recording: any, format: 'txt' | 'pdf') => {
    try {
      if (!recording.transcript) {
        throw new Error(t('transcripts.noTranscriptToExport'));
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `transcript-${timestamp}`;

      if (Platform.OS === 'web') {
        if (format === 'txt') {
          const blob = new Blob([recording.transcript], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${fileName}.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          const pdf = new jsPDF();
          pdf.setFontSize(16);
          pdf.text(recording.title, 20, 20);
          pdf.setFontSize(12);
          pdf.text(new Date(recording.date).toLocaleString(), 20, 30);
          const splitText = pdf.splitTextToSize(recording.transcript, 170);
          pdf.text(splitText, 20, 40);
          pdf.save(`${fileName}.pdf`);
        }
      } else {
        const fileUri = `${FileSystem.documentDirectory}${fileName}.${format}`;
        
        if (format === 'txt') {
          await FileSystem.writeAsStringAsync(fileUri, recording.transcript);
        } else {
          const pdf = new jsPDF();
          pdf.setFontSize(16);
          pdf.text(recording.title, 20, 20);
          pdf.setFontSize(12);
          pdf.text(new Date(recording.date).toLocaleString(), 20, 30);
          const splitText = pdf.splitTextToSize(recording.transcript, 170);
          pdf.text(splitText, 20, 40);
          const pdfBytes = pdf.output();
          await FileSystem.writeAsStringAsync(fileUri, pdfBytes, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
      }
    } catch (err: any) {
      console.error('Export error:', err);
      setError(t('transcripts.exportError'));
    }
  };

  const getTranscriptionModeText = () => {
    if (transcriptionSettings.mode === 'remote') {
      const statusIcon = serviceStatus === 'available' ? '🟢' : 
                        serviceStatus === 'unavailable' ? '🔴' : '🟡';
      return `API Distante (${transcriptionSettings.model}) ${statusIcon}`;
    } else if (transcriptionSettings.mode === 'openai') {
      return 'OpenAI Whisper';
    }
    return 'Local (Expérimental)';
  };

  const canTranscribe = () => {
    if (transcriptionSettings.mode === 'remote') {
      return !!transcriptionSettings.remoteApiKey && serviceStatus !== 'unavailable';
    } else if (transcriptionSettings.mode === 'openai') {
      return !!transcriptionSettings.openaiApiKey;
    }
    return false; // Local mode not implemented yet
  };

  const getServiceStatusMessage = () => {
    if (transcriptionSettings.mode === 'remote' && serviceStatus === 'unavailable') {
      return 'Le service de transcription distant est actuellement indisponible ou mal configuré (problème CORS). Vous pouvez essayer le mode local ou réessayer plus tard.';
    }
    return null;
  };

  const navigateToSettings = () => {
    router.push('/(tabs)/settings');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('transcripts.title')}</Text>
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>Mode: {getTranscriptionModeText()}</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={navigateToSettings}>
            <Settings size={20} color={THEME.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.dismissButton}
            onPress={() => setError(null)}>
            <Text style={styles.dismissButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      )}

      {!canTranscribe() && !getServiceStatusMessage() && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Veuillez configurer votre clé API dans les paramètres pour utiliser la transcription.
          </Text>
        </View>
      )}

      {getServiceStatusMessage() && (
        <View style={styles.serviceStatusContainer}>
          <AlertTriangle size={20} color="#F59E0B" />
          <Text style={styles.serviceStatusText}>
            {getServiceStatusMessage()}
          </Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={checkServiceStatus}>
            <RefreshCcw size={16} color="#F59E0B" />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('transcripts.noTranscripts')}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.transcriptItem}>
            <View style={styles.iconContainer}>
              <FileText size={24} color={THEME.colors.accent} />
            </View>
            <View style={styles.transcriptInfo}>
              <Text style={styles.transcriptTitle}>{item.title}</Text>
              {item.transcript ? (
                <>
                  <Text style={styles.transcriptDate}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                  
                  {Platform.OS === 'web' && (
                    <View style={styles.playerContainer}>
                      <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => handlePlayPause(item)}>
                        {playingId === item.id && isPlaying ? (
                          <Pause size={20} color={THEME.colors.accent} />
                        ) : (
                          <Play size={20} color={THEME.colors.accent} />
                        )}
                      </TouchableOpacity>
                      
                      <View style={styles.progressBar}>
                        <Animated.View 
                          style={[styles.progressFill, progressStyle]} 
                        />
                      </View>
                    </View>
                  )}

                  <ScrollView
                    ref={scrollViewRef}
                    style={styles.transcriptContainer}
                    showsVerticalScrollIndicator={false}>
                    <Text style={styles.transcriptText}>
                      {item.transcript}
                    </Text>
                  </ScrollView>

                  <View style={styles.exportButtons}>
                    <TouchableOpacity
                      style={styles.exportButton}
                      onPress={() => exportTranscript(item, 'txt')}>
                      <Download size={16} color={THEME.colors.accent} />
                      <Text style={styles.exportButtonText}>TXT</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.exportButton}
                      onPress={() => exportTranscript(item, 'pdf')}>
                      <Share2 size={16} color={THEME.colors.accent} />
                      <Text style={styles.exportButtonText}>PDF</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.transcribeButton,
                    !canTranscribe() && styles.transcribeButtonDisabled
                  ]}
                  onPress={() => handleTranscribe(item.id, item.uri)}
                  disabled={processingId === item.id || !canTranscribe()}>
                  {processingId === item.id ? (
                    <>
                      <ActivityIndicator size="small" color={THEME.colors.accent} style={styles.loader} />
                      <Text style={styles.processingText}>
                        {t('transcripts.processing')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <RefreshCcw size={16} color={canTranscribe() ? THEME.colors.accent : THEME.colors.text} />
                      <Text style={[
                        styles.transcribeText,
                        !canTranscribe() && styles.transcribeTextDisabled
                      ]}>
                        {t('transcripts.generateTranscript')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={[
          styles.listContent,
          recordings.length === 0 && styles.emptyContent,
        ]}
      />
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
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: THEME.spacing.xs,
  },
  subtitle: {
    ...THEME.typography.caption,
    flex: 1,
  },
  settingsButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
  },
  errorContainer: {
    margin: THEME.spacing.md,
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.accentLight,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.error,
  },
  errorText: {
    ...THEME.typography.body,
    color: THEME.colors.error,
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
  },
  dismissButton: {
    alignSelf: 'center',
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: THEME.colors.error,
    borderRadius: THEME.borderRadius.sm,
  },
  dismissButtonText: {
    ...THEME.typography.caption,
    color: 'white',
    fontWeight: '600',
  },
  warningContainer: {
    margin: THEME.spacing.md,
    padding: THEME.spacing.md,
    backgroundColor: '#F59E0B20',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningText: {
    ...THEME.typography.body,
    color: '#F59E0B',
    textAlign: 'center',
  },
  serviceStatusContainer: {
    margin: THEME.spacing.md,
    padding: THEME.spacing.md,
    backgroundColor: '#F59E0B10',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#F59E0B',
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  serviceStatusText: {
    ...THEME.typography.body,
    color: '#F59E0B',
    flex: 1,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    backgroundColor: '#F59E0B20',
    borderRadius: THEME.borderRadius.sm,
  },
  retryButtonText: {
    ...THEME.typography.caption,
    color: '#F59E0B',
    fontWeight: '600',
  },
  listContent: {
    padding: THEME.spacing.md,
  },
  emptyContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  emptyText: {
    ...THEME.typography.body,
    color: THEME.colors.text,
    textAlign: 'center',
  },
  transcriptItem: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcriptInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  transcriptTitle: {
    ...THEME.typography.body,
    marginBottom: THEME.spacing.xs,
  },
  transcriptDate: {
    ...THEME.typography.caption,
    marginBottom: THEME.spacing.sm,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: THEME.colors.cardBorder,
    borderRadius: THEME.borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: THEME.colors.accent,
    borderRadius: THEME.borderRadius.sm,
  },
  transcriptContainer: {
    maxHeight: 200,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
  },
  transcriptText: {
    ...THEME.typography.body,
    lineHeight: 24,
  },
  transcribeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignSelf: 'flex-start',
  },
  transcribeButtonDisabled: {
    opacity: 0.5,
  },
  transcribeText: {
    ...THEME.typography.button,
    color: THEME.colors.accent,
    marginLeft: THEME.spacing.sm,
  },
  transcribeTextDisabled: {
    color: THEME.colors.text,
  },
  processingText: {
    ...THEME.typography.button,
    color: THEME.colors.text,
    marginLeft: THEME.spacing.sm,
  },
  loader: {
    marginRight: THEME.spacing.sm,
  },
  exportButtons: {
    flexDirection: 'row',
    marginTop: THEME.spacing.md,
    gap: THEME.spacing.sm,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    gap: THEME.spacing.xs,
  },
  exportButtonText: {
    ...THEME.typography.caption,
    color: THEME.colors.accent,
    fontWeight: '600',
  },
});