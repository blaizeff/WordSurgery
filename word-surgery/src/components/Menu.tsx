import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Modal, 
  Alert, 
  Image,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Language } from '../hooks/useLanguage';

interface MenuProps {
  onStart: () => void;
  onSelectLanguage: (language: Language) => void;
  onAddCustomDictionary: (url: string) => Promise<void>;
  currentLanguage: Language;
}

const Menu: React.FC<MenuProps> = ({ 
  onStart, 
  onSelectLanguage, 
  onAddCustomDictionary, 
  currentLanguage 
}) => {
  const [customUrl, setCustomUrl] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectLanguage = (language: Language) => {
    onSelectLanguage(language);
  };

  const handleAddCustomDictionary = async () => {
    if (!customUrl.trim()) {
      Alert.alert('Error', 'Please enter a valid URL');
      return;
    }

    try {
      setIsLoading(true);
      await onAddCustomDictionary(customUrl);
      setModalVisible(false);
      Alert.alert('Success', 'Custom dictionary loaded successfully!');
    } catch (error) {
      Alert.alert('Error', `Failed to load custom dictionary: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Word Surgery</Text>
          <Text style={styles.subtitle}>Select a language to start playing</Text>
        </View>

        <View style={styles.languageOptions}>
          <TouchableOpacity
            style={[
              styles.languageButton,
              currentLanguage === 'english' && styles.selectedButton
            ]}
            onPress={() => handleSelectLanguage('english')}
          >
            <Text style={[
              styles.buttonText,
              currentLanguage === 'english' && styles.selectedButtonText
            ]}>English</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageButton,
              currentLanguage === 'french' && styles.selectedButton
            ]}
            onPress={() => handleSelectLanguage('french')}
          >
            <Text style={[
              styles.buttonText,
              currentLanguage === 'french' && styles.selectedButtonText
            ]}>French</Text>
          </TouchableOpacity>

          {currentLanguage === 'custom' && (
            <TouchableOpacity
              style={[
                styles.languageButton,
                currentLanguage === 'custom' && styles.selectedButton
              ]}
              onPress={() => handleSelectLanguage('custom')}
            >
              <Text style={[
                styles.buttonText,
                currentLanguage === 'custom' && styles.selectedButtonText
              ]}>Custom Dictionary</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.customButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.customButtonText}>Add Custom Dictionary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.startButton}
          onPress={onStart}
        >
          <Text style={styles.startButtonText}>Start Game</Text>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Add Custom Dictionary</Text>
              <Text style={styles.modalSubtitle}>
                Enter the URL of a JSON file containing an array of words
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
                  disabled={isLoading}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.addButton]}
                  onPress={handleAddCustomDictionary}
                  disabled={isLoading}
                >
                  <Text style={styles.modalButtonText}>
                    {isLoading ? 'Loading...' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
  },
  languageOptions: {
    width: '100%',
    marginBottom: 30,
  },
  languageButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedButton: {
    backgroundColor: '#007bff',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
  },
  selectedButtonText: {
    color: '#fff',
  },
  customButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    padding: 15,
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  customButtonText: {
    fontSize: 16,
    color: '#666',
  },
  startButton: {
    backgroundColor: '#28a745',
    borderRadius: 10,
    padding: 18,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
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
  },
  modalButton: {
    borderRadius: 8,
    padding: 12,
    width: '48%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  addButton: {
    backgroundColor: '#007bff',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});

export default Menu; 