import { useState, useCallback, useEffect, useRef } from "react";
import { Word } from "../../classes/Word";
import { ILetter } from "../../interfaces/ILetter";
import { throttle } from 'lodash';
import { DetectedWord } from "../../components/game/interfaces";
import { DEBUG, MIN_WORD_DETECT_LENGTH } from "../../utils/gameUtils";

export interface UseWordDetectionReturn {
  detectedWords: DetectedWord[];
  setDetectedWords: React.Dispatch<React.SetStateAction<DetectedWord[]>>;
  detectWords: () => void;
  stableDetectWords: () => void;
  throttledDetectWords: () => void;
  handleRemoveWord: (wordToRemove: DetectedWord) => void;
}

export function useWordDetection(
  currentWord: Word,
  availableWord: Word,
  dictionary: Set<string>,
  lastPlacedLetterIndices: number[],
  placedLetterPositions: Map<number, number>,
  setCurrentWord: React.Dispatch<React.SetStateAction<Word>>,
  setAvailableWord: React.Dispatch<React.SetStateAction<Word>>,
  setLastPlacedLetterIndices: React.Dispatch<React.SetStateAction<number[]>>,
  setPlacedLetterPositions: React.Dispatch<React.SetStateAction<Map<number, number>>>
): UseWordDetectionReturn {
  // State
  const [detectedWords, setDetectedWords] = useState<DetectedWord[]>([]);
  const currentWordStringRef = useRef<string>('');
  
  // Helper function to check if segment contains added letters
  const hasAddedLetter = (letters: ILetter[], start: number, end: number): boolean => {
    for (let i = start; i <= end; i++) {
      if (letters[i].initialPosition === undefined) {
        return true;
      }
    }
    return false;
  };

  // Memoization cache for detectWord function
  const memoCache = new Map<string, DetectedWord[]>();
  
  // Recursive function to detect words in the current word using divide and conquer approach
  // Memoization is used for better performance
  const detectWord = (wordString: string, startIndex: number, endIndex: number): DetectedWord[] => {
    const cacheKey = `${startIndex}-${endIndex}`;
    
    if (memoCache.has(cacheKey)) {
      return memoCache.get(cacheKey) || [];
    }   

    const currentSubstring = wordString.substring(startIndex, endIndex+1);
    
    // 1. Check if current substring is a valid word with at least one added letter
    if (dictionary.has(currentSubstring) && 
        hasAddedLetter(currentWord.getLetters(), startIndex, endIndex)) {
      const result: DetectedWord[] = [{
        word: currentSubstring,
        startIndex,
        endIndex
      } as DetectedWord];
      
      if (DEBUG) {
        console.log(`Found word: "${currentSubstring}" at ${startIndex}-${endIndex}`);
      }
      
      memoCache.set(cacheKey, result);
      return result;
    }
    
    // Base case: word is too short
    if (endIndex - startIndex + 1 <= MIN_WORD_DETECT_LENGTH) {
      memoCache.set(cacheKey, []);
      return [];
    }
    
    let left: DetectedWord[] = detectWord(wordString, startIndex, endIndex - 1);
    let right: DetectedWord[] = detectWord(wordString, startIndex + 1, endIndex);
    
    const combinedResults = [...left, ...right];
    memoCache.set(cacheKey, combinedResults);
    return combinedResults;
  };
  
  // Detect valid words in the current word
  const detectWords = useCallback(() => {
    const letters = currentWord.getLetters();
    if (letters.length === 0) return;
    
    // Not enough letters for valid word
    if (letters.length < MIN_WORD_DETECT_LENGTH) {
      setDetectedWords([]);
      return;
    }
    
    // If no added letters, not valid word
    let hasAnyAddedLetters = false;
    for (const letter of letters) {
      if (letter.initialPosition === undefined) {
        hasAnyAddedLetters = true;
        break;
      }
    }
    
    if (!hasAnyAddedLetters) {
      setDetectedWords([]);
      return;
    }
    
    const wordString = letters.map(l => l.value).join('').toLowerCase();
    
    // Get all words
    const allWordsArray = detectWord(wordString, 0, wordString.length - 1);
    
    if (DEBUG) {
      memoCache.forEach((value, key) => {
        console.log('KEY:',key, 'VALUE:',value);
      });
    }
    
    memoCache.clear();
    
    // Filter out words that are completely contained within other words (only keep the longest)
    const filteredWords = Array.from(new Set<DetectedWord>(allWordsArray)).filter((word1) => {
      return !allWordsArray.some((word2) => 
        word1 !== word2 && 
        word1.startIndex >= word2.startIndex && 
        word1.endIndex <= word2.endIndex
      );
    });
    
    if (DEBUG) {
      console.log(`Found ${allWordsArray.length} words, filtered to ${filteredWords.length}`);
    }
    
    setDetectedWords(filteredWords);
  }, [currentWord, dictionary]);
  
  const stableDetectWords = useCallback(() => {
    detectWords();
  }, [detectWords]);
  
  const throttledDetectWords = useCallback(
    throttle(() => {
      detectWords();
    }, 300),  // Only run max every 300ms
    [detectWords]
  );

  const handleRemoveWord = useCallback((wordToRemove: DetectedWord) => {
    const letters = currentWord.getLetters();
    const addedLetterIndices: number[] = [];
    
    // Remove the letters in the current word
    const newCurrentWordLetters = currentWord.getLetters().filter((letter, index) => {
      return index < wordToRemove.startIndex || index > wordToRemove.endIndex;
    });
    
    // Find which letters in the word range were added (for marking as completed)
    for (let i = wordToRemove.startIndex; i <= wordToRemove.endIndex; i++) {
      const letter = letters[i];
      if (letter.initialPosition === undefined && letter.originalIndex !== undefined) {
        addedLetterIndices.push(letter.originalIndex);
      }
    }
    
    // Mark the letters used in the word as completed in available word
    const updatedAvailableLetters = availableWord.getLetters().map((letter) => {
      if (letter.originalIndex !== undefined && addedLetterIndices.includes(letter.originalIndex)) {
        return {
          ...letter,
          isAvailable: false,
          isCompleted: true
        };
      }
      return letter;
    });
    
    // Reset all tracking data
    const newPlacedLetterIndices = lastPlacedLetterIndices.filter(x => !addedLetterIndices.includes(x));
    
    const newPlacedLetterPositions = new Map(placedLetterPositions);
    addedLetterIndices.forEach(x => {
      newPlacedLetterPositions.delete(x);
    });
    
    // State updates

    setDetectedWords([]);
    memoCache.clear();
    
    const newCurrentWord = new Word('');
    newCurrentWord.letters = newCurrentWordLetters;
    setCurrentWord(newCurrentWord);
    
    const newAvailableWord = new Word('');
    newAvailableWord.letters = updatedAvailableLetters;
    setAvailableWord(newAvailableWord);
    
    setLastPlacedLetterIndices(newPlacedLetterIndices);
    setPlacedLetterPositions(newPlacedLetterPositions);

  }, [currentWord, availableWord, lastPlacedLetterIndices, placedLetterPositions, dictionary, setCurrentWord, setAvailableWord, setLastPlacedLetterIndices, setPlacedLetterPositions, detectWords]);

  // Check for valid words after each letter placement (throttled)
  useEffect(() => {
    if (lastPlacedLetterIndices.length === 0 && currentWord.getLetters().length === 0) {
      return;
    }
    throttledDetectWords();
  }, [lastPlacedLetterIndices, throttledDetectWords, currentWord]);
  
  // Check for valid words after word removal (immediate)
  useEffect(() => {
    // Skip initial
    if (currentWord.getLetters().length === 0) return;
    
    // Check current word VS ref to prevent unnecessary updates
    const wordString = currentWord.getLetters().map(l => l.value).join('');
    if (currentWordStringRef.current === wordString) return;
    currentWordStringRef.current = wordString;
    
    stableDetectWords();
  }, [currentWord, stableDetectWords]);

  return {
    detectedWords,
    setDetectedWords,
    detectWords,
    stableDetectWords,
    throttledDetectWords,
    handleRemoveWord
  };
} 