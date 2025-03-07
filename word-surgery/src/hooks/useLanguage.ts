import { useState, useEffect } from 'react';

export type Language = 'english' | 'french' | 'custom';

export interface LanguageState {
  currentLanguage: Language;
  words: string[];
  setLanguage: (lang: Language) => void;
  addCustomDictionary: (url: string) => Promise<void>;
}

export const useLanguage = (): LanguageState => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
  const [words, setWords] = useState<string[]>([]);
  const [customDictionaryUrl, setCustomDictionaryUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadDictionary = async () => {
      try {
        let loadedWords: string[] = [];

        if (currentLanguage === 'english') {
          loadedWords = require('an-array-of-english-words');
        } else if (currentLanguage === 'french') {
          loadedWords = require('an-array-of-french-words');
        } else if (currentLanguage === 'custom' && customDictionaryUrl) {
          // Fetch custom dictionary from provided URL
          const response = await fetch(customDictionaryUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch custom dictionary: ${response.statusText}`);
          }
          
          const data = await response.json();
          
          if (Array.isArray(data)) {
            loadedWords = data;
          } else {
            throw new Error('Custom dictionary must be an array of words');
          }
        }
        
        setWords(loadedWords);
      } catch (error) {
        console.error('Error loading dictionary:', error);
        // Fallback to English if there's an error
        if (currentLanguage !== 'english') {
          setCurrentLanguage('english');
        }
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

  return { currentLanguage, words, setLanguage, addCustomDictionary };
};
