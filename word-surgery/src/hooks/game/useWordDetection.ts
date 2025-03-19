import { useState, useCallback, useEffect, useRef } from "react";
import { Word } from "../../classes/Word";
import { ILetter } from "../../interfaces/ILetter";
import { throttle } from 'lodash';
import { DetectedWord } from "../../components/game/interfaces";
import { DEBUG, MIN_WORD_LENGTH, isRegionCovered } from "../../utils/gameUtils";

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
  
  // Ref to track word changes
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
  
  const detectWord = (wordString: string, startIndex: number, endIndex: number): DetectedWord[] => {
    // Create a unique key for this substring
    const cacheKey = `${startIndex}-${endIndex}`;
    
    // Check if we've already computed this substring
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
      
      // Store in cache and return - found a valid word
      memoCache.set(cacheKey, result);
      return result;
    }
    
    // Base case: word is too short
    if (endIndex - startIndex + 1 <= MIN_WORD_LENGTH) {
      memoCache.set(cacheKey, []);
      return [];
    }
    
    // 3. Left part: substring(0, length-1)
    let left: DetectedWord[] = detectWord(wordString, startIndex, endIndex - 1);
    
    // 4. Right part: substring(1, length)
    let right: DetectedWord[] = detectWord(wordString, startIndex + 1, endIndex);
    
    // Combine results, store in cache and return
    const combinedResults = [...left, ...right];
    memoCache.set(cacheKey, combinedResults);
    return combinedResults;
  };
  
  // Detect valid words in the current word
  const detectWords = useCallback(() => {
    const letters = currentWord.getLetters();
    if (letters.length === 0) return;
    
    // If there are not enough letters to form a valid word, clear detected words and return
    if (letters.length < MIN_WORD_LENGTH) {
      setDetectedWords([]);
      return;
    }
    
    // Check if there are any added letters at all - if not, no need to detect
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
        console.log('!!!! KEY:',key, 'VALUE:',value);
      });
    }
    
    memoCache.clear();
    
    // Filter out words that are completely contained within other words
    const filteredWords = Array.from(new Set<DetectedWord>(allWordsArray)).filter((word1) => {
      // Keep this word if no other word completely contains it
      return !allWordsArray.some((word2) => 
        // Only compare with different words
        word1 !== word2 && 
        // Check if word1 is completely contained within word2
        word1.startIndex >= word2.startIndex && 
        word1.endIndex <= word2.endIndex
      );
    });
    
    if (DEBUG) {
      console.log(`Found ${allWordsArray.length} words in total, filtered to ${filteredWords.length}`);
    }
    
    setDetectedWords(filteredWords);
  }, [currentWord, dictionary]);
  
  // Stable version of detectWords that doesn't change on every render
  const stableDetectWords = useCallback(() => {
    detectWords();
  }, [detectWords]);
  
  // Throttled version of the detectWords function
  const throttledDetectWords = useCallback(
    throttle(() => {
      detectWords();
    }, 300),  // Only run at most once every 300ms
    [detectWords]
  );

  // Simple function to remove a detected word
  const handleRemoveWord = useCallback((wordToRemove: DetectedWord) => {
    const letters = currentWord.getLetters();
    const addedLetterIndices: number[] = [];
    
    // Find which letters in the word range were added (for marking as completed)
    for (let i = wordToRemove.startIndex; i <= wordToRemove.endIndex; i++) {
      const letter = letters[i];
      if (letter.initialPosition === undefined && letter.originalIndex !== undefined) {
        addedLetterIndices.push(letter.originalIndex);
      }
    }
    
    // 1. First, create the new current word by excluding the letters in the detected word
    const initialLetters = currentWord.getLetters().filter((letter, index) => {
      // Keep this letter if it's not part of the detected word range
      return index < wordToRemove.startIndex || index > wordToRemove.endIndex;
    });
    
    // 2. Mark the letters used in the word as completed in available word
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
    
    // 3. Reset all tracking data
    const newPlacedLetterIndices = lastPlacedLetterIndices.filter(
      idx => !addedLetterIndices.includes(idx)
    );
    
    const newPlacedLetterPositions = new Map(placedLetterPositions);
    addedLetterIndices.forEach(idx => {
      newPlacedLetterPositions.delete(idx);
    });
    
    // 4. Make all state updates at once
    setDetectedWords([]);
    
    // Clear the memoCache to prevent redetection of removed words
    memoCache.clear();
    
    const newCurrentWord = new Word('');
    newCurrentWord.letters = initialLetters;
    setCurrentWord(newCurrentWord);
    
    const newAvailableWord = new Word('');
    newAvailableWord.letters = updatedAvailableLetters;
    setAvailableWord(newAvailableWord);
    
    setLastPlacedLetterIndices(newPlacedLetterIndices);
    setPlacedLetterPositions(newPlacedLetterPositions);

  }, [currentWord, availableWord, lastPlacedLetterIndices, placedLetterPositions, dictionary, setCurrentWord, setAvailableWord, setLastPlacedLetterIndices, setPlacedLetterPositions, detectWords]);

  // Check for valid words after each letter placement
  useEffect(() => {
    if (lastPlacedLetterIndices.length === 0 && currentWord.getLetters().length === 0) {
      return;
    }
    
    // Use throttled version instead of direct call
    throttledDetectWords();

  }, [lastPlacedLetterIndices, throttledDetectWords, currentWord]);
  
  // Immediate detection of words when current word changes due to letter removal
  useEffect(() => {
    // Skip initial render
    if (currentWord.getLetters().length === 0) {
      return;
    }
    
    // Check current word against the ref to prevent unnecessary updates
    const wordString = currentWord.getLetters().map(l => l.value).join('');
    
    if (currentWordStringRef.current === wordString) {
      return;
    }
    
    currentWordStringRef.current = wordString;
    
    // Detect words without throttling when a letter is removed
    // This ensures highlights update immediately
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