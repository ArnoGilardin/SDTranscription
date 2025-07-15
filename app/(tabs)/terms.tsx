import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { THEME } from '@/constants/theme';

export default function TermsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={THEME.colors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Conditions d'utilisation</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>⚖️ Conditions Générales d'Utilisation (CGU)</Text>
        <Text style={styles.subtitle}>Application de Transcription Audio – Développée par Arno Gilardin</Text>
        <Text style={styles.lastUpdate}>Dernière mise à jour : 25 juin 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🧠 1. Description de l'application</Text>
          <Text style={styles.paragraph}>
            Cette application permet la transcription automatique de fichiers audio en texte à l'aide de trois moteurs sélectionnables par l'utilisateur :
          </Text>
          <Text style={styles.bulletPoint}>• OpenAI Whisper API</Text>
          <Text style={styles.bulletPoint}>• AssemblyAI API</Text>
          <Text style={styles.bulletPoint}>• Modèle local privé développé et hébergé par Arno Gilardin</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🔒 2. Confidentialité & respect du RGPD</Text>
          <Text style={styles.paragraph}>
            L'application garantit la protection et la confidentialité des données audio transcrites :
          </Text>
          <Text style={styles.bulletPoint}>• Aucune donnée n'est stockée ni utilisée à des fins publicitaires.</Text>
          <Text style={styles.bulletPoint}>
            • Les transcriptions effectuées via le modèle local sont traitées entièrement en local, sur une machine hébergée chez Arno Gilardin, sans envoi vers un serveur tiers.
          </Text>
          <Text style={styles.highlight}>
            ➡️ Cela assure une conformité totale avec le RGPD et les exigences de confidentialité de l'entreprise.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>👤 3. Utilisation autorisée</Text>
          <Text style={styles.bulletPoint}>• L'application est réservée à un usage interne à l'entreprise.</Text>
          <Text style={styles.bulletPoint}>
            • Toute autre utilisation (commerciale, redistribution, revente) sans autorisation écrite d'Arno Gilardin est strictement interdite.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>📜 4. Responsabilité</Text>
          <Text style={styles.paragraph}>Arno Gilardin ne pourra être tenu responsable :</Text>
          <Text style={styles.bulletPoint}>• d'erreurs dans la transcription (accent, bruit de fond, etc.),</Text>
          <Text style={styles.bulletPoint}>• de pertes de données imputables à un usage tiers,</Text>
          <Text style={styles.bulletPoint}>• de l'indisponibilité temporaire des services OpenAI ou AssemblyAI.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🛠️ 5. Propriété intellectuelle</Text>
          <Text style={styles.bulletPoint}>
            • Le code source, l'interface, les modèles et les scripts sont la propriété exclusive d'Arno Gilardin.
          </Text>
          <Text style={styles.bulletPoint}>
            • Toute reproduction, diffusion ou modification sans accord est interdite.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>⚠️ 6. Services tiers</Text>
          <Text style={styles.paragraph}>
            L'application utilise des APIs externes (OpenAI & AssemblyAI). Leur utilisation est soumise à leurs propres politiques :
          </Text>
          <Text style={styles.bulletPoint}>• Politique OpenAI</Text>
          <Text style={styles.bulletPoint}>• Politique AssemblyAI</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>⚖️ 7. Loi applicable</Text>
          <Text style={styles.bulletPoint}>• Les présentes CGU sont régies par la loi française.</Text>
          <Text style={styles.bulletPoint}>• Tout litige sera soumis au tribunal compétent de Versailles.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>👨‍💻 Développeur responsable</Text>
          <Text style={styles.developer}>Arno Gilardin</Text>
          <Text style={styles.bulletPoint}>📍 France</Text>
          <Text style={styles.bulletPoint}>📩 contact : arno@gilardinservice.com</Text>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    paddingTop: 60,
    backgroundColor: THEME.colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  backButton: {
    padding: THEME.spacing.sm,
    marginRight: THEME.spacing.sm,
  },
  title: {
    ...THEME.typography.h2,
    flex: 1,
  },
  content: {
    flex: 1,
    padding: THEME.spacing.md,
  },
  sectionTitle: {
    ...THEME.typography.h2,
    textAlign: 'center',
    marginBottom: THEME.spacing.sm,
  },
  subtitle: {
    ...THEME.typography.body,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
  },
  lastUpdate: {
    ...THEME.typography.caption,
    textAlign: 'center',
    marginBottom: THEME.spacing.lg,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: THEME.spacing.lg,
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  sectionHeader: {
    ...THEME.typography.h3,
    marginBottom: THEME.spacing.md,
    color: THEME.colors.accent,
  },
  paragraph: {
    ...THEME.typography.body,
    lineHeight: 24,
    marginBottom: THEME.spacing.sm,
  },
  bulletPoint: {
    ...THEME.typography.body,
    lineHeight: 22,
    marginBottom: THEME.spacing.xs,
    marginLeft: THEME.spacing.sm,
  },
  highlight: {
    ...THEME.typography.body,
    lineHeight: 22,
    marginTop: THEME.spacing.sm,
    fontWeight: '600',
    color: THEME.colors.accent,
  },
  developer: {
    ...THEME.typography.body,
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
  },
  bottomSpacing: {
    height: THEME.spacing.xxl,
  },
});