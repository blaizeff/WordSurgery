import { useState, useEffect } from 'react';

// Minimum word length to include in the dictionary
const MIN_WORD_LENGTH = 3;
// Maximum word length to include (very long words are rarely used in the game)
const MAX_WORD_LENGTH = 15;

export type Language = 'english' | 'french' | 'custom';

export interface LanguageState {
  currentLanguage: Language;
  words: string[];
  isLoading: boolean;
  setLanguage: (lang: Language) => void;
  addCustomDictionary: (url: string) => Promise<void>;
}

export const useLanguage = (): LanguageState => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
  const [words, setWords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customDictionaryUrl, setCustomDictionaryUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        setIsLoading(true);
        let allWords: string[] = [];

        if (currentLanguage === 'english') {
          allWords = require('an-array-of-english-words');
        } else if (currentLanguage === 'french') {
          allWords = require('an-array-of-french-words');
        } else if (currentLanguage === 'custom' && customDictionaryUrl) {
          // Fetch custom dictionary from provided URL
          const response = await fetch(customDictionaryUrl);
          
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
        setWords(allWords);
      } catch (error) {
        console.error('Error loading dictionary:', error);
        // Fallback to English if there's an error
        if (currentLanguage !== 'english') {
          setCurrentLanguage('english');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDictionary();
  }, [currentLanguage, customDictionaryUrl]);

  const setLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
  };

  const addCustomDictionary = async (url: string) => {
    setCustomDictionaryUrl(url);
    setCurrentLanguage('custom');
  };

  return { currentLanguage, words, isLoading, setLanguage, addCustomDictionary };
};
