import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Minimum word length to include in the dictionary
const MIN_WORD_LENGTH = 3;
// Maximum word length to include (very long words are rarely used in the game)
const MAX_WORD_LENGTH = 15;

export type Language = 'en' | 'fr' | 'custom';

// Storage key for user language preference
const LANGUAGE_STORAGE_KEY = '@WordSurgery:language';
const CUSTOM_URL_STORAGE_KEY = '@WordSurgery:customDictionaryUrl';

export interface LanguageState {
  currentLanguage: Language;
  words: Set<string>;
  isLoading: boolean;
  setLanguage: (lang: Language) => void;
  addCustomDictionary: (url: string) => Promise<void>;
}

// Define dictionaries outside to avoid blocking UI when file is first loaded
// This will be lazily loaded when actually needed
let englishDictionary: Set<string> | null = null;
let frenchDictionary: Set<string> | null = null;

// Function to load dictionary asynchronously
const loadDictionaryAsync = (
  language: Language, 
  customUrl: string | null,
  callback: (words: Set<string>) => void,
  errorCallback: (error: Error) => void
) => {
  // Create a promise to load the dictionary
  const loadDictionary = async () => {
    try {
      let allWords: Set<string> = new Set();

      if (language === 'en') {
        // Load English dictionary if not already loaded
        if (!englishDictionary) {
          // Use setTimeout to defer the heavy processing
          englishDictionary = await new Promise<Set<string>>((resolve) => {
            setTimeout(() => {
              const words = require('an-array-of-english-words');
              resolve(new Set(words));
            }, 0);
          });
        }
        allWords = englishDictionary;
      } else if (language === 'fr') {
        // Load French dictionary if not already loaded
        if (!frenchDictionary) {
          // Use setTimeout to defer the heavy processing
          frenchDictionary = await new Promise<Set<string>>((resolve) => {
            setTimeout(() => {
              const words = require('an-array-of-french-words');
              resolve(new Set(words));
            }, 0);
          });
        }
        allWords = frenchDictionary;
      } else if (language === 'custom' && customUrl) {
        // Fetch custom dictionary from provided URL
        const response = await fetch(customUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch custom dictionary: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          allWords = new Set(data);
        } else {
          throw new Error('Custom dictionary must be an array of words');
        }
      }
      
      console.log(`Loaded ${allWords.size} words`);
      callback(allWords);
    } catch (error) {
      console.error('Error loading dictionary:', error);
      errorCallback(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  // Start loading the dictionary
  loadDictionary();
};

// Function to save language preference to AsyncStorage
const saveLanguagePreference = async (language: Language, customUrl: string | null) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    
    // If the language is custom, also save the custom URL
    if (language === 'custom' && customUrl) {
      await AsyncStorage.setItem(CUSTOM_URL_STORAGE_KEY, customUrl);
    }
    
    console.log('Language preference saved:', language);
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

// Function to load language preference from AsyncStorage
const loadLanguagePreference = async (): Promise<{ language: Language; customUrl: string | null }> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const savedCustomUrl = await AsyncStorage.getItem(CUSTOM_URL_STORAGE_KEY);
    
    return { 
      language: (savedLanguage as Language) || 'en',
      customUrl: savedCustomUrl
    };
  } catch (error) {
    console.error('Error loading language preference:', error);
    return { language: 'en', customUrl: null };
  }
};

export const useLanguage = (): LanguageState => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [words, setWords] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [customDictionaryUrl, setCustomDictionaryUrl] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Load saved language preference on initial mount
  useEffect(() => {
    const loadSavedPreference = async () => {
      const { language, customUrl } = await loadLanguagePreference();
      
      // Only set the language if one was saved
      if (language) {
        setCurrentLanguage(language);
        if (language === 'custom' && customUrl) {
          setCustomDictionaryUrl(customUrl);
        }
      }
      
      setInitialLoadComplete(true);
    };
    
    loadSavedPreference();
  }, []);

  // Load dictionary when language or custom URL changes
  // Skip the first render if we haven't loaded preferences yet
  useEffect(() => {
    if (!initialLoadComplete) return;
    
    let isMounted = true;
    setIsLoading(true);
    
    // Start the loading process asynchronously
    loadDictionaryAsync(
      currentLanguage,
      customDictionaryUrl,
      (loadedWords) => {
        if (isMounted) {
          setWords(loadedWords);
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Dictionary loading error:', error);
        if (isMounted) {
          // Fallback to English if there's an error
          if (currentLanguage !== 'en') {
            setCurrentLanguage('en');
          } else {
            setIsLoading(false);
          }
        }
      }
    );
    
    // Save language preference when it changes
    saveLanguagePreference(currentLanguage, customDictionaryUrl);
    
    return () => {
      isMounted = false;
    };
  }, [currentLanguage, customDictionaryUrl, initialLoadComplete]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  const addCustomDictionary = async (url: string) => {
    setCustomDictionaryUrl(url);
    setCurrentLanguage('custom');
  };

  return { currentLanguage, words, isLoading, setLanguage, addCustomDictionary };
};
