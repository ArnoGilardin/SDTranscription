import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { FileAudio, Trash2, Play, Pause } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordingsStore, Recording } from '@/stores/recordingsStore';
import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { THEME } from '@/constants/theme';

// Helper function to convert Base64 to Blob URL for web playback
const base64ToBlobUrl = (base64: string): string => {
  if (!base64.startsWith('data:')) {
    return base64; // Not a Base64 string, return as-is
  }
  
  try {
    const response = fetch(base64);
    return base64; // For now, return the Base64 directly as it can be used as src
  } catch (error) {
    console.error('Error converting Base64 to blob URL:', error);
    return base64;
  }
};

export default function LibraryScreen() {
  const { t } = useLanguage();
  const recordings = useRecordingsStore((state) => state.recordings);
  const deleteRecording = useRecordingsStore((state) => state.deleteRecording);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      cleanupAudio();
    };
  }, []);

  const cleanupAudio = () => {
    if (Platform.OS === 'web') {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.src = '';
        webAudioRef.current.load();
        webAudioRef.current = null;
      }
    } else {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleDelete = async (recording: Recording) => {
    try {
      Alert.alert(
        t('library.deleteTitle'),
        t('library.deleteMessage'),
        [
          {
            text: t('library.cancel'),
            style: 'cancel',
          },
          {
            text: t('library.delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                // Stop playback if this recording is playing
                if (playingId === recording.id) {
                  cleanupAudio();
                  setPlayingId(null);
                  setIsPlaying(false);
                }
                
                // Delete the recording
                deleteRecording(recording.id);
              } catch (error) {
                console.error('Error during deletion:', error);
                Alert.alert(t('library.deleteError'));
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error showing delete alert:', error);
      Alert.alert(t('library.deleteError'));
    }
  };

  const handlePlayPause = async (recording: Recording) => {
    try {
      if (Platform.OS === 'web') {
        if (!webAudioRef.current) {
          webAudioRef.current = new window.Audio();
          
          webAudioRef.current.onended = () => {
            setPlayingId(null);
            setIsPlaying(false);
          };

          webAudioRef.current.onerror = () => {
            console.error('Audio playback error');
            Alert.alert(t('library.playbackError'));
            setPlayingId(null);
            setIsPlaying(false);
          };
        }

        if (playingId === recording.id && isPlaying) {
          webAudioRef.current.pause();
          setIsPlaying(false);
        } else {
          if (playingId && playingId !== recording.id) {
            // Properly cleanup existing audio before creating new one
            webAudioRef.current.pause();
            webAudioRef.current.src = '';
            webAudioRef.current.load();
            webAudioRef.current = new window.Audio();
            
            webAudioRef.current.onended = () => {
              setPlayingId(null);
              setIsPlaying(false);
            };

            webAudioRef.current.onerror = () => {
              console.error('Audio playback error');
              Alert.alert(t('library.playbackError'));
              setPlayingId(null);
              setIsPlaying(false);
            };
          }
          
          // Convert Base64 to usable URL if needed
          const audioUrl = base64ToBlobUrl(recording.uri);
          webAudioRef.current.src = audioUrl;
          
          try {
            await webAudioRef.current.play();
            setPlayingId(recording.id);
            setIsPlaying(true);
          } catch (error) {
            console.error('Playback error:', error);
            Alert.alert(t('library.playbackError'));
            setPlayingId(null);
            setIsPlaying(false);
          }
        }
      } else {
        if (!soundRef.current) {
          const { sound } = await Audio.Sound.createAsync(
            { uri: recording.uri },
            { shouldPlay: false }
          );
          soundRef.current = sound;

          sound.setOnPlaybackStatusUpdate((status: any) => {
            if (status.didJustFinish) {
              setPlayingId(null);
              setIsPlaying(false);
            }
          });
        }

        if (playingId === recording.id && isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          if (playingId && playingId !== recording.id) {
            await soundRef.current.unloadAsync();
            const { sound } = await Audio.Sound.createAsync(
              { uri: recording.uri },
              { shouldPlay: false }
            );
            soundRef.current = sound;
          }

          await soundRef.current.playAsync();
          setPlayingId(recording.id);
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      Alert.alert(t('library.playbackError'));
      setPlayingId(null);
      setIsPlaying(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('library.title')}</Text>
      </View>

      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('library.noRecordings')}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.recordingItem}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={() => handlePlayPause(item)}
            >
              {playingId === item.id && isPlaying ? (
                <Pause size={24} color={THEME.colors.accent} />
              ) : (
                <Play size={24} color={THEME.colors.accent} />
              )}
            </TouchableOpacity>
            <View style={styles.recordingInfo}>
              <Text style={styles.recordingTitle}>{item.title}</Text>
              <Text style={styles.recordingMeta}>
                {formatDate(item.date)} • {formatDuration(item.duration)}
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => handleDelete(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Trash2 size={24} color={THEME.colors.error} />
            </TouchableOpacity>
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
  recordingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordingInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  recordingTitle: {
    ...THEME.typography.body,
    marginBottom: THEME.spacing.xs,
  },
  recordingMeta: {
    ...THEME.typography.caption,
  },
  deleteButton: {
    padding: THEME.spacing.sm,
    marginLeft: THEME.spacing.sm,
  },
});