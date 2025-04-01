import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert, 
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Language, DictionarySource } from '../hooks/useLanguage';
import { useTranslation } from 'src/hooks/useTranslation';

interface MenuProps {
  onStart: () => void;
  onSelectLanguage: (language: Language) => void;
  onAddCustomDictionary: (url: string) => Promise<void>;
  onRemoveCustomDictionary: () => Promise<void>;
  currentLanguage: Language;
  dictionarySource: DictionarySource;
  isLoading: boolean;
}

const Menu: React.FC<MenuProps> = ({ 
  onStart, 
  onSelectLanguage, 
  onAddCustomDictionary,
  onRemoveCustomDictionary,
  currentLanguage,
  dictionarySource,
  isLoading
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const { t } = useTranslation(currentLanguage);
    
  const isCurrentlyLoading = isLoading || localLoading || isAddingCustom;
  
  const handleSelectLanguage = (language: Language) => {
    if (isCurrentlyLoading) return;
    
    setLocalLoading(true);
    
    onSelectLanguage(language);
    
    const checkLoadingInterval = setInterval(() => {
      if (!isLoading) {
        setLocalLoading(false);
        clearInterval(checkLoadingInterval);
      }
    }, 200);
    
    setTimeout(() => {
      clearInterval(checkLoadingInterval);
    }, 10000);
  };

  const handleAddCustomDictionary = async () => {
    if (!customUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    try {
      setIsAddingCustom(true);
      await onAddCustomDictionary(customUrl);
      setModalVisible(false);
      Alert.alert('Success', 'Custom dictionary loaded successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to load custom dictionary: ${error}`);
    } finally {
      setIsAddingCustom(false);
    }
  };

  const handleRemoveCustomDictionary = () => {
    Alert.alert(
      t('menu.remove_dictionary_title'),
      t('menu.remove_dictionary_message'),
      [
        {
          text: t('menu.cancel'),
          style: 'cancel',
        },
        {
          text: t('menu.remove'),
          onPress: async () => {
            setLocalLoading(true);
            await onRemoveCustomDictionary();
            setLocalLoading(false);
          },
          style: 'destructive',
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.contentContainer}>
        <View style={styles.topContent}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('menu.title')}</Text>
            <Text style={styles.subtitle}>{t('menu.subtitle')}</Text>
          </View>
        </View>

        <View style={styles.bottomContent}>
          {isCurrentlyLoading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3A63ED" />
              <Text style={styles.loadingText}>{t('menu.loading')}</Text>
            </View>
          ) : null}

          <View style={[
            styles.languageOptions,
            isCurrentlyLoading && styles.disabledContent
          ]}>
            <View style={styles.languageToggleContainer}>
              <TouchableOpacity
                style={[
                  styles.languageToggleButton,
                  currentLanguage === 'en' && styles.selectedToggleButton
                ]}
                onPress={() => handleSelectLanguage('en')}
                disabled={isCurrentlyLoading}
              >
                <Text style={[
                  styles.toggleButtonText,
                  currentLanguage === 'en' && styles.selectedToggleButtonText
                ]}>{t('menu.button_english')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.languageToggleButton,
                  currentLanguage === 'fr' && styles.selectedToggleButton
                ]}
                onPress={() => handleSelectLanguage('fr')}
                disabled={isCurrentlyLoading}
              >
                <Text style={[
                  styles.toggleButtonText,
                  currentLanguage === 'fr' && styles.selectedToggleButtonText
                ]}>{t('menu.button_french')}</Text>
              </TouchableOpacity>
            </View>

            {dictionarySource === 'custom' ? (
              <View style={styles.customDictionaryContainer}>
                <TouchableOpacity
                  style={styles.customDictionaryActive}
                  onPress={() => setModalVisible(true)}
                  disabled={isCurrentlyLoading}
                >
                  <Text style={styles.customDictionaryLinkText}>
                    {t('menu.button_change_dictionary')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.removeCustomDictionary}
                  onPress={handleRemoveCustomDictionary}
                  disabled={isCurrentlyLoading}
                >
                  <Text style={styles.removeCustomDictionaryText}>
                    {t('menu.button_remove_dictionary')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.customDictionaryLink}
                onPress={() => setModalVisible(true)}
                disabled={isCurrentlyLoading}
              >
                <Text style={styles.customDictionaryLinkText}>
                  {t('menu.button_add_dictionary')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.startButton,
              isCurrentlyLoading && styles.disabledButton
            ]}
            onPress={onStart}
            disabled={isCurrentlyLoading}
          >
            <Text style={styles.startButtonText}>
              {t('menu.button_start_game')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('menu.modal_title')}</Text>
            <Text style={styles.modalSubtitle}>
              {t('menu.modal_subtitle')}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="https://example.com/dictionary.json"
              value={customUrl}
              onChangeText={setCustomUrl}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
                disabled={isAddingCustom}
              >
                <Text style={styles.cancelButtonText}>{t('menu.cancel')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={handleAddCustomDictionary}
                disabled={isAddingCustom}
              >
                {isAddingCustom ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>{t('menu.add')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContent: {
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  bottomContent: {
    paddingBottom: 40,
  },
  languageOptions: {
    width: '80%',
    alignItems: 'center',
    marginBottom: 30,
    alignSelf: 'center',
  },
  languageToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    marginBottom: 10,
    overflow: 'hidden',
    width: '100%',
    alignSelf: 'center',
  },
  languageToggleButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedToggleButton: {
    backgroundColor: '#000',
    borderRadius: 25,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  selectedToggleButtonText: {
    color: '#fff',
  },
  customDictionaryContainer: {
    width: '100%',
    alignItems: 'center',
  },
  customDictionaryLink: {
    padding: 8,
    marginBottom: 15,
  },
  customDictionaryLinkText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  customDictionaryActive: {
    padding: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeCustomDictionary: {
    padding: 4,
    marginBottom: 15,
  },
  removeCustomDictionaryText: {
    fontSize: 12,
    color: '#ff3b30',
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#3A63ED',
    borderRadius: 100,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 10,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    width: '85%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    width: '100%',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  modalButton: {
    padding: 12,
    width: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
  },
  addButton: {
    backgroundColor: '#3A63ED',
    borderRadius: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
    borderRadius: 15,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  disabledContent: {
    opacity: 0.5,
  },
});

export default Menu; 