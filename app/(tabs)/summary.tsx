import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Brain, RefreshCcw, FileText } from 'lucide-react-native';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordingsStore } from '@/stores/recordingsStore';
import { useState } from 'react';
import { THEME } from '@/constants/theme';
import { generateSummary } from '@/utils/openai';

export default function SummaryScreen() {
  const { t } = useLanguage();
  const { recordings, updateSummary, transcriptionSettings } = useRecordingsStore();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateSummary = async (id: string, transcript: string) => {
    try {
      setProcessingId(id);
      setError(null);

      // Check if we have the required API key based on mode
      let apiKey = '';
      if (transcriptionSettings.mode === 'openai') {
        if (!transcriptionSettings.openaiApiKey) {
          throw new Error('Clé API OpenAI manquante. Veuillez configurer votre clé API dans les paramètres.');
        }
        apiKey = transcriptionSettings.openaiApiKey;
      } else {
        // For remote mode, we can also use OpenAI for summary if available
        if (!transcriptionSettings.openaiApiKey) {
          throw new Error('Une clé API OpenAI est requise pour générer des résumés. Veuillez la configurer dans les paramètres.');
        }
        apiKey = transcriptionSettings.openaiApiKey;
      }

      const summary = await generateSummary(transcript, apiKey);
      if (!summary) {
        throw new Error(t('summary.generationError'));
      }

      updateSummary(id, summary);
    } catch (err: any) {
      console.error('Summary generation error:', err);
      setError(err.message || t('summary.generationError'));
    } finally {
      setProcessingId(null);
    }
  };

  const recordingsWithTranscripts = recordings.filter(r => r.transcript);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('summary.title')}</Text>
      </View>

      {error && (
            {transcriptionSettings.mode === 'openai' 
              ? 'Veuillez configurer votre clé API OpenAI dans les paramètres.'
              : 'Veuillez configurer votre clé API dans les paramètres pour utiliser la transcription.'
            }
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={recordingsWithTranscripts}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('summary.noTranscripts')}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.summaryItem}>
            <View style={styles.iconContainer}>
              <FileText size={24} color={THEME.colors.accent} />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryTitle}>{item.title}</Text>
              <Text style={styles.summaryDate}>
                {new Date(item.date).toLocaleDateString()}
              </Text>

              {item.summary ? (
                <View style={styles.summaryContainer}>
                  <Text style={styles.summaryText}>{item.summary}</Text>
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={() => handleGenerateSummary(item.id, item.transcript!)}>
                    <RefreshCcw size={16} color={THEME.colors.accent} />
                    <Text style={styles.regenerateText}>
                      {t('summary.regenerate')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.generateButton}
                  onPress={() => handleGenerateSummary(item.id, item.transcript!)}
                  disabled={processingId === item.id}>
                  {processingId === item.id ? (
                    <>
                      <ActivityIndicator size="small" color={THEME.colors.accent} style={styles.loader} />
                      <Text style={styles.processingText}>
                        {t('summary.processing')}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Brain size={16} color={THEME.colors.accent} />
                      <Text style={styles.generateText}>
                        {t('summary.generate')}
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
          recordingsWithTranscripts.length === 0 && styles.emptyContent,
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
  summaryItem: {
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
  summaryInfo: {
    flex: 1,
    marginLeft: THEME.spacing.md,
  },
  summaryTitle: {
    ...THEME.typography.body,
    marginBottom: THEME.spacing.xs,
  },
  summaryDate: {
    ...THEME.typography.caption,
    marginBottom: THEME.spacing.sm,
  },
  summaryContainer: {
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
  },
  summaryText: {
    ...THEME.typography.body,
    lineHeight: 24,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.background,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignSelf: 'flex-start',
  },
  generateText: {
    ...THEME.typography.button,
    color: THEME.colors.accent,
    marginLeft: THEME.spacing.sm,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.md,
    alignSelf: 'flex-start',
    marginTop: THEME.spacing.md,
  },
  regenerateText: {
    ...THEME.typography.caption,
    color: THEME.colors.accent,
    marginLeft: THEME.spacing.xs,
  },
  processingText: {
    ...THEME.typography.button,
    color: THEME.colors.text,
    marginLeft: THEME.spacing.sm,
  },
  loader: {
    marginRight: THEME.spacing.sm,
  },
});