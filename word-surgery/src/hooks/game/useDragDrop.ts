import { useState, useCallback, useRef, useMemo } from "react";
import { Word } from "../../classes/Word";
import { ILetter } from "../../interfaces/ILetter";
import { DEBUG } from "../../utils/gameUtils";
import { memoize } from "lodash";

export interface UseDragDropReturn {
  currentWord: Word;
  setCurrentWord: React.Dispatch<React.SetStateAction<Word>>;
  availableWord: Word;
  setAvailableWord: React.Dispatch<React.SetStateAction<Word>>;
  isDragging: boolean;
  setIsDragging: React.Dispatch<React.SetStateAction<boolean>>;
  draggedIndex: number;
  setDraggedIndex: React.Dispatch<React.SetStateAction<number>>;
  activeDividerIndex: number;
  setActiveDividerIndex: React.Dispatch<React.SetStateAction<number>>;
  placedLetterPositions: Map<number, number>;
  setPlacedLetterPositions: React.Dispatch<React.SetStateAction<Map<number, number>>>;
  lastPlacedLetterIndices: number[];
  setLastPlacedLetterIndices: React.Dispatch<React.SetStateAction<number[]>>;
  dividerPositions: Map<number, { x: number; y: number; width: number; height: number }>;
  setDividerPositions: React.Dispatch<React.SetStateAction<Map<number, { x: number; y: number; width: number; height: number }>>>;
  wordContainerLayout: React.MutableRefObject<{ x: number; y: number; width: number; height: number }>;
  isLetterEnabled: (originalIndex: number) => boolean;
  isDividerValid: (dividerIndex: number) => boolean;
  handleInsertLetter: (letter: ILetter, insertIndex: number) => void;
  handleRemoveLetter: (index: number) => void;
  handleDragStart: (index: number) => void;
  handleDragMove: (x: number, y: number) => void;
  handleDragEnd: () => void;
  findClosestDivider: (x: number, y: number) => void;
  handleDrop: () => void;
  handleDividerLayout: (index: number, layout: { x: number; y: number; width: number; height: number }) => void;
  handleLetterTap: (letter: ILetter, index: number) => void;
  handleWordContainerLayout: (event: any) => void;
}

export function useDragDrop(initialWord: Word, initialAvailableWord: Word): UseDragDropReturn {
  // State
  const [currentWord, setCurrentWord] = useState<Word>(initialWord);
  const [availableWord, setAvailableWord] = useState<Word>(initialAvailableWord);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number>(-1);
  const [activeDividerIndex, setActiveDividerIndex] = useState<number>(-1);
  
  // Track where each letter was placed
  const [placedLetterPositions, setPlacedLetterPositions] = useState<Map<number, number>>(new Map());
  
  // Track the last placed letter indices
  const [lastPlacedLetterIndices, setLastPlacedLetterIndices] = useState<number[]>([]);
  
  // Track divider positions
  const [dividerPositions, setDividerPositions] = useState<Map<number, { x: number, y: number, width: number, height: number }>>(new Map());
  
  // Refs
  const wordContainerLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // Helper functions
  const isLetterEnabled = useCallback((originalIndex: number) => {
    if (lastPlacedLetterIndices.length === 0) {
      // If no letter has been placed yet, ALL letters are enabled
      return true;
    }
    
    // Check if this letter is adjacent to ANY previously placed letter
    for (const placedIndex of lastPlacedLetterIndices) {
      if (Math.abs(originalIndex - placedIndex) === 1) {
        return true;
      }
    }
    
    return false;
  }, [lastPlacedLetterIndices]);
  
  const isDividerValid = useCallback((dividerIndex: number) => {
    if (lastPlacedLetterIndices.length === 0) {
      // If no letter has been placed yet, ALL positions are valid
      return true;
    }
    
    // If not dragging a letter, no dividers are valid
    if (draggedIndex === -1) {
      return false;
    }
    
    // Get the original index of the letter being dragged
    const draggedLetter = availableWord.getLetters()[draggedIndex];
    if (!draggedLetter || draggedLetter.originalIndex === undefined) {
      return false;
    }
    
    const draggedOriginalIndex = draggedLetter.originalIndex;
    
    // Find an adjacent previously placed letter
    let adjacentPlacedIndex: number | null = null;
    let adjacentPlacedPosition: number | null = null;
    
    for (const placedIndex of lastPlacedLetterIndices) {
      if (Math.abs(draggedOriginalIndex - placedIndex) === 1) {
        adjacentPlacedIndex = placedIndex;
        adjacentPlacedPosition = placedLetterPositions.get(placedIndex) ?? -1;
        if (adjacentPlacedPosition !== -1) {
          break; // Found a valid adjacent letter with known position
        }
      }
    }
    
    // If no adjacent letter was found, this letter shouldn't be draggable
    if (adjacentPlacedIndex === null || adjacentPlacedPosition === null || adjacentPlacedPosition === -1) {
      return false;
    }
    
    // Determine if the letter should be placed before or after its adjacent letter
    if (draggedOriginalIndex < adjacentPlacedIndex) {
      // If the dragged letter comes before the adjacent letter in the original sequence,
      // it should be placed immediately before it in the current word
      return dividerIndex === adjacentPlacedPosition;
    } else {
      // If it comes after, it should be placed immediately after
      return dividerIndex === adjacentPlacedPosition + 1;
    }
  }, [lastPlacedLetterIndices, placedLetterPositions, draggedIndex, availableWord]);
  
  // Handlers
  const handleInsertLetter = useCallback((letter: ILetter, insertIndex: number): void => {
    if (DEBUG) console.log(`Inserting letter ${letter.value} at index ${insertIndex}`);
    
    // Create a new Word instance and update state properly
    setCurrentWord(prev => {
      const newWord = new Word('');
      const letters = [...prev.getLetters()];
      
      // Insert the letter at the specified index without initial position
      // but preserve the originalIndex for tracking
      const newLetter = {
        ...letter, 
        initialPosition: undefined
      };
      letters.splice(insertIndex, 0, newLetter);
      newWord.letters = letters;
      
      return newWord;
    });
    
    // Update tracking of placed letters
    if (letter.originalIndex !== undefined) {
      // Add to the list of placed letter indices
      setLastPlacedLetterIndices(prev => {
        if (letter.originalIndex !== undefined) {
          return [...prev, letter.originalIndex];
        }
        return prev;
      });
      
      // Update the mapping of where this letter was placed
      setPlacedLetterPositions(prev => {
        const newMap = new Map(prev);
        if (letter.originalIndex !== undefined) {
          newMap.set(letter.originalIndex, insertIndex);
          
          // Adjust positions for letters that come after the insertion point
          newMap.forEach((position, originalIndex) => {
            if (position >= insertIndex && originalIndex !== letter.originalIndex) {
              newMap.set(originalIndex, position + 1);
            }
          });
        }
        return newMap;
      });
    }
  }, []);

  const handleRemoveLetter = useCallback((index: number): void => {
    if (DEBUG) console.log(`Removing letter at index ${index}`);
    setAvailableWord(prev => {
      const updatedAvailableLetters = [...prev.getLetters()];
      if (updatedAvailableLetters[index]) {
        updatedAvailableLetters[index] = { 
          ...updatedAvailableLetters[index], 
          isAvailable: false 
        };
      }
      
      const newAvailableWord = new Word('');
      newAvailableWord.letters = updatedAvailableLetters;
      return newAvailableWord;
    });
  }, []);
  
  // Handler to remove non-initial letters from current word when tapped
  const handleLetterTap = useCallback((letter: ILetter, index: number): void => {
    if (DEBUG) console.log(`Tapped letter ${letter.value} at index ${index}`);
    
    // Only allow removing letters that weren't initial (don't have initialPosition)
    if (letter.initialPosition === undefined) {
      // Get all the added letters and their positions
      const currentLetters = currentWord.getLetters();
      
      // Find positions of added letters and their original indices
      const addedLetters: { position: number; originalIndex: number | undefined }[] = [];
      currentLetters.forEach((l, idx) => {
        if (l.initialPosition === undefined) {
          addedLetters.push({ 
            position: idx, 
            originalIndex: l.originalIndex 
          });
        }
      });
      
      if (addedLetters.length === 0) return;
      
      // Sort added letters by their original index
      addedLetters.sort((a, b) => {
        return (a.originalIndex || 0) - (b.originalIndex || 0);
      });
      
      // Only allow removing first or last letter in the sequence
      const firstLetter = addedLetters[0];
      const lastLetter = addedLetters[addedLetters.length - 1];
      
      const isFirstOrLast = 
        index === firstLetter.position || 
        index === lastLetter.position;
        
      if (!isFirstOrLast) {
        if (DEBUG) console.log(`Can't remove letter at position ${index} as it's not at the edge of the sequence`);
        return;
      }
      
      // Get the original index of the letter being removed
      const originalIndex = letter.originalIndex;
      
      // Remove from current word
      setCurrentWord(prev => {
        const newWord = new Word('');
        const letters = [...prev.getLetters()];
        letters.splice(index, 1);
        newWord.letters = letters;
        return newWord;
      });
      
      // Update tracking of placed letters
      if (originalIndex !== undefined) {
        // Remove from the list of placed letter indices
        setLastPlacedLetterIndices(prev => 
          prev.filter(idx => idx !== originalIndex)
        );
        
        // Update the positions map
        setPlacedLetterPositions(prev => {
          const newMap = new Map(prev);
          // Remove this letter
          newMap.delete(originalIndex);
          
          // Adjust positions for letters that come after the removal point
          newMap.forEach((position, idx) => {
            if (position > index) {
              newMap.set(idx, position - 1);
            }
          });
          
          return newMap;
        });
      }
      
      // Add back to available words
      setAvailableWord(prev => {
        const newWord = new Word('');
        const letters = [...prev.getLetters()];
        
        // Find the letter with matching originalIndex that's not available
        const availableIndex = letters.findIndex(
          l => l.originalIndex === originalIndex && !l.isAvailable
        );
        
        if (availableIndex !== -1) {
          letters[availableIndex] = {
            ...letters[availableIndex],
            isAvailable: true
          };
        }
        
        newWord.letters = letters;
        return newWord;
      });
    }
  }, [currentWord]);

  // Handle divider layout
  const handleDividerLayout = useCallback(
    memoize(
      (index: number, layout: { x: number; y: number; width: number; height: number }) => {
        setDividerPositions(prev => {
          const newMap = new Map(prev);
          newMap.set(index, layout);
          return newMap;
        });
        if (DEBUG) console.log(`Divider ${index} layout: x=${layout.x}, y=${layout.y}, w=${layout.width}, h=${layout.height}`);
      },
      // Use both word size and index as the cache key
      (index, layout) => `${currentWord.size()}_${index}`
    ),
    [currentWord.size()]
  );

  // Find closest divider based on pointer position
  const findClosestDivider = useCallback((x: number, y: number) => {
    // Check if the pointer is within the word container's vertical bounds
    const containerTop = wordContainerLayout.current.y;
    const containerBottom = containerTop + wordContainerLayout.current.height;
    const containerLeft = wordContainerLayout.current.x;
    const containerRight = containerLeft + wordContainerLayout.current.width;
    
    // If pointer is not within the vertical bounds of the word container,
    // don't highlight any divider
    if (y < containerTop || y > containerBottom || x < containerLeft || x > containerRight) {
      setActiveDividerIndex(-1);
      return;
    }
    
    // Find the closest divider using actual measured positions
    let closestIndex = -1;
    let closestDistance = Number.MAX_VALUE;
    
    // If we have divider positions measured, use them for accurate detection
    if (dividerPositions.size > 0) {
      for (const [index, layout] of dividerPositions.entries()) {
        // Skip invalid dividers
        if (!isDividerValid(index)) {
          continue;
        }
        
        // Calculate distance to this divider
        // Use the divider's center point
        const dividerX = containerLeft + layout.x + (layout.width / 2);
        const distance = Math.abs(x - dividerX);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
      
      // Only activate if within a reasonable distance (use a fixed threshold)
      const activationThreshold = 50; // Adjust as needed
      if (closestDistance < activationThreshold) {
        setActiveDividerIndex(closestIndex);
      } else {
        setActiveDividerIndex(-1);
      }
    }
    else {
      setActiveDividerIndex(-1);
    }
  }, [currentWord.size(), isDividerValid, dividerPositions]);
  
  // Handle drop
  const handleDrop = useCallback((): void => {
    if (activeDividerIndex >= 0 && draggedIndex >= 0) {
      const letters = availableWord.getLetters();
      if (letters && draggedIndex < letters.length) {
        const letter = letters[draggedIndex];
        if (letter) {
          handleRemoveLetter(draggedIndex);
          handleInsertLetter(letter, activeDividerIndex);
        }
      }
    } else {
      if (DEBUG) console.log('No valid drop position found');
    }
  }, [activeDividerIndex, draggedIndex, availableWord, handleInsertLetter, handleRemoveLetter]);
  
  // Drag handlers
  const handleDragStart = useCallback((index: number): void => {
    setIsDragging(true);
    setDraggedIndex(index);
  }, []);
  
  const handleDragMove = useCallback((x: number, y: number): void => {
    findClosestDivider(x, y);
  }, [findClosestDivider]);
  
  const handleDragEnd = useCallback((): void => {
    handleDrop();
    setIsDragging(false);
    setDraggedIndex(-1);
    setActiveDividerIndex(-1);
  }, [handleDrop]);

  // Handle word container layout
  const handleWordContainerLayout = useCallback((event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    wordContainerLayout.current = { x, y, width, height };
    if (DEBUG) console.log(`Word container: x=${x}, y=${y}, w=${width}, h=${height}`);
  }, []);

  return {
    currentWord,
    setCurrentWord,
    availableWord,
    setAvailableWord,
    isDragging,
    setIsDragging,
    draggedIndex,
    setDraggedIndex,
    activeDividerIndex,
    setActiveDividerIndex,
    placedLetterPositions,
    setPlacedLetterPositions,
    lastPlacedLetterIndices,
    setLastPlacedLetterIndices,
    dividerPositions,
    setDividerPositions,
    wordContainerLayout,
    isLetterEnabled,
    isDividerValid,
    handleInsertLetter,
    handleRemoveLetter,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    findClosestDivider,
    handleDrop,
    handleDividerLayout,
    handleLetterTap,
    handleWordContainerLayout
  };
} 