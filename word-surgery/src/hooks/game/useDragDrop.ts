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
  handleDragEnd: () => boolean;
  findClosestDivider: (x: number, y: number) => void;
  handleDrop: () => boolean;
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
  
  const [placedLetterPositions, setPlacedLetterPositions] = useState<Map<number, number>>(new Map());
  const [lastPlacedLetterIndices, setLastPlacedLetterIndices] = useState<number[]>([]);
  
  const [dividerPositions, setDividerPositions] = useState<Map<number, { x: number, y: number, width: number, height: number }>>(new Map());
  
  const wordContainerLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  const isLetterEnabled = useCallback((originalIndex: number) => {
    // If no letter placed yet, ALL letters enabled
    if (lastPlacedLetterIndices.length === 0) return true;
    
    // Check if letter is adjacent to previously placed letter
    for (const placedIndex of lastPlacedLetterIndices) {
      if (Math.abs(originalIndex - placedIndex) === 1) return true;
    }
    
    return false;
  }, [lastPlacedLetterIndices]);
  
  // To show where a letter can be placed in current word while dragging
  const isDividerValid = useCallback((dividerIndex: number) => {
    if (lastPlacedLetterIndices.length === 0) return true;
    
    // If not dragging, none are valid
    if (draggedIndex === -1) return false;
    
    const draggedLetter = availableWord.getLetters()[draggedIndex];
    if (!draggedLetter || draggedLetter.originalIndex === undefined) return false;
    
    const draggedOriginalIndex = draggedLetter.originalIndex;
    
    // Find an adjacent previously placed letter
    let adjacentPlacedIndex: number | null = null;
    let adjacentPlacedPosition: number | null = null;
    
    for (const placedIndex of lastPlacedLetterIndices) {
      if (Math.abs(draggedOriginalIndex - placedIndex) === 1) {
        adjacentPlacedIndex = placedIndex;
        adjacentPlacedPosition = placedLetterPositions.get(placedIndex) ?? -1;
        if (adjacentPlacedPosition !== -1) break; // Adjacent letter found
      }
    }
    
    // If no adjacent letter was found, letter shouldn't be draggable
    if (adjacentPlacedIndex === null || adjacentPlacedPosition === null || adjacentPlacedPosition === -1) return false;
    
    // Determine if letter should be placed before or after adjacent letter
    if (draggedOriginalIndex < adjacentPlacedIndex) {
      return dividerIndex === adjacentPlacedPosition;
    } else {
      return dividerIndex === adjacentPlacedPosition + 1;
    }
  }, [lastPlacedLetterIndices, placedLetterPositions, draggedIndex, availableWord]);
  
  // Handlers
  const handleInsertLetter = useCallback((letter: ILetter, insertIndex: number): void => {
    if (DEBUG) console.log(`Inserting letter ${letter.value} at index ${insertIndex}`);
    
    setCurrentWord(prev => {
      const newWord = new Word('');
      const letters = [...prev.getLetters()];
      
      // Insert letter at index without initial position but keep originalIndex for tracking
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
      setLastPlacedLetterIndices(prev => {
        if (letter.originalIndex !== undefined) {
          return [...prev, letter.originalIndex];
        }
        return prev;
      });
      
      setPlacedLetterPositions(prev => {
        const newMap = new Map(prev);
        if (letter.originalIndex !== undefined) {
          newMap.set(letter.originalIndex, insertIndex);
          
          // Adjust positions for existing letters that come after the insertion point
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
  
  const handleLetterTap = useCallback((tappedLetter: ILetter, index: number): void => {
    if (DEBUG) console.log(`Tapped letter ${tappedLetter.value} at index ${index}`);
    
    // Only allow removing letters that weren't in available word
    if (tappedLetter.initialPosition === undefined) {
      const currentLetters = currentWord.getLetters();
      
      const addedLetters: { position: number; originalIndex: number | undefined }[] = [];
      currentLetters.forEach((letter, i) => {
        if (letter.initialPosition === undefined) {
          addedLetters.push({ 
            position: i, 
            originalIndex: letter.originalIndex 
          });
        }
      });
      
      if (addedLetters.length === 0) return;
      
      // Only allow removing first or last letter in the sequence
      addedLetters.sort((a, b) => {
        return (a.originalIndex || 0) - (b.originalIndex || 0);
      });
      const firstLetter = addedLetters[0];
      const lastLetter = addedLetters[addedLetters.length - 1];

      if (index !== firstLetter.position && index !== lastLetter.position) {
        return;
      }
      
      // Remove from current word
      setCurrentWord(prev => {
        const newWord = new Word('');
        const letters = [...prev.getLetters()];
        letters.splice(index, 1);
        newWord.letters = letters;
        return newWord;
      });
      
      // Update tracking of placed letters
      if (tappedLetter.originalIndex !== undefined) {
        setLastPlacedLetterIndices(prev => prev.filter(x => x !== tappedLetter.originalIndex));
        
        // Update the positions map
        setPlacedLetterPositions(prev => {
          const newMap = new Map(prev);
          newMap.delete(tappedLetter.originalIndex!);
          
          // Adjust positions for existing letters that come after the removal point
          newMap.forEach((position, index) => {
            if (position > index) {
              newMap.set(index, position - 1);
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
          letter => letter.originalIndex === tappedLetter.originalIndex && !letter.isAvailable
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
      (index, layout) => `${currentWord.size()}_${index}` // word size and index as the cache key
    ),
    [currentWord.size()]
  );

  // Find closest divider based on pointer position
  const findClosestDivider = useCallback((x: number, y: number) => {
    const containerTop = wordContainerLayout.current.y;
    const containerBottom = containerTop + wordContainerLayout.current.height;
    const containerLeft = wordContainerLayout.current.x;
    const containerRight = containerLeft + wordContainerLayout.current.width;
    
    // If pointer is not close vertically, don't highlight
    if (y < containerTop || y > containerBottom || x < containerLeft || x > containerRight) {
      setActiveDividerIndex(-1);
      return;
    }
    
    // Find closest divider
    let closestIndex = -1;
    let closestDistance = Number.MAX_VALUE;
    
    if (dividerPositions.size > 0) {
      for (const [index, layout] of dividerPositions.entries()) {
        if (!isDividerValid(index)) {
          continue;
        }
        
        // Calculate distance to divider horizontally
        const dividerX = containerLeft + layout.x + (layout.width / 2);
        const distance = Math.abs(x - dividerX);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }
      
      // Only activate if <50 px away
      const activationThreshold = 50;
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
  
  const handleDrop = useCallback((): boolean => {
    if (activeDividerIndex >= 0 && draggedIndex >= 0) {
      const letters = availableWord.getLetters();
      if (letters && draggedIndex < letters.length) {
        const letter = letters[draggedIndex];
        if (letter) {
          handleRemoveLetter(draggedIndex);
          handleInsertLetter(letter, activeDividerIndex);
          return true;
        }
      }
    } else {
      if (DEBUG) console.log('No valid drop position found');
    }
    return false;
  }, [activeDividerIndex, draggedIndex, availableWord, handleInsertLetter, handleRemoveLetter]);
  
  const handleDragStart = useCallback((index: number): void => {
    setIsDragging(true);
    setDraggedIndex(index);
  }, []);
  
  const handleDragMove = useCallback((x: number, y: number): void => {
    findClosestDivider(x, y);
  }, [findClosestDivider]);
  
  const handleDragEnd = useCallback((): boolean => {
    const isLetterAdded = handleDrop();
    setIsDragging(false);
    setDraggedIndex(-1);
    setActiveDividerIndex(-1);

    return isLetterAdded;
  }, [handleDrop]);

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