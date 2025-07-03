import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Platform, ScrollView, Alert } from 'react-native';
import { FileText, RefreshCcw, Download, Share2, Play, Pause } from 'lucide-react-native';
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

const UPLOADS_DIRECTORY = `${FileSystem.documentDirectory}uploads/`;

export default function TranscriptsScreen() {
  const { t } = useLanguage();
  const { recordings, updateTranscript, transcriptionSettings } = useRecordingsStore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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

    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (audioRef.current) {
      // Remove event listeners first
      Object.entries(eventListenersRef.current).forEach(([event, listener]) => {
        audioRef.current?.removeEventListener(event, listener);
      });
      
      // Properly cleanup the audio element
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
      
      // Clear event listeners reference
      eventListenersRef.current = {};
    }
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
      if (playingId === recording.id && isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
        return;
      }

      // Cleanup existing audio properly
      cleanupAudio();

      // Create new audio instance
      const audio = new Audio(recording.uri);
      
      // Create event listeners
      const handleTimeUpdate = () => {
        if (!audio) return;
        currentTimeRef.current = audio.currentTime;
        const progress = (audio.currentTime / audio.duration) * 100;
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

      // Store event listeners for cleanup
      eventListenersRef.current = {
        timeupdate: handleTimeUpdate as EventListener,
        ended: handleEnded as EventListener,
        error: handleError as EventListener,
      };

      // Add event listeners
      Object.entries(eventListenersRef.current).forEach(([event, listener]) => {
        audio.addEventListener(event, listener);
      });

      audioRef.current = audio;
      
      try {
        await audio.play();
        setPlayingId(recording.id);
        setIsPlaying(true);
      } catch (error) {
        console.error('Playback error:', error);
        setError(t('transcripts.playbackError'));
        setPlayingId(null);
        setIsPlaying(false);
      }
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

      if (Platform.OS !== 'web') {
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error('Audio file not found');
        }
      }

      let transcript: string;

      if (transcriptionSettings.mode === 'remote') {
        if (!transcriptionSettings.remoteApiKey) {
          throw new Error('Clé API manquante. Veuillez configurer votre clé API dans les paramètres.');
        }
        
        transcript = await transcribeAudioRemote(
          uri, 
          transcriptionSettings.remoteApiKey, 
          transcriptionSettings.model
        );
      } else {
        const recording = recordings.find(r => r.id === id);
        const result = await transcribeAudio(uri, recording?.speakers || []);
        transcript = result.transcript;
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
      setError(err.message || t('transcripts.transcriptionError'));
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
      return `API Distante (${transcriptionSettings.model})`;
    }
    return 'OpenAI Whisper';
  };

  const canTranscribe = () => {
    if (transcriptionSettings.mode === 'remote') {
      return !!transcriptionSettings.remoteApiKey;
    }
    return true; // OpenAI mode always available if API key is set
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('transcripts.title')}</Text>
        <Text style={styles.subtitle}>Mode: {getTranscriptionModeText()}</Text>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {!canTranscribe() && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Veuillez configurer votre clé API dans les paramètres pour utiliser la transcription.
          </Text>
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
  subtitle: {
    ...THEME.typography.caption,
    marginTop: THEME.spacing.xs,
  },
  errorContainer: {
    margin: THEME.spacing.md,
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.accentLight,
    borderRadius: THEME.borderRadius.md,
  },
  errorText: {
    ...THEME.typography.body,
    color: THEME.colors.error,
    textAlign: 'center',
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