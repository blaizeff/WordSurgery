import { Word } from "src/classes/Word";

// Min/max word length constraints for word generation
export const MIN_WORD_GEN_LENGTH = 5;
export const MAX_WORD_GEN_LENGTH = 8;

// Min/max word length constraints for word detection
export const MIN_WORD_DETECT_LENGTH = 3;

// Divider widths
export const DIVIDER_ACTIVE_WIDTH = 6;
export const DIVIDER_INACTIVE_WIDTH = 2;

// Divider height 
export const DIVIDER_HEIGHT = 60;

// For debug purposes
export const DEBUG = true;

// Helper function to get 2 random words from the dictionary with acceptable length
export const generateRandomWords = (dictArray: string[]): { currentWord: Word, availableWord: Word } => {
  const maxAttempts = 1000;

  const firstIndex = Math.floor(Math.random() * (dictArray.length - maxAttempts));
  const secondIndex = Math.floor(Math.random() * (dictArray.length - maxAttempts));

  for (let i = firstIndex; i < firstIndex + maxAttempts; i++) {
    const word1 = dictArray[i];
    if (word1.length < MIN_WORD_GEN_LENGTH || word1.length > MAX_WORD_GEN_LENGTH) {
      continue;
    }
    for (let j = secondIndex; j < secondIndex + maxAttempts; j++) {
      const word2 = dictArray[j];
      if (word2.length < MIN_WORD_GEN_LENGTH || word2.length > MAX_WORD_GEN_LENGTH) {
        continue;
      }
    
      const currentWordObj = new Word(word1);
      const availableWordObj = new Word(word2);
      
      currentWordObj.letters = currentWordObj.letters.map((letter, index) => ({
        ...letter,
        initialPosition: index
      }));
      
      availableWordObj.letters = availableWordObj.letters.map((letter, index) => ({
        ...letter,
        originalIndex: index
      }));
      
      return { currentWord: currentWordObj, availableWord: availableWordObj };
    }
  }
  
  const fallbackCurrent = new Word('voiture');
  fallbackCurrent.letters = fallbackCurrent.letters.map((letter, index) => ({
    ...letter,
    initialPosition: index
  }));
  
  const fallbackAvailable = new Word('verrat');
  fallbackAvailable.letters = fallbackAvailable.letters.map((letter, index) => ({
    ...letter,
    originalIndex: index
  }));
  
  return { 
    currentWord: fallbackCurrent, 
    availableWord: fallbackAvailable
  };
};