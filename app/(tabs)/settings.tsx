import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Globe as Globe2 } from 'lucide-react-native';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Language } from '@/types/i18n';
import { THEME } from '@/constants/theme';

const LANGUAGES = [
  { code: 'en' as Language, name: 'English', nativeName: 'English' },
  { code: 'fr' as Language, name: 'French', nativeName: 'Français' }
];

export default function SettingsScreen() {
  const { language, setLanguage, t } = useLanguage();
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  const currentLanguage = LANGUAGES.find(lang => lang.code === language);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings.title')}</Text>
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

        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingText}>{t('settings.termsOfService')}</Text>
          <ChevronRight size={20} color={THEME.colors.text} />
        </TouchableOpacity>

        <View style={styles.settingItem}>
          <Text style={styles.settingText}>{t('settings.version')}</Text>
          <Text style={styles.versionText}>1.0.0</Text>
        </View>
      </View>

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
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.accent,
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