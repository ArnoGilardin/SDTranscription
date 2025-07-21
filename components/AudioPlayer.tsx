import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { 
  Play, 
  Pause, 
  Download, 
  Volume2, 
  VolumeX, 
  SkipBack, 
  SkipForward,
  RotateCcw,
  Share2
} from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming,
  useSharedValue,
  withSpring,
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
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressValue = useSharedValue(0);
  const volumeValue = useSharedValue(1);
  const expandedValue = useSharedValue(0);

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

  useEffect(() => {
    expandedValue.value = withSpring(isExpanded ? 1 : 0);
  }, [isExpanded]);

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
    audio.volume = volume;
    audio.playbackRate = playbackRate;
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

  const skipForward = () => {
    if (!audioRef.current) return;
    const newTime = Math.min(audioRef.current.currentTime + 10, audioRef.current.duration);
    audioRef.current.currentTime = newTime;
  };

  const skipBackward = () => {
    if (!audioRef.current) return;
    const newTime = Math.max(audioRef.current.currentTime - 10, 0);
    audioRef.current.currentTime = newTime;
  };

  const restart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    progressValue.value = withTiming(0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audioRef.current.volume = newMuted ? 0 : volume;
    volumeValue.value = withTiming(newMuted ? 0 : volume);
  };

  const changeVolume = (newVolume: number) => {
    if (!audioRef.current) return;
    setVolume(newVolume);
    if (!isMuted) {
      audioRef.current.volume = newVolume;
      volumeValue.value = withTiming(newVolume);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (!audioRef.current) return;
    setPlaybackRate(rate);
    audioRef.current.playbackRate = rate;
  };

  const handleProgressPress = (event: any) => {
    if (Platform.OS !== 'web') return;
    
    // Validate audio element and its duration
    if (!audioRef.current || !isFinite(audioRef.current.duration) || audioRef.current.duration <= 0) {
      return;
    }
    
    const { locationX, target } = event.nativeEvent;
    
    // Validate target width
    if (!target || !target.offsetWidth || target.offsetWidth <= 0) {
      return;
    }
    
    const width = target.offsetWidth;
    const percentage = (locationX / width) * 100;
    
    // Validate percentage is finite
    if (isFinite(percentage)) {
      seekTo(Math.max(0, Math.min(100, percentage)));
    }
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
        
        Alert.alert('Téléchargement', 'Le fichier audio a été téléchargé avec succès !');
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
      Alert.alert('Erreur', 'Impossible de télécharger le fichier audio.');
    }
  };

  const shareAudio = async () => {
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          try {
            await navigator.share({
              title: title,
              text: `Écoutez cet enregistrement audio : ${title}`,
              url: window.location.href
            });
          } catch (shareError) {
            // Fallback to clipboard if share fails
            await navigator.clipboard.writeText(window.location.href);
            Alert.alert('Lien copié', 'Le lien a été copié dans le presse-papiers !');
          }
        } else {
          // Fallback: copy to clipboard
          await navigator.clipboard.writeText(window.location.href);
          Alert.alert('Lien copié', 'Le lien a été copié dans le presse-papiers !');
        }
      } else {
        const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.m4a`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: uri,
          to: fileUri
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'audio/m4a',
            dialogTitle: `Partager ${title}`
          });
        }
      }
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Erreur', 'Impossible de partager le fichier audio.');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressValue.value}%`,
  }));

  const volumeStyle = useAnimatedStyle(() => ({
    opacity: volumeValue.value,
  }));

  const expandedStyle = useAnimatedStyle(() => ({
    height: withTiming(isExpanded ? 'auto' : 0),
    opacity: withTiming(isExpanded ? 1 : 0),
  }));

  const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Volume2 size={16} color={THEME.colors.accent} />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={shareAudio}
          >
            <Share2 size={16} color={THEME.colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={downloadAudio}
          >
            <Download size={16} color={THEME.colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.playerContainer}>
        <View style={styles.mainControls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={skipBackward}
          >
            <SkipBack size={20} color={THEME.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.playButton, isLoading && styles.playButtonDisabled]}
            onPress={togglePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <View style={styles.loadingDot} />
            ) : isPlaying ? (
              <Pause size={24} color="#FFF" />
            ) : (
              <Play size={24} color="#FFF" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={skipForward}
          >
            <SkipForward size={20} color={THEME.colors.text} />
          </TouchableOpacity>
        </View>

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

      <Animated.View style={[styles.expandedControls, expandedStyle]}>
        {isExpanded && (
          <>
            <View style={styles.advancedControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={restart}
              >
                <RotateCcw size={18} color={THEME.colors.text} />
                <Text style={styles.controlLabel}>Restart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleMute}
              >
                {isMuted ? (
                  <VolumeX size={18} color={THEME.colors.error} />
                ) : (
                  <Volume2 size={18} color={THEME.colors.text} />
                )}
                <Text style={styles.controlLabel}>
                  {isMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.volumeContainer}>
              <Text style={styles.sectionLabel}>Volume</Text>
              <View style={styles.volumeSlider}>
                {[0, 0.25, 0.5, 0.75, 1].map((vol) => (
                  <TouchableOpacity
                    key={vol}
                    style={[
                      styles.volumeButton,
                      volume === vol && styles.volumeButtonActive
                    ]}
                    onPress={() => changeVolume(vol)}
                  >
                    <Text style={[
                      styles.volumeText,
                      volume === vol && styles.volumeTextActive
                    ]}>
                      {Math.round(vol * 100)}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.speedContainer}>
              <Text style={styles.sectionLabel}>Vitesse de lecture</Text>
              <View style={styles.speedButtons}>
                {PLAYBACK_RATES.map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.speedButton,
                      playbackRate === rate && styles.speedButtonActive
                    ]}
                    onPress={() => changePlaybackRate(rate)}
                  >
                    <Text style={[
                      styles.speedText,
                      playbackRate === rate && styles.speedTextActive
                    ]}>
                      {rate}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}
      </Animated.View>
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
  expandButton: {
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
  headerActions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  actionButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.background,
  },
  playerContainer: {
    gap: THEME.spacing.md,
  },
  mainControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: THEME.spacing.lg,
  },
  controlButton: {
    alignItems: 'center',
    gap: THEME.spacing.xs,
  },
  controlLabel: {
    ...THEME.typography.caption,
    fontSize: 10,
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: THEME.spacing.sm,
  },
  progressBar: {
    height: 40,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
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
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  expandedControls: {
    overflow: 'hidden',
  },
  advancedControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: THEME.spacing.md,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.cardBorder,
    marginTop: THEME.spacing.md,
  },
  sectionLabel: {
    ...THEME.typography.caption,
    marginBottom: THEME.spacing.sm,
    fontWeight: '600',
  },
  volumeContainer: {
    marginBottom: THEME.spacing.md,
  },
  volumeSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  volumeButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background,
    minWidth: 50,
    alignItems: 'center',
  },
  volumeButtonActive: {
    backgroundColor: THEME.colors.accent,
  },
  volumeText: {
    ...THEME.typography.caption,
    fontSize: 12,
  },
  volumeTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  speedContainer: {
    marginBottom: THEME.spacing.md,
  },
  speedButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  speedButton: {
    padding: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background,
    minWidth: 50,
    alignItems: 'center',
  },
  speedButtonActive: {
    backgroundColor: THEME.colors.accent,
  },
  speedText: {
    ...THEME.typography.caption,
    fontSize: 12,
  },
  speedTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
});