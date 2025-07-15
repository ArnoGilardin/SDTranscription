import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { ChevronRight, Globe as Globe2, Settings as SettingsIcon, Key, Cpu } from 'lucide-react-native';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRecordingsStore } from '@/stores/recordingsStore';
import { Language } from '@/types/i18n';
import { THEME } from '@/constants/theme';
import { router } from 'expo-router';

const LANGUAGES = [
  { code: 'en' as Language, name: 'English', nativeName: 'English' },
  { code: 'fr' as Language, name: 'French', nativeName: 'Français' }
];

const TRANSCRIPTION_MODES = [
  { value: 'remote' as const, label: 'API Distante', description: 'Utilise l\'API gilardinservice.shop' },
  { value: 'openai' as const, label: 'OpenAI Whisper', description: 'Utilise l\'API OpenAI directement' },
  { value: 'local' as const, label: 'Local (Expérimental)', description: 'Traitement local (non implémenté)' }
];

const MODELS = [
  { value: 'small' as const, label: 'Small', description: 'Plus rapide, moins précis' },
  { value: 'medium' as const, label: 'Medium', description: 'Plus lent, plus précis' }
];

export default function SettingsScreen() {
  const { language, setLanguage, t } = useLanguage();
  const { transcriptionSettings, updateTranscriptionSettings } = useRecordingsStore();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showOpenAIKeyModal, setShowOpenAIKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(transcriptionSettings.remoteApiKey);
  const [tempOpenAIKey, setTempOpenAIKey] = useState(transcriptionSettings.openaiApiKey);

  const currentLanguage = LANGUAGES.find(lang => lang.code === language);
  const currentMode = TRANSCRIPTION_MODES.find(mode => mode.value === transcriptionSettings.mode);
  const currentModel = MODELS.find(model => model.value === transcriptionSettings.model);

  const handleSaveApiKey = () => {
    if (!tempApiKey.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une clé API valide');
      return;
    }
    updateTranscriptionSettings({ remoteApiKey: tempApiKey.trim() });
    setShowApiKeyModal(false);
    Alert.alert('Succès', 'Clé API sauvegardée avec succès');
  };

  const handleSaveOpenAIKey = () => {
    if (!tempOpenAIKey.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir une clé API OpenAI valide');
      return;
    }
    updateTranscriptionSettings({ openaiApiKey: tempOpenAIKey.trim() });
    setShowOpenAIKeyModal(false);
    Alert.alert('Succès', 'Clé API OpenAI sauvegardée avec succès');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transcription</Text>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowTranscriptionModal(true)}
        >
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <SettingsIcon size={20} color={THEME.colors.accent} />
            </View>
            <Text style={styles.settingText}>Mode de transcription</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>
              {currentMode?.label}
            </Text>
            <ChevronRight size={20} color={THEME.colors.text} />
          </View>
        </TouchableOpacity>

        {transcriptionSettings.mode === 'remote' && (
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setShowModelModal(true)}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Cpu size={20} color={THEME.colors.accent} />
              </View>
              <Text style={styles.settingText}>Modèle</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {currentModel?.label}
              </Text>
              <ChevronRight size={20} color={THEME.colors.text} />
            </View>
          </TouchableOpacity>
        )}

        {transcriptionSettings.mode === 'remote' && (
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => {
              setTempApiKey(transcriptionSettings.remoteApiKey);
              setShowApiKeyModal(true);
            }}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Key size={20} color={THEME.colors.accent} />
              </View>
              <Text style={styles.settingText}>Clé API Distante</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {transcriptionSettings.remoteApiKey ? '••••••••' : 'Non configurée'}
              </Text>
              <ChevronRight size={20} color={THEME.colors.text} />
            </View>
          </TouchableOpacity>
        )}

        {transcriptionSettings.mode === 'openai' && (
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => {
              setTempOpenAIKey(transcriptionSettings.openaiApiKey);
              setShowOpenAIKeyModal(true);
            }}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Key size={20} color={THEME.colors.accent} />
              </View>
              <Text style={styles.settingText}>Clé API OpenAI</Text>
            </View>
            <View style={styles.settingRight}>
              <Text style={styles.settingValue}>
                {transcriptionSettings.openaiApiKey ? '••••••••' : 'Non configurée'}
              </Text>
              <ChevronRight size={20} color={THEME.colors.text} />
            </View>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => setShowLanguageModal(true)}
        >
          <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
              <Globe2 size={20} color={THEME.colors.accent} />
            </View>
            <Text style={styles.settingText}>{t('settings.language')}</Text>
          </View>
          <View style={styles.settingRight}>
            <Text style={styles.settingValue}>
              {currentLanguage?.nativeName}
            </Text>
            <ChevronRight size={20} color={THEME.colors.text} />
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>{t('settings.privacyPolicy')}</Text>
          <ChevronRight size={20} color={THEME.colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.settingItem}
          onPress={() => router.push('/(tabs)/terms')}
        >
          <Text style={styles.settingText}>{t('settings.termsOfService')}</Text>
          <ChevronRight size={20} color={THEME.colors.text} />
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <Text style={styles.settingText}>{t('settings.version')}</Text>
          <Text style={styles.versionText}>1.0.0</Text>
        </View>
      </View>

      {/* Language Modal */}
      {showLanguageModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{t('settings.selectLanguage')}</Text>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.code}
                style={styles.languageOption}
                onPress={() => {
                  setLanguage(lang.code);
                  setShowLanguageModal(false);
                }}
              >
                <Text style={styles.languageName}>{lang.nativeName}</Text>
                {language === lang.code && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLanguageModal(false)}
            >
              <Text style={styles.closeButtonText}>{t('settings.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Transcription Mode Modal */}
      {showTranscriptionModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Mode de transcription</Text>
            {TRANSCRIPTION_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.value}
                style={styles.optionItem}
                onPress={() => {
                  updateTranscriptionSettings({ mode: mode.value });
                  setShowTranscriptionModal(false);
                }}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{mode.label}</Text>
                  <Text style={styles.optionDescription}>{mode.description}</Text>
                </View>
                {transcriptionSettings.mode === mode.value && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTranscriptionModal(false)}
            >
              <Text style={styles.closeButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Model Modal */}
      {showModelModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Modèle de transcription</Text>
            {MODELS.map((model) => (
              <TouchableOpacity
                key={model.value}
                style={styles.optionItem}
                onPress={() => {
                  updateTranscriptionSettings({ model: model.value });
                  setShowModelModal(false);
                }}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.optionLabel}>{model.label}</Text>
                  <Text style={styles.optionDescription}>{model.description}</Text>
                </View>
                {transcriptionSettings.model === model.value && (
                  <View style={styles.selectedIndicator} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowModelModal(false)}
            >
              <Text style={styles.closeButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Clé API de transcription distante</Text>
            <Text style={styles.modalDescription}>
              Saisissez votre clé API pour l'API de transcription distante
            </Text>
            <TextInput
              style={styles.textInput}
              value={tempApiKey}
              onChangeText={setTempApiKey}
              placeholder="Votre clé API..."
              placeholderTextColor={THEME.colors.text}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowApiKeyModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveApiKey}
              >
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* OpenAI API Key Modal */}
      {showOpenAIKeyModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Clé API OpenAI</Text>
            <Text style={styles.modalDescription}>
              Saisissez votre clé API OpenAI pour utiliser Whisper directement
            </Text>
            <TextInput
              style={styles.textInput}
              value={tempOpenAIKey}
              onChangeText={setTempOpenAIKey}
              placeholder="sk-..."
              placeholderTextColor={THEME.colors.text}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowOpenAIKeyModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveOpenAIKey}
              >
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
  section: {
    marginTop: THEME.spacing.md,
    backgroundColor: THEME.colors.cardBackground,
    paddingHorizontal: THEME.spacing.md,
  },
  sectionTitle: {
    ...THEME.typography.caption,
    marginVertical: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.xs,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: THEME.spacing.sm,
  },
  settingText: {
    ...THEME.typography.body,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    ...THEME.typography.caption,
    marginRight: THEME.spacing.sm,
  },
  versionText: {
    ...THEME.typography.caption,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '80%',
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.lg,
    padding: THEME.spacing.lg,
  },
  modalTitle: {
    ...THEME.typography.h3,
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },
  modalDescription: {
    ...THEME.typography.caption,
    marginBottom: THEME.spacing.md,
    textAlign: 'center',
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  languageName: {
    ...THEME.typography.body,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...THEME.typography.body,
    marginBottom: THEME.spacing.xs,
  },
  optionDescription: {
    ...THEME.typography.caption,
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.accent,
  },
  textInput: {
    ...THEME.typography.body,
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.md,
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: THEME.colors.background,
  },
  saveButton: {
    backgroundColor: THEME.colors.accent,
  },
  cancelButtonText: {
    ...THEME.typography.button,
    color: THEME.colors.text,
  },
  saveButtonText: {
    ...THEME.typography.button,
    color: '#FFF',
  },
  closeButton: {
    marginTop: THEME.spacing.md,
    paddingVertical: THEME.spacing.md,
    alignItems: 'center',
  },
  closeButtonText: {
    ...THEME.typography.button,
    color: THEME.colors.accent,
  },
});