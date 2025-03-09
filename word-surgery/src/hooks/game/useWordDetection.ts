import { useState, useCallback, useEffect, useRef } from "react";
import { Word } from "../../classes/Word";
import { throttle } from 'lodash';
import { DetectedWord } from "../../components/game/interfaces";
import { DEBUG, MIN_WORD_LENGTH, isRegionCovered } from "../../utils/gameUtils";

export interface UseWordDetectionReturn {
  detectedWords: DetectedWord[];
  setDetectedWords: React.Dispatch<React.SetStateAction<DetectedWord[]>>;
  gameCompleted: boolean;
  setGameCompleted: React.Dispatch<React.SetStateAction<boolean>>;
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
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  
  // Ref to track word changes
  const currentWordStringRef = useRef<string>('');
  
  // Detect valid words in the current word
  const detectWords = useCallback(() => {
    const letters = currentWord.getLetters();
    const wordString = letters.map(l => l.value).join('').toLowerCase();
    
    // Find all possible subwords
    const foundWords: DetectedWord[] = [];
    
    // Track regions that have been covered by longer words
    const coveredRegions: { start: number, end: number }[] = [];
    
    // Check words in order from longest to shortest
    for (let wordLength = wordString.length; wordLength >= MIN_WORD_LENGTH; wordLength--) {
      // For each word length, check all possible positions
      for (let startPos = 0; startPos <= wordString.length - wordLength; startPos++) {
        const endPos = startPos + wordLength;
        
        // Skip if this region is already covered by a longer word
        if (isRegionCovered(startPos, endPos, coveredRegions)) {
          if (DEBUG) {
            console.log(`Skipping region ${startPos}-${endPos} as it's covered`);
          }
          continue;
        }
        
        const subword = wordString.substring(startPos, endPos);
        
        // Check if this is a valid word from our dictionary
        if (dictionary.has(subword)) {
          // Make sure this word contains at least one added letter
          let containsAddedLetter = false;
          for (let i = startPos; i < endPos; i++) {
            if (letters[i].initialPosition === undefined) {
              containsAddedLetter = true;
              break;
            }
          }
          
          if (containsAddedLetter) {
            foundWords.push({
              word: subword,
              startIndex: startPos,
              endIndex: endPos - 1
            });
            
            // Mark this region as covered to avoid finding subwords
            coveredRegions.push({ start: startPos, end: endPos });
            
            if (DEBUG) {
              console.log(`Found word: "${subword}" at ${startPos}-${endPos-1}`);
            }
          }
        }
      }
    }
    
    setDetectedWords(foundWords);
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
    
    const newCurrentWord = new Word('');
    newCurrentWord.letters = initialLetters;
    setCurrentWord(newCurrentWord);
    
    const newAvailableWord = new Word('');
    newAvailableWord.letters = updatedAvailableLetters;
    setAvailableWord(newAvailableWord);
    
    setLastPlacedLetterIndices(newPlacedLetterIndices);
    setPlacedLetterPositions(newPlacedLetterPositions);
    
    // 5. After a delay, re-check for words
    setTimeout(() => {
      const updatedCurrentWord = initialLetters;
      if (updatedCurrentWord.length > 0) {
        const wordString = updatedCurrentWord.map(l => l.value).join('').toLowerCase();
        
        // Find all possible subwords
        const foundWords: DetectedWord[] = [];
        
        // Track regions that have been covered by longer words
        const coveredRegions: { start: number, end: number }[] = [];
        
        // Get all possible word lengths to check, from longest to shortest
        const wordLengths = [];
        for (let len = wordString.length; len >= MIN_WORD_LENGTH; len--) {
          wordLengths.push(len);
        }
        
        // Check words in order from longest to shortest
        for (const wordLength of wordLengths) {
          // For each word length, check all possible positions
          for (let startPos = 0; startPos <= wordString.length - wordLength; startPos++) {
            const endPos = startPos + wordLength;
            
            // Skip if this region is already covered by a longer word
            if (isRegionCovered(startPos, endPos, coveredRegions)) {
              continue;
            }
            
            const subword = wordString.substring(startPos, endPos);
            
            // Check if this is a valid word from our dictionary
            if (dictionary.has(subword)) {
              // Make sure this word contains at least one added letter
              let containsAddedLetter = false;
              for (let i = startPos; i < endPos; i++) {
                if (updatedCurrentWord[i].initialPosition === undefined) {
                  containsAddedLetter = true;
                  break;
                }
              }
              
              if (containsAddedLetter) {
                foundWords.push({
                  word: subword,
                  startIndex: startPos,
                  endIndex: endPos - 1
                });
                
                // Mark this region as covered to avoid finding subwords
                coveredRegions.push({ start: startPos, end: endPos });
              }
            }
          }
        }
        
        setDetectedWords(foundWords);
      }
    }, 100);
  }, [currentWord, availableWord, lastPlacedLetterIndices, placedLetterPositions, dictionary, setCurrentWord, setAvailableWord, setLastPlacedLetterIndices, setPlacedLetterPositions]);

  // Check for valid words after each letter placement
  useEffect(() => {
    if (lastPlacedLetterIndices.length === 0 && currentWord.getLetters().length === 0) {
      return;
    }
    
    // Use throttled version instead of direct call
    throttledDetectWords();
    
    // Check if game is completed - all added letters have been removed from the current word
    // and there are no more available letters to be placed
    const onlyInitialLettersLeft = currentWord.getLetters().every(letter => 
      letter.initialPosition !== undefined
    );
    
    const noAvailableLetters = availableWord.getLetters().every(letter => 
      !letter.isAvailable || letter.isCompleted
    );
    
    if (onlyInitialLettersLeft && noAvailableLetters) {
      setGameCompleted(true);
    }
  }, [lastPlacedLetterIndices, throttledDetectWords, currentWord, availableWord]);
  
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
    gameCompleted,
    setGameCompleted,
    detectWords,
    stableDetectWords,
    throttledDetectWords,
    handleRemoveWord
  };
} 