import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import { THEME } from '@/constants/theme';

export default function PrivacyScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={THEME.colors.accent} />
        </TouchableOpacity>
        <Text style={styles.title}>Politique de confidentialité</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>📜 Politique de confidentialité</Text>
        <Text style={styles.subtitle}>Application de transcription — développée par Arno Gilardin</Text>
        <Text style={styles.lastUpdate}>Version 1.0 — Dernière mise à jour : 25 juin 2025</Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🔐 1. Responsable du traitement</Text>
          <Text style={styles.paragraph}>
            Le responsable du traitement des données personnelles est :
          </Text>
          <Text style={styles.developer}>Arno Gilardin</Text>
          <Text style={styles.bulletPoint}>📩 Email : arno@gilardinservice.com</Text>
          <Text style={styles.bulletPoint}>📍 France</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🎯 2. Données collectées</Text>
          <Text style={styles.paragraph}>
            L'application peut traiter les types de données suivants :
          </Text>
          <Text style={styles.bulletPoint}>• Fichiers audio fournis par l'utilisateur (pour transcription uniquement)</Text>
          <Text style={styles.bulletPoint}>• Résultats textuels des transcriptions</Text>
          <Text style={styles.bulletPoint}>• Clés API (locales) si configurées manuellement</Text>
          <Text style={styles.highlight}>
            Aucune donnée n'est utilisée à des fins publicitaires ou revendues à des tiers.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🧠 3. Traitement local ou distant</Text>
          <Text style={styles.paragraph}>
            Trois modes de transcription sont proposés :
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>OpenAI Whisper (API)</Text> : les données sont envoyées vers les serveurs d'OpenAI (sous leur politique de confidentialité).
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>AssemblyAI (API)</Text> : les données sont transmises à AssemblyAI.
          </Text>
          <Text style={styles.bulletPoint}>
            • <Text style={styles.bold}>Modèle local</Text> : aucune donnée ne quitte votre infrastructure. Le traitement s'effectue en local, garantissant :
          </Text>
          <Text style={styles.subBulletPoint}>- La confidentialité des données,</Text>
          <Text style={styles.subBulletPoint}>- Le respect du RGPD,</Text>
          <Text style={styles.subBulletPoint}>- L'absence de toute fuite ou stockage tiers.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>⏱️ 4. Durée de conservation</Text>
          <Text style={styles.paragraph}>
            L'application ne conserve aucune donnée audio ni transcription après traitement, sauf si l'utilisateur active explicitement une option de sauvegarde temporaire.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🔄 5. Partage avec des tiers</Text>
          <Text style={styles.bulletPoint}>• Aucun partage automatique n'est réalisé.</Text>
          <Text style={styles.bulletPoint}>• L'utilisateur est seul décisionnaire de l'export ou de la diffusion des résultats.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🔧 6. Sécurité</Text>
          <Text style={styles.paragraph}>
            L'application intègre des mécanismes de :
          </Text>
          <Text style={styles.bulletPoint}>• Traitement hors ligne via le modèle local,</Text>
          <Text style={styles.bulletPoint}>• Connexions sécurisées pour les appels API (HTTPS),</Text>
          <Text style={styles.bulletPoint}>• Aucune base de données distante.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>📬 7. Droits des utilisateurs (RGPD)</Text>
          <Text style={styles.paragraph}>
            Conformément à la réglementation européenne (RGPD), vous disposez des droits suivants :
          </Text>
          <Text style={styles.bulletPoint}>• Droit d'accès à vos données,</Text>
          <Text style={styles.bulletPoint}>• Droit de rectification ou suppression,</Text>
          <Text style={styles.bulletPoint}>• Droit à la limitation ou opposition au traitement.</Text>
          <Text style={styles.highlight}>
            📩 Pour toute demande, contactez : arno@gilardinservice.com
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>🧾 8. Mises à jour</Text>
          <Text style={styles.paragraph}>
            Cette politique peut évoluer. Vous serez informé directement dans l'application via l'écran CGU.
          </Text>
        </View>

        <View style={styles.acceptanceSection}>
          <Text style={styles.acceptance}>
            💬 En utilisant cette application, vous acceptez cette politique de confidentialité.
          </Text>
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
  subBulletPoint: {
    ...THEME.typography.body,
    lineHeight: 22,
    marginBottom: THEME.spacing.xs,
    marginLeft: THEME.spacing.lg,
    fontSize: 14,
  },
  highlight: {
    ...THEME.typography.body,
    lineHeight: 22,
    marginTop: THEME.spacing.sm,
    fontWeight: '600',
    color: THEME.colors.accent,
  },
  bold: {
    fontWeight: '600',
  },
  developer: {
    ...THEME.typography.body,
    fontWeight: '600',
    marginBottom: THEME.spacing.xs,
  },
  acceptanceSection: {
    backgroundColor: THEME.colors.cardBackground,
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.accent,
    marginBottom: THEME.spacing.lg,
  },
  acceptance: {
    ...THEME.typography.body,
    textAlign: 'center',
    fontWeight: '600',
    color: THEME.colors.accent,
  },
  bottomSpacing: {
    height: THEME.spacing.xxl,
  },
});