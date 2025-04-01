import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'fr';
export type DictionarySource = 'default' | 'custom';

const LANGUAGE_STORAGE_KEY = '@WordSurgery:language';
const DICTIONARY_SOURCE_STORAGE_KEY = '@WordSurgery:dictionarySource';
const CUSTOM_URL_STORAGE_KEY = '@WordSurgery:customDictionaryUrl';

export interface LanguageState {
  currentLanguage: Language;
  dictionarySource: DictionarySource;
  words: Set<string>;
  wordsArray: string[];
  isLoading: boolean;
  setLanguage: (lang: Language) => void;
  addCustomDictionary: (url: string) => Promise<void>;
  removeCustomDictionary: () => Promise<void>;
}

let englishDictionary: Array<string> | null = null;
let frenchDictionary: Array<string> | null = null;

const loadDictionaryAsync = (
  language: Language, 
  source: DictionarySource,
  customUrl: string | null,
  callback: (words: Array<string>) => void,
  errorCallback: (error: Error) => void
) => {
  const loadDictionary = async () => {
    try {
      let allWords: Array<string> = [];

      if (source === 'default') {
        if (language === 'en') {
          if (!englishDictionary) {
            englishDictionary = await new Promise<Array<string>>((resolve) => {
              setTimeout(() => {
                const words = require('an-array-of-english-words');
                resolve(words);
              }, 0);
            });
          }
          allWords = englishDictionary;
        } else if (language === 'fr') {
          if (!frenchDictionary) {
            frenchDictionary = await new Promise<Array<string>>((resolve) => {
              setTimeout(() => {
                const words = require('an-array-of-french-words');
                resolve(words);
              }, 0);
            });
          }
          allWords = frenchDictionary;
        }
      } else if (source === 'custom' && customUrl) {
        const response = await fetch(customUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch custom dictionary: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (Array.isArray(data)) {
          allWords = data;
        } else {
          throw new Error('Custom dictionary must be an array of words');
        }
      }
      
      console.log(`Loaded ${allWords.length} words`);
      callback(allWords);
    } catch (error) {
      console.error('Error loading dictionary:', error);
      errorCallback(error instanceof Error ? error : new Error('Unknown error'));
    }
  };

  loadDictionary();
};

const savePreferences = async (language: Language, source: DictionarySource, customUrl: string | null) => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    await AsyncStorage.setItem(DICTIONARY_SOURCE_STORAGE_KEY, source);
    
    if (source === 'custom' && customUrl) {
      await AsyncStorage.setItem(CUSTOM_URL_STORAGE_KEY, customUrl);
    }
    
    console.log('Preferences saved:', { language, source });
  } catch (error) {
    console.error('Error saving preferences:', error);
  }
};

const loadPreferences = async (): Promise<{ 
  language: Language; 
  source: DictionarySource;
  customUrl: string | null 
}> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    const savedSource = await AsyncStorage.getItem(DICTIONARY_SOURCE_STORAGE_KEY);
    const savedCustomUrl = await AsyncStorage.getItem(CUSTOM_URL_STORAGE_KEY);
    
    return { 
      language: (savedLanguage as Language) || 'en',
      source: (savedSource as DictionarySource) || 'default',
      customUrl: savedCustomUrl
    };
  } catch (error) {
    console.error('Error loading preferences:', error);
    return { language: 'en', source: 'default', customUrl: null };
  }
};

export const useLanguage = (): LanguageState => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('en');
  const [dictionarySource, setDictionarySource] = useState<DictionarySource>('default');
  const [words, setWords] = useState<Set<string>>(new Set());
  const [wordsArray, setWordsArray] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customDictionaryUrl, setCustomDictionaryUrl] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Load saved preferences on initial mount
  useEffect(() => {
    const loadSavedPreference = async () => {
      const { language, source, customUrl } = await loadPreferences();
      
      setCurrentLanguage(language);
      setDictionarySource(source);
      if (source === 'custom' && customUrl) {
        setCustomDictionaryUrl(customUrl);
      }
      
      setInitialLoadComplete(true);
    };
    
    loadSavedPreference();
  }, []);

  // Load dictionary when language or source changes
  useEffect(() => {
    if (!initialLoadComplete) return;
    
    let isMounted = true;
    setIsLoading(true);
    
    loadDictionaryAsync(
      currentLanguage,
      dictionarySource,
      customDictionaryUrl,
      (loadedWords) => {
        if (isMounted) {
          setWords(new Set(loadedWords));
          setWordsArray(loadedWords);
          setIsLoading(false);
        }
      },
      (error) => {
        console.error('Dictionary loading error:', error);
        if (isMounted) {
          if (dictionarySource === 'custom') {
            setDictionarySource('default');
          } else {
            setIsLoading(false);
          }
        }
      }
    );
    
    savePreferences(currentLanguage, dictionarySource, customDictionaryUrl);
    
    return () => {
      isMounted = false;
    };
  }, [currentLanguage, dictionarySource, customDictionaryUrl, initialLoadComplete]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  const addCustomDictionary = async (url: string) => {
    setCustomDictionaryUrl(url);
    setDictionarySource('custom');
  };

  const removeCustomDictionary = async () => {
    setDictionarySource('default');
  };

  return { 
    currentLanguage, 
    dictionarySource, 
    words, 
    wordsArray, 
    isLoading, 
    setLanguage, 
    addCustomDictionary, 
    removeCustomDictionary 
  };
};
