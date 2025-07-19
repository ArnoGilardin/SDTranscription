# 🚀 Instructions de Build - Application Transcript

## 📋 Prérequis

### Outils requis :
- **Node.js** 18+ 
- **Java JDK** 17+ (pour Android)
- **Android Studio** avec SDK 34
- **EAS CLI** : `npm install -g @expo/eas-cli`

### Variables d'environnement Android :
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

## 🔧 Étapes de Build

### 1. Préparation
```bash
# Nettoyer complètement le projet
npm run clean

# Se connecter à EAS
eas login

# Configurer le projet (première fois seulement)
eas build:configure
```

### 2. Build Android (APK pour test)
```bash
npm run build:android
```

### 3. Build Android Production (AAB pour Play Store)
```bash
npm run build:android:prod
```

### 4. Build iOS
```bash
npm run build:ios
```

## ⚠️ Résolution des erreurs Gradle courantes

### Erreur "Gradle build failed"
```bash
# Solution 1 : Nettoyer complètement
npm run clean
npm run build:android

# Solution 2 : Prebuild manuel
npm run prebuild:android
npm run build:android

# Solution 3 : Vérifier Java version
java -version  # Doit être 17+
```

### Erreur "Out of memory"
```bash
# Augmenter la mémoire Gradle
export GRADLE_OPTS="-Xmx4g -XX:MaxPermSize=512m"
npm run build:android
```

### Erreur "SDK not found"
```bash
# Vérifier Android SDK
echo $ANDROID_HOME
# Doit pointer vers votre SDK Android
```

## 📱 Configuration finale

### Android :
- Générer une clé de signature
- Configurer Google Play Console
- Mettre à jour `serviceAccountKeyPath` dans `eas.json`

### iOS :
- Compte Apple Developer requis
- Certificats configurés dans EAS
- Mettre à jour les identifiants dans `eas.json`

## 🎯 Optimisations appliquées

✅ Metro config optimisé pour Android  
✅ Gradle settings simplifiés  
✅ Mémoire limitée (1 worker)  
✅ Fonctionnalités expérimentales désactivées  
✅ Cache clearing automatique  
✅ Build non-interactif  

## 📞 Support

En cas de problème persistant :
1. Vérifier les prérequis système
2. Nettoyer avec `npm run clean`
3. Vérifier les logs EAS build
4. Contacter le support EAS si nécessaire

---
*Application développée par Arno Gilardin*