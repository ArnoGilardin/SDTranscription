import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform } from 'react-native';
import { FileAudio, Trash2, Download, Share2 } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordingsStore, Recording } from '@/stores/recordingsStore';
import { useState } from 'react';
import { THEME } from '@/constants/theme';
import AudioPlayer from '@/components/AudioPlayer';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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

  const handleDownload = async (recording: Recording) => {
    try {
      if (Platform.OS === 'web') {
        // Web download
        const link = document.createElement('a');
        link.href = recording.uri;
        link.download = `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        Alert.alert('Téléchargement', 'Le fichier a été téléchargé avec succès !');
      } else {
        // Mobile download
        const fileName = `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}.m4a`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: recording.uri,
          to: fileUri
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le fichier.');
    }
  };

  const handleShare = async (recording: Recording) => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          try {
            await navigator.share({
              title: recording.title,
              text: `Écoutez cet enregistrement : ${recording.title}`,
              url: window.location.href
            });
          } catch (shareError) {
            // Fallback to clipboard if share fails
            await navigator.clipboard.writeText(window.location.href);
            Alert.alert('Lien copié', 'Le lien a été copié dans le presse-papiers !');
          }
        } else {
          await navigator.clipboard.writeText(window.location.href);
          Alert.alert('Lien copié', 'Le lien a été copié dans le presse-papiers !');
        }
      } else {
        const fileName = `${recording.title.replace(/[^a-zA-Z0-9]/g, '_')}.m4a`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: recording.uri,
          to: fileUri
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'audio/m4a',
            dialogTitle: `Partager ${recording.title}`
          });
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Erreur', 'Impossible de partager le fichier.');
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
              <View style={styles.recordingHeader}>
                <View style={styles.recordingTitleContainer}>
                  <Text style={styles.recordingTitle}>{item.title}</Text>
                  <Text style={styles.recordingMeta}>
                    {formatDate(item.date)} • {formatDuration(item.duration)}
                  </Text>
                </View>
                <View style={styles.recordingActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleShare(item)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Share2 size={20} color={THEME.colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDownload(item)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Download size={20} color={THEME.colors.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDelete(item)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Trash2 size={20} color={THEME.colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
              <AudioPlayer
                uri={item.uri}
                title={item.title}
                duration={item.duration}
                onPlayStateChange={handlePlayStateChange(item.id)}
              />
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
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: THEME.spacing.sm,
  },
  recordingTitleContainer: {
    flex: 1,
    marginRight: THEME.spacing.sm,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    ...THEME.typography.body,
    marginBottom: THEME.spacing.xs,
  },
  recordingMeta: {
    ...THEME.typography.caption,
  },
  recordingActions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  actionButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
  },
});