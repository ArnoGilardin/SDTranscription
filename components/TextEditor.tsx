import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { CreditCard as Edit3, Save, X, Type, AlignLeft, AlignCenter, AlignJustify, Bold, Italic, Underline, Copy, Download, RotateCcw, Search, Replace } from 'lucide-react-native';
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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const textInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const editingValue = useSharedValue(0);
  const advancedValue = useSharedValue(0);

  useEffect(() => {
    setEditedText(text);
    updateCounts(text);
  }, [text]);

  useEffect(() => {
    editingValue.value = withSpring(isEditing ? 1 : 0);
  }, [isEditing]);

  useEffect(() => {
    advancedValue.value = withTiming(showAdvancedOptions ? 1 : 0);
  }, [showAdvancedOptions]);

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

  const advancedStyle = useAnimatedStyle(() => ({
    height: withTiming(showAdvancedOptions ? 'auto' : 0),
    opacity: withTiming(showAdvancedOptions ? 1 : 0),
  }));

  return (
    <View style={styles.container}>
      {/* Compact Toolbar */}
      <View style={styles.header}>
        <View style={styles.compactToolbar}>
          {/* Font Size */}
          <View style={styles.toolGroup}>
            {FONT_SIZES.slice(0, 4).map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.compactButton,
                  fontSize === size && styles.compactButtonActive
                ]}
                onPress={() => setFontSize(size)}
              >
                <Text style={[
                  styles.compactButtonText,
                  fontSize === size && styles.compactButtonTextActive
                ]}>
                  {size}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Alignment */}
          <View style={styles.toolGroup}>
            <TouchableOpacity
              style={[
                styles.compactButton,
                textAlign === 'left' && styles.compactButtonActive
              ]}
              onPress={() => setTextAlign('left')}
            >
              <AlignLeft size={14} color={textAlign === 'left' ? '#FFF' : THEME.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.compactButton,
                textAlign === 'center' && styles.compactButtonActive
              ]}
              onPress={() => setTextAlign('center')}
            >
              <AlignCenter size={14} color={textAlign === 'center' ? '#FFF' : THEME.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.compactButton,
                textAlign === 'justify' && styles.compactButtonActive
              ]}
              onPress={() => setTextAlign('justify')}
            >
              <AlignJustify size={14} color={textAlign === 'justify' ? '#FFF' : THEME.colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.toolGroup}>
            <TouchableOpacity
              style={[styles.compactButton, showSearch && styles.compactButtonActive]}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Search size={14} color={showSearch ? '#FFF' : THEME.colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.toolGroup}>
            <TouchableOpacity
              style={styles.compactButton}
              onPress={handleCopy}
            >
              <Copy size={14} color={THEME.colors.accent} />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.compactButton}
              onPress={handleExport}
            >
              <Download size={14} color={THEME.colors.accent} />
            </TouchableOpacity>
          </View>

          {/* Advanced Options Toggle */}
          <TouchableOpacity
            style={[styles.compactButton, showAdvancedOptions && styles.compactButtonActive]}
            onPress={() => setShowAdvancedOptions(!showAdvancedOptions)}
          >
            <Type size={14} color={showAdvancedOptions ? '#FFF' : THEME.colors.accent} />
          </TouchableOpacity>

          {!readOnly && (
            <TouchableOpacity
              style={[styles.compactButton, styles.editButton, isEditing && styles.editButtonActive]}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Edit3 size={14} color={isEditing ? '#FFF' : THEME.colors.accent} />
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
        <View style={styles.searchPanel}>
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
        </View>
      )}

      {/* Advanced Options Panel */}
      {showAdvancedOptions && (
        <Animated.View style={[styles.advancedPanel, advancedStyle]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.advancedRow}>
              {/* All Font Sizes */}
              <View style={styles.advancedGroup}>
                <Text style={styles.advancedLabel}>Taille</Text>
                <View style={styles.advancedOptions}>
                  {FONT_SIZES.map((size) => (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.advancedButton,
                        fontSize === size && styles.advancedButtonActive
                      ]}
                      onPress={() => setFontSize(size)}
                    >
                      <Text style={[
                        styles.advancedButtonText,
                        fontSize === size && styles.advancedButtonTextActive
                      ]}>
                        {size}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Line Heights */}
              <View style={styles.advancedGroup}>
                <Text style={styles.advancedLabel}>Interligne</Text>
                <View style={styles.advancedOptions}>
                  {LINE_HEIGHTS.map((height) => (
                    <TouchableOpacity
                      key={height}
                      style={[
                        styles.advancedButton,
                        lineHeight === height && styles.advancedButtonActive
                      ]}
                      onPress={() => setLineHeight(height)}
                    >
                      <Text style={[
                        styles.advancedButtonText,
                        lineHeight === height && styles.advancedButtonTextActive
                      ]}>
                        {height}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reset */}
              <View style={styles.advancedGroup}>
                <Text style={styles.advancedLabel}>Reset</Text>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={resetFormatting}
                >
                  <RotateCcw size={16} color={THEME.colors.accent} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
  },
  compactToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: THEME.spacing.sm,
  },
  toolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.cardBackground,
    borderRadius: THEME.borderRadius.sm,
    padding: 2,
  },
  compactButton: {
    paddingHorizontal: THEME.spacing.sm,
    paddingVertical: THEME.spacing.xs,
    borderRadius: THEME.borderRadius.sm,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButtonActive: {
    backgroundColor: THEME.colors.accent,
  },
  compactButtonText: {
    ...THEME.typography.caption,
    fontSize: 11,
    fontWeight: '600',
  },
  compactButtonTextActive: {
    color: '#FFF',
  },
  editButton: {
    backgroundColor: THEME.colors.cardBackground,
    borderWidth: 1,
    borderColor: THEME.colors.accent,
  },
  editButtonActive: {
    backgroundColor: THEME.colors.accent,
    borderColor: THEME.colors.accent,
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
  advancedPanel: {
    padding: THEME.spacing.md,
    backgroundColor: THEME.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.cardBorder,
    overflow: 'hidden',
  },
  advancedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: THEME.spacing.lg,
  },
  advancedGroup: {
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  advancedLabel: {
    ...THEME.typography.caption,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  advancedOptions: {
    flexDirection: 'row',
    gap: THEME.spacing.xs,
  },
  advancedButton: {
    padding: THEME.spacing.xs,
    paddingHorizontal: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.cardBackground,
    minWidth: 40,
    alignItems: 'center',
  },
  advancedButtonActive: {
    backgroundColor: THEME.colors.accent,
  },
  advancedButtonText: {
    ...THEME.typography.caption,
    fontSize: 11,
  },
  advancedButtonTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  resetButton: {
    padding: THEME.spacing.sm,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
    minHeight: 300,
  },
  editingContainer: {
    flex: 1,
  },
  textInput: {
    ...THEME.typography.body,
    flex: 1,
    padding: THEME.spacing.md,
    textAlignVertical: 'top',
    minHeight: 300,
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