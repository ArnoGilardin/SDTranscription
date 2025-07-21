import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { 
  Edit3, 
  Save, 
  X, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Copy,
  Download,
  RotateCcw,
  Search,
  Replace
} from 'lucide-react-native';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  useSharedValue,
  withTiming
} from 'react-native-reanimated';
import { THEME } from '@/constants/theme';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface TextEditorProps {
  text: string;
  title: string;
  onSave: (newText: string) => void;
  readOnly?: boolean;
}

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28];
const LINE_HEIGHTS = [1.2, 1.4, 1.6, 1.8, 2.0];

export default function TextEditor({ text, title, onSave, readOnly = false }: TextEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);
  const [fontSize, setFontSize] = useState(16);
  const [lineHeight, setLineHeight] = useState(1.6);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'justify'>('left');
  const [showFormatting, setShowFormatting] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const textInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const editingValue = useSharedValue(0);
  const formattingValue = useSharedValue(0);

  useEffect(() => {
    setEditedText(text);
    updateCounts(text);
  }, [text]);

  useEffect(() => {
    editingValue.value = withSpring(isEditing ? 1 : 0);
  }, [isEditing]);

  useEffect(() => {
    formattingValue.value = withTiming(showFormatting ? 1 : 0);
  }, [showFormatting]);

  const updateCounts = (textContent: string) => {
    const words = textContent.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(textContent.length);
  };

  const handleTextChange = (newText: string) => {
    setEditedText(newText);
    updateCounts(newText);
  };

  const handleSave = () => {
    onSave(editedText);
    setIsEditing(false);
    Alert.alert('Succès', 'Transcription sauvegardée avec succès !');
  };

  const handleCancel = () => {
    setEditedText(text);
    setIsEditing(false);
    updateCounts(text);
  };

  const handleCopy = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(editedText);
      } else {
        // For mobile, we'll use a simple alert since Clipboard API might not be available
        Alert.alert('Texte copié', 'Le texte a été copié dans le presse-papiers');
      }
      Alert.alert('Copié', 'Texte copié dans le presse-papiers !');
    } catch (error) {
      console.error('Copy error:', error);
      Alert.alert('Erreur', 'Impossible de copier le texte');
    }
  };

  const handleExport = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.txt`;

      if (Platform.OS === 'web') {
        const blob = new Blob([editedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, editedText);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        }
      }
      
      Alert.alert('Export réussi', 'Le fichier a été exporté avec succès !');
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter le fichier');
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    const index = editedText.toLowerCase().indexOf(searchQuery.toLowerCase());
    if (index !== -1) {
      // For web, we can use selection
      if (Platform.OS === 'web' && textInputRef.current) {
        (textInputRef.current as any).setSelectionRange(index, index + searchQuery.length);
        textInputRef.current.focus();
      }
    } else {
      Alert.alert('Recherche', 'Texte non trouvé');
    }
  };

  const handleReplace = () => {
    if (!searchQuery.trim()) return;
    
    const newText = editedText.replace(
      new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
      replaceQuery
    );
    
    if (newText !== editedText) {
      setEditedText(newText);
      updateCounts(newText);
      Alert.alert('Remplacement', 'Texte remplacé avec succès !');
    } else {
      Alert.alert('Remplacement', 'Aucune occurrence trouvée');
    }
  };

  const handleReplaceAll = () => {
    if (!searchQuery.trim()) return;
    
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const matches = editedText.match(regex);
    const newText = editedText.replace(regex, replaceQuery);
    
    if (newText !== editedText) {
      setEditedText(newText);
      updateCounts(newText);
      Alert.alert('Remplacement', `${matches?.length || 0} occurrence(s) remplacée(s) !`);
    } else {
      Alert.alert('Remplacement', 'Aucune occurrence trouvée');
    }
  };

  const resetFormatting = () => {
    setFontSize(16);
    setLineHeight(1.6);
    setTextAlign('left');
  };

  const editingStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(
      isEditing ? THEME.colors.accent + '10' : THEME.colors.background,
      { duration: 300 }
    ),
  }));

  const formattingStyle = useAnimatedStyle(() => ({
    height: withTiming(showFormatting ? 'auto' : 0),
    opacity: withTiming(showFormatting ? 1 : 0),
  }));

  return (
    <View style={styles.container}>
      {/* Header with actions */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Type size={20} color={THEME.colors.accent} />
          <Text style={styles.headerTitle}>Éditeur de texte</Text>
        </View>
        
        <View style={styles.headerActions}>
          {!readOnly && (
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setShowFormatting(!showFormatting)}
            >
              <Bold size={18} color={THEME.colors.accent} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Search size={18} color={THEME.colors.accent} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleCopy}
          >
            <Copy size={18} color={THEME.colors.accent} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleExport}
          >
            <Download size={18} color={THEME.colors.accent} />
          </TouchableOpacity>
          
          {!readOnly && (
            <TouchableOpacity
              style={[styles.headerButton, isEditing && styles.editingButton]}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Edit3 size={18} color={isEditing ? '#FFF' : THEME.colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Text style={styles.statText}>{wordCount} mots</Text>
        <Text style={styles.statText}>{charCount} caractères</Text>
        {isEditing && <Text style={styles.statText}>Mode édition</Text>}
      </View>

      {/* Search Panel */}
      {showSearch && (
        <Animated.View style={styles.searchPanel}>
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              placeholderTextColor={THEME.colors.text + '80'}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
            >
              <Search size={16} color={THEME.colors.accent} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Remplacer par..."
              placeholderTextColor={THEME.colors.text + '80'}
              value={replaceQuery}
              onChangeText={setReplaceQuery}
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleReplace}
            >
              <Replace size={16} color={THEME.colors.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleReplaceAll}
            >
              <Text style={styles.replaceAllText}>Tout</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Formatting Panel */}
      {showFormatting && (
        <Animated.View style={[styles.formattingPanel, formattingStyle]}>
          <View style={styles.formattingSection}>
            <Text style={styles.formattingLabel}>Taille de police</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.formattingOptions}>
                {FONT_SIZES.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.formattingButton,
                      fontSize === size && styles.formattingButtonActive
                    ]}
                    onPress={() => setFontSize(size)}
                  >
                    <Text style={[
                      styles.formattingButtonText,
                      fontSize === size && styles.formattingButtonTextActive
                    ]}>
                      {size}px
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.formattingSection}>
            <Text style={styles.formattingLabel}>Interligne</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.formattingOptions}>
                {LINE_HEIGHTS.map((height) => (
                  <TouchableOpacity
                    key={height}
                    style={[
                      styles.formattingButton,
                      lineHeight === height && styles.formattingButtonActive
                    ]}
                    onPress={() => setLineHeight(height)}
                  >
                    <Text style={[
                      styles.formattingButtonText,
                      lineHeight === height && styles.formattingButtonTextActive
                    ]}>
                      {height}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.formattingSection}>
            <Text style={styles.formattingLabel}>Alignement</Text>
            <View style={styles.formattingOptions}>
              <TouchableOpacity
                style={[
                  styles.formattingButton,
                  textAlign === 'left' && styles.formattingButtonActive
                ]}
                onPress={() => setTextAlign('left')}
              >
                <AlignLeft size={16} color={textAlign === 'left' ? '#FFF' : THEME.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formattingButton,
                  textAlign === 'center' && styles.formattingButtonActive
                ]}
                onPress={() => setTextAlign('center')}
              >
                <AlignCenter size={16} color={textAlign === 'center' ? '#FFF' : THEME.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.formattingButton,
                  textAlign === 'justify' && styles.formattingButtonActive
                ]}
                onPress={() => setTextAlign('justify')}
              >
                <AlignJustify size={16} color={textAlign === 'justify' ? '#FFF' : THEME.colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFormatting}
              >
                <RotateCcw size={16} color={THEME.colors.accent} />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Text Content */}
      <Animated.View style={[styles.textContainer, editingStyle]}>
        {isEditing ? (
          <View style={styles.editingContainer}>
            <TextInput
              ref={textInputRef}
              style={[
                styles.textInput,
                {
                  fontSize,
                  lineHeight: fontSize * lineHeight,
                  textAlign,
                }
              ]}
              value={editedText}
              onChangeText={handleTextChange}
              multiline
              placeholder="Saisissez votre texte ici..."
              placeholderTextColor={THEME.colors.text + '60'}
              textAlignVertical="top"
              onSelectionChange={(event) => {
                const { start, end } = event.nativeEvent.selection;
                const selected = editedText.substring(start, end);
                setSelectedText(selected);
              }}
            />
            
            <View style={styles.editingActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <X size={16} color={THEME.colors.error} />
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
              >
                <Save size={16} color="#FFF" />
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.readOnlyContainer}
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={[
                styles.readOnlyText,
                {
                  fontSize,
                  lineHeight: fontSize * lineHeight,
                  textAlign,
                }
              ]}
              selectable
            >
              {editedText}
            </Text>
          </ScrollView>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    ...THEME.typography.body,
    marginLeft: THEME.spacing.sm,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  headerButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.full,
    backgroundColor: THEME.colors.cardBackground,
  },
  editingButton: {
    backgroundColor: THEME.colors.accent,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    backgroundColor: THEME.colors.background + '80',
  },
  statText: {
    ...THEME.typography.caption,
    fontSize: 12,
  },
  searchPanel: {
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
    gap: THEME.spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...THEME.typography.body,
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.sm,
    padding: THEME.spacing.sm,
    borderWidth: 1,
    borderColor: THEME.colors.cardBorder,
  },
  searchButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.accent + '20',
  },
  replaceAllText: {
    ...THEME.typography.caption,
    color: THEME.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  formattingPanel: {
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
    gap: THEME.spacing.md,
  },
  formattingSection: {
    gap: THEME.spacing.sm,
  },
  formattingLabel: {
    ...THEME.typography.caption,
    fontWeight: '600',
  },
  formattingOptions: {
    flexDirection: 'row',
    gap: THEME.spacing.sm,
  },
  formattingButton: {
    padding: THEME.spacing.sm,
    paddingHorizontal: THEME.spacing.md,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.cardBackground,
    minWidth: 50,
    alignItems: 'center',
  },
  formattingButtonActive: {
    backgroundColor: THEME.colors.accent,
  },
  formattingButtonText: {
    ...THEME.typography.caption,
    fontSize: 12,
  },
  formattingButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  resetButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.cardBackground,
    marginLeft: THEME.spacing.sm,
  },
  textContainer: {
    flex: 1,
    minHeight: 200,
  },
  editingContainer: {
    flex: 1,
  },
  textInput: {
    ...THEME.typography.body,
    flex: 1,
    padding: THEME.spacing.md,
    textAlignVertical: 'top',
    minHeight: 200,
    color: THEME.colors.text,
  },
  editingActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.cardBorder,
    gap: THEME.spacing.md,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.cardBackground,
    borderWidth: 1,
    borderColor: THEME.colors.error,
    gap: THEME.spacing.sm,
  },
  cancelButtonText: {
    ...THEME.typography.button,
    color: THEME.colors.error,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.md,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.accent,
    gap: THEME.spacing.sm,
  },
  saveButtonText: {
    ...THEME.typography.button,
    color: '#FFF',
  },
  readOnlyContainer: {
    flex: 1,
    padding: THEME.spacing.md,
  },
  readOnlyText: {
    ...THEME.typography.body,
    lineHeight: 24,
    color: THEME.colors.text,
  },
});