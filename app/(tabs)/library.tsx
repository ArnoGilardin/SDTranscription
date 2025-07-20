import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { FileAudio, Trash2 } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordingsStore, Recording } from '@/stores/recordingsStore';
import { useState } from 'react';
import { THEME } from '@/constants/theme';
import AudioPlayer from '@/components/AudioPlayer';

export default function LibraryScreen() {
  const { t } = useLanguage();
  const recordings = useRecordingsStore((state) => state.recordings);
  const deleteRecording = useRecordingsStore((state) => state.deleteRecording);
  const [playingId, setPlayingId] = useState<string | null>(null);

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

  const handlePlayStateChange = (recordingId: string) => (isPlaying: boolean) => {
    if (isPlaying) {
      setPlayingId(recordingId);
    } else if (playingId === recordingId) {
      setPlayingId(null);
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
            <View style={styles.recordingInfo}>
              <Text style={styles.recordingTitle}>{item.title}</Text>
              <Text style={styles.recordingMeta}>
                {formatDate(item.date)} • {formatDuration(item.duration)}
              </Text>
              <AudioPlayer
                uri={item.uri}
                title={item.title}
                duration={item.duration}
                onPlayStateChange={handlePlayStateChange(item.id)}
              />
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
    flexDirection: 'column',
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  recordingInfo: {
    flex: 1,
    marginBottom: THEME.spacing.sm,
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
    alignSelf: 'flex-end',
    position: 'absolute',
    top: THEME.spacing.md,
    right: THEME.spacing.md,
  },
});