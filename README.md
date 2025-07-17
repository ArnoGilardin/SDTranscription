# Transcript - Application de Transcription Audio

Application mobile développée par Arno Gilardin pour la transcription automatique de fichiers audio en texte.

## 🚀 Fonctionnalités

- **Enregistrement audio** avec support multi-intervenants
- **Transcription automatique** via 3 modes :
  - OpenAI Whisper API
  - API distante (gilardinservice.shop)
  - Modèle local (expérimental)
- **Génération de résumés** automatiques
- **Export** en TXT et PDF
- **Bibliothèque** d'enregistrements
- **Interface multilingue** (Français/Anglais)

## 📱 Plateformes supportées

- iOS (iPhone/iPad)
- Android
- Web

## 🛠️ Technologies

- **React Native** avec Expo SDK 52
- **Expo Router** pour la navigation
- **Zustand** pour la gestion d'état
- **OpenAI API** pour la transcription et résumés
- **Expo AV** pour l'enregistrement audio
- **React Native Reanimated** pour les animations

## 🔧 Installation et développement

### Prérequis
- Node.js 18+
- Expo CLI
- EAS CLI (pour les builds)

### Installation
```bash
npm install
```

### Développement
```bash
npm run dev
```

### Builds
```bash
# Build Android (APK)
npm run build:android

# Build iOS
npm run build:ios

# Build production (iOS + Android)
npm run build:production
```

### Déploiement
```bash
# Soumettre à l'App Store
npm run submit:ios

# Soumettre au Google Play Store
npm run submit:android
```

## ⚙️ Configuration

### Variables d'environnement
Créez un fichier `.env` avec :
```
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_key
EXPO_PUBLIC_REMOTE_API_KEY=your_remote_api_key
```

### Configuration EAS
1. Connectez-vous à EAS : `eas login`
2. Configurez le projet : `eas build:configure`
3. Mettez à jour `eas.json` avec vos identifiants

## 📄 Conformité

- **RGPD** : Respect de la réglementation européenne
- **Confidentialité** : Traitement local optionnel
- **CGU** : Conditions d'utilisation intégrées

## 👨‍💻 Développeur

**Arno Gilardin**
- 📧 Email : arno@gilardinservice.com
- 📍 France

## 📝 Licence

Application propriétaire - Tous droits réservés à Arno Gilardin

---

*Version 1.0.1 - Dernière mise à jour : 25 juin 2025*