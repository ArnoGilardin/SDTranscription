import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Play, Pause, Download, Volume2 } from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import { THEME } from '@/constants/theme';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

interface AudioPlayerProps {
  uri: string;
  title: string;
  duration: number;
  onPlayStateChange?: (isPlaying: boolean) => void;
}

// Helper function to convert Base64 to Blob URL for web playback
const base64ToBlobUrl = (base64: string): string => {
  if (!base64.startsWith('data:')) {
    return base64; // Not a Base64 string, return as-is
  }
  return base64; // Base64 data URLs can be used directly as audio src
};

export default function AudioPlayer({ uri, title, duration, onPlayStateChange }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressValue = useSharedValue(0);
  const volumeValue = useSharedValue(1);

  useEffect(() => {
    if (Platform.OS === 'web') {
      setupWebAudio();
    }
    
    return () => {
      cleanupAudio();
    };
  }, [uri]);

  useEffect(() => {
    onPlayStateChange?.(isPlaying);
  }, [isPlaying, onPlayStateChange]);

  const setupWebAudio = () => {
    if (audioRef.current) {
      cleanupAudio();
    }

    audioRef.current = new Audio();
    const audio = audioRef.current;

    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(Math.floor(audio.duration));
      setIsLoading(false);
    });

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(Math.floor(audio.currentTime));
      const progress = (audio.currentTime / audio.duration) * 100;
      if (!isNaN(progress)) {
        progressValue.value = withTiming(progress);
      }
    });

    audio.addEventListener('ended', () => {
      setIsPlaying(false);
      setCurrentTime(0);
      progressValue.value = withTiming(0);
    });

    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e);
      setIsLoading(false);
      setIsPlaying(false);
    });

    audio.addEventListener('loadstart', () => {
      setIsLoading(true);
    });

    audio.addEventListener('canplay', () => {
      setIsLoading(false);
    });

    const audioUrl = base64ToBlobUrl(uri);
    audio.src = audioUrl;
    audio.load();
  };

  const cleanupAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current.load();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    progressValue.value = 0;
  };

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Playback error:', error);
      setIsPlaying(false);
    }
  };

  const seekTo = (percentage: number) => {
    if (!audioRef.current) return;
    
    const newTime = (percentage / 100) * audioRef.current.duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(Math.floor(newTime));
    progressValue.value = withTiming(percentage);
  };

  const handleProgressPress = (event: any) => {
    if (Platform.OS !== 'web') return;
    
    const { locationX, target } = event.nativeEvent;
    const width = target.offsetWidth;
    const percentage = (locationX / width) * 100;
    seekTo(Math.max(0, Math.min(100, percentage)));
  };

  const downloadAudio = async () => {
    try {
      if (Platform.OS === 'web') {
        // Web download
        const audioUrl = base64ToBlobUrl(uri);
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.webm`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Mobile download
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.m4a`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        // Copy file to documents directory
        await FileSystem.copyAsync({
          from: uri,
          to: fileUri
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const volumeStyle = useAnimatedStyle(() => ({
    opacity: volumeValue.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Volume2 size={16} color={THEME.colors.accent} />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.downloadButton}
          onPress={downloadAudio}
        >
          <Download size={16} color={THEME.colors.accent} />
        </TouchableOpacity>
      </View>

      <View style={styles.playerContainer}>
        <TouchableOpacity
          style={[styles.playButton, isLoading && styles.playButtonDisabled]}
          onPress={togglePlayPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <View style={styles.loadingDot} />
          ) : isPlaying ? (
            <Pause size={20} color="#FFF" />
          ) : (
            <Play size={20} color="#FFF" />
          )}
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <TouchableOpacity 
            style={styles.progressBar}
            onPress={handleProgressPress}
            activeOpacity={0.8}
          >
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, progressStyle]} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatTime(currentTime)}
            </Text>
            <Text style={styles.timeText}>
              {formatTime(audioDuration)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginVertical: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: THEME.spacing.sm,
  },
  title: {
    ...THEME.typography.body,
    marginLeft: THEME.spacing.sm,
    flex: 1,
  },
  downloadButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.md,
  },
  playButtonDisabled: {
    opacity: 0.6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
    opacity: 0.8,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    marginBottom: THEME.spacing.sm,
  },
  progressTrack: {
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
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    ...THEME.typography.caption,
    fontSize: 12,
  },
});