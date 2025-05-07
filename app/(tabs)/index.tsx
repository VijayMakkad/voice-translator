import React, { useState, useCallback, useEffect } from 'react';
import { StyleSheet, useColorScheme, Pressable, Modal, FlatList, TextInput, ListRenderItem, Alert } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder } from '@/components/AudioRecorder';

interface LanguageMap {
  [key: string]: string;
}

interface Theme {
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  primary: string;
}

interface LanguageSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (language: string) => void;
  theme: Theme;
  currentValue: string;
}

// This matches the language dictionary in translate_audio.py
const LANGUAGES: LanguageMap = {
  'afrikaans': 'af', 'albanian': 'sq', 'amharic': 'am', 'arabic': 'ar', 
  'armenian': 'hy', 'azerbaijani': 'az', 'basque': 'eu', 'belarusian': 'be', 
  'bengali': 'bn', 'bosnian': 'bs', 'bulgarian': 'bg', 'catalan': 'ca', 
  'cebuano': 'ceb', 'chichewa': 'ny', 'chinese (simplified)': 'zh-cn', 
  'chinese (traditional)': 'zh-tw', 'corsican': 'co', 'croatian': 'hr', 
  'czech': 'cs', 'danish': 'da', 'dutch': 'nl', 'english': 'en', 'esperanto': 'eo',  
  'estonian': 'et', 'filipino': 'tl', 'finnish': 'fi', 'french': 'fr', 
  'frisian': 'fy', 'galician': 'gl', 'georgian': 'ka', 'german': 'de', 
  'greek': 'el', 'gujarati': 'gu', 'haitian creole': 'ht', 'hausa': 'ha', 
  'hawaiian': 'haw', 'hebrew': 'he', 'hindi': 'hi', 'hmong': 'hmn', 'hungarian': 'hu', 
  'icelandic': 'is', 'igbo': 'ig', 'indonesian': 'id', 'irish': 'ga', 'italian': 'it', 
  'japanese': 'ja', 'javanese': 'jw', 'kannada': 'kn', 'kazakh': 'kk', 'khmer': 'km', 
  'korean': 'ko', 'kurdish (kurmanji)': 'ku', 'kyrgyz': 'ky', 'lao': 'lo', 'latin': 'la', 
  'latvian': 'lv', 'lithuanian': 'lt', 'luxembourgish': 'lb', 'macedonian': 'mk', 
  'malagasy': 'mg', 'malay': 'ms', 'malayalam': 'ml', 'maltese': 'mt', 'maori': 'mi', 
  'marathi': 'mr', 'mongolian': 'mn', 'myanmar (burmese)': 'my', 'nepali': 'ne', 
  'norwegian': 'no', 'odia': 'or', 'pashto': 'ps', 'persian': 'fa', 'polish': 'pl', 
  'portuguese': 'pt', 'punjabi': 'pa', 'romanian': 'ro', 'russian': 'ru', 
  'samoan': 'sm', 'scots gaelic': 'gd', 'serbian': 'sr', 'sesotho': 'st', 'shona': 'sn', 
  'sindhi': 'sd', 'sinhala': 'si', 'slovak': 'sk', 'slovenian': 'sl', 'somali': 'so', 
  'spanish': 'es', 'sundanese': 'su', 'swahili': 'sw', 'swedish': 'sv', 'tajik': 'tg', 
  'tamil': 'ta', 'telugu': 'te', 'thai': 'th', 'turkish': 'tr', 'ukrainian': 'uk', 
  'urdu': 'ur', 'uyghur': 'ug', 'uzbek': 'uz', 'vietnamese': 'vi', 'welsh': 'cy', 
  'xhosa': 'xh', 'yiddish': 'yi', 'yoruba': 'yo', 'zulu': 'zu'
};

const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  theme,
  currentValue,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const languages = Object.keys(LANGUAGES);
  
  const filteredLanguages = languages.filter(lang =>
    lang.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLanguageItem: ListRenderItem<string> = ({ item }) => (
    <Pressable
      onPress={() => {
        onSelect(item);
        onClose();
      }}
      style={[
        styles.languageItem,
        {
          backgroundColor: currentValue === item ? theme.primary + '20' : 'transparent',
        },
      ]}
    >
      <ThemedText style={[styles.languageItemText, { color: theme.text }]}>
        {item.charAt(0).toUpperCase() + item.slice(1)}
      </ThemedText>
    </Pressable>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <ThemedView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <ThemedView style={[styles.modalHeader, { borderBottomColor: theme.textSecondary + '20' }]}>
          <ThemedText style={[styles.modalTitle, { color: theme.text }]}>Select Language</ThemedText>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.text} />
          </Pressable>
        </ThemedView>

        <ThemedView style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            placeholder="Search languages..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </ThemedView>

        <FlatList
          data={filteredLanguages}
          renderItem={renderLanguageItem}
          keyExtractor={(item: string) => item}
          style={styles.languageList}
        />
      </ThemedView>
    </Modal>
  );
};

const HomeScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [translatedText, setTranslatedText] = useState<string>('');
  const [languages, setLanguages] = useState({ sourceLanguage: 'english', targetLanguage: 'hindi' });
  const [modalVisibility, setModalVisibility] = useState({ source: false, target: false });
  const [serverStatus, setServerStatus] = useState<string | null>(null);

  const theme: Theme = {
    background: colorScheme === 'dark' ? '#1A1A1A' : '#F5F9FF',
    surface: colorScheme === 'dark' ? '#2A2A2A' : '#FFFFFF',
    text: colorScheme === 'dark' ? '#FFFFFF' : '#333333',
    textSecondary: colorScheme === 'dark' ? '#AAAAAA' : '#666666',
    primary: '#4B9CFF',
  };
  
  // Use your IP address here, or make it configurable
  // You can get your IP address from the Metro output
  const API_URL = 'http://172.20.10.4:3000';

  const handleRecordingStatusChange = useCallback((status: boolean) => {
    setIsRecording(status);
  }, []);

  const handleProcessingStatusChange = useCallback((status: boolean) => {
    setIsProcessing(status);
  }, []);

  const handleRecordingComplete = useCallback((text: string) => {
    setTranslatedText(text);
  }, []);

  const { toggleRecording } = useAudioRecorder({
    onRecordingStatusChange: handleRecordingStatusChange,
    onRecordingComplete: handleRecordingComplete,
    onProcessingStatusChange: handleProcessingStatusChange,
    serverUrl: API_URL
  });

  const swapLanguages = () => {
    setLanguages(prev => ({
      sourceLanguage: prev.targetLanguage,
      targetLanguage: prev.sourceLanguage,
    }));
  };

  const handleSourceLanguageSelect = (language: string) => {
    setLanguages(prev => ({
      ...prev,
      sourceLanguage: language
    }));
  };
  
  const handleTargetLanguageSelect = (language: string) => {
    setLanguages(prev => {
      const updatedLanguages = { ...prev, targetLanguage: language };
      updateLanguage(updatedLanguages.targetLanguage); 
      return updatedLanguages;
    });
  };
  
  const updateLanguage = async (targetLanguage: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/language`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ targetLanguage }),
      });
    
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    
      const data = await response.json();
      console.log('Language updated successfully:', data);
    } catch (error) {
      console.error('Failed to update language:', error);
      Alert.alert('Error', 'Failed to update translation language.');
    }
  };
  
  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/health`, { timeout: 5000 });
      if (response.ok) {
        const data = await response.json();
        setServerStatus('connected');
        console.log('Server status:', data);
        
        // Update local state with server's current language
        if (data.currentLanguage) {
          // Find the language name from the code
          const languageName = Object.keys(LANGUAGES).find(
            key => LANGUAGES[key] === data.currentLanguage
          ) || data.currentLanguage;
          
          setLanguages(prev => ({
            ...prev,
            targetLanguage: languageName
          }));
        }
      } else {
        setServerStatus('error');
      }
    } catch (error) {
      console.error('Server health check failed:', error);
      setServerStatus('error');
    }
  };
  
  useEffect(() => {
    // Check server status on component mount
    checkServerStatus();
    
    // Set up periodic health checks
    const interval = setInterval(checkServerStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (languages.targetLanguage) {
      updateLanguage(languages.targetLanguage);
    }
  }, [languages.targetLanguage]);
  
  const toggleModal = (type: 'source' | 'target') => {
    setModalVisibility(prev => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedView style={styles.header}>
        <ThemedText style={[styles.title, { color: theme.text }]}>Voice translator</ThemedText>
        {serverStatus === 'error' && (
          <ThemedView style={styles.serverError}>
            <Ionicons name="alert-circle" size={16} color="#FF4B4B" />
            <ThemedText style={{ color: '#FF4B4B', fontSize: 12, marginLeft: 4 }}>
              Server offline
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      <ThemedView style={styles.languageContainer}>
        <Pressable
          onPress={() => toggleModal('source')}
          style={[styles.languageButton, { backgroundColor: theme.surface }]}
        >
          <ThemedText style={[styles.languageText, { color: theme.text }]}>
            {languages.sourceLanguage.charAt(0).toUpperCase() + languages.sourceLanguage.slice(1)}
          </ThemedText>
        </Pressable>

        <Pressable onPress={swapLanguages} style={styles.switchIcon}>
          <Ionicons name="swap-horizontal" size={24} color={theme.primary} />
        </Pressable>

        <Pressable
          onPress={() => toggleModal('target')}
          style={[styles.languageButton, { backgroundColor: theme.surface }]}
        >
          <ThemedText style={[styles.languageText, { color: theme.text }]}>
            {languages.targetLanguage.charAt(0).toUpperCase() + languages.targetLanguage.slice(1)}
          </ThemedText>
        </Pressable>
      </ThemedView>

      <LanguageSelector
        visible={modalVisibility.source}
        onClose={() => toggleModal('source')}
        onSelect={handleSourceLanguageSelect}
        theme={theme}
        currentValue={languages.sourceLanguage}
      />

      <LanguageSelector
        visible={modalVisibility.target}
        onClose={() => toggleModal('target')}
        onSelect={handleTargetLanguageSelect}
        theme={theme}
        currentValue={languages.targetLanguage}
      />

      <ThemedView style={styles.messageContainer}>
        <ThemedView style={[styles.messageBox, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.messageText, { color: theme.text }]}>
            {translatedText || 'Translated text will appear here'}
          </ThemedText>
        </ThemedView>

        <ThemedView style={[styles.messageBox, { backgroundColor: theme.surface }]}>
          <ThemedText style={[styles.hintText, { color: theme.textSecondary }]}>
            {isProcessing ? 'Processing...' : isRecording ? 'Recording... Tap to stop' : 'Tap the mic button to start'}
          </ThemedText>
        </ThemedView>
      </ThemedView>

      <Pressable 
        onPress={serverStatus === 'error' ? () => Alert.alert('Server Offline', 'Please check your server connection.') : toggleRecording} 
        style={[styles.micButtonContainer, serverStatus === 'error' && styles.disabled]}
        disabled={serverStatus === 'error'}
      >
        <ThemedView style={[
          styles.micButtonGlow, 
          isRecording && styles.recording,
          isProcessing && styles.processing,
          serverStatus === 'error' && styles.offline
        ]}>
          <ThemedView style={[styles.micButton, serverStatus === 'error' && styles.offlineButton]}>
            <Ionicons 
              name={isProcessing ? "ellipsis-horizontal" : "mic"} 
              size={32} 
              color="#fff" 
            />
          </ThemedView>
        </ThemedView>
      </Pressable>
      
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingTop: 68,
  },
  serverError: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    top: 68,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 75, 75, 0.1)',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  languageButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 15,
  },
  languageText: {
    fontSize: 16,
  },
  switchIcon: {
    padding: 8,
  },
  messageContainer: {
    flex: 1,
    padding: 16,
    gap: 16,
  },
  messageBox: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,

  },
  messageControls: {
    backgroundColor:'transperent',
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'flex-end',
  },
  hintText: {
    textAlign: 'center',
    fontSize: 16,
  },
  micButtonContainer: {
    position: 'absolute',
    bottom: 90,
    alignSelf: 'center',
  },
  micButtonGlow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(75, 156, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    backgroundColor: '#4B9CFF',
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4B9CFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  recording: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  processing: {
    backgroundColor: 'rgba(255, 180, 0, 0.2)',
  },
  offline: {
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  offlineButton: {
    backgroundColor: '#888888',
  },
  disabled: {
    opacity: 0.7,
  },
  modalContainer: {
    flex: 1,
    marginTop: 50,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    padding: 4,
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 4,
  },
  languageItemText: {
    fontSize: 16,
  },
});

export default HomeScreen;