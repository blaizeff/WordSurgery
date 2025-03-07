import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Button } from "react-native";
import { Word } from "src/classes/Word";
import { 
  GestureHandlerRootView, 
  Gesture,
  GestureDetector
} from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
  Easing
} from 'react-native-reanimated';
import { ILetter } from "../interfaces/ILetter";
import { throttle } from 'lodash';

// For debug purposes
const DEBUG = true;

// Divider width when active
const DIVIDER_ACTIVE_WIDTH = 6;
// Divider width when inactive
const DIVIDER_INACTIVE_WIDTH = 2;
// Divider height 
const DIVIDER_HEIGHT = 60;

// Minimum word length to be considered valid
const MIN_WORD_LENGTH = 3;

// Interface for detected words
interface DetectedWord {
  word: string;
  startIndex: number;
  endIndex: number;
}

// Props for draggable letter component
interface DraggableLetterProps {
  letter: ILetter;
  index: number;
  onDragStart: (index: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  isDisabled?: boolean;
}

// Props for divider component
interface DividerProps {
  index: number;
  isActive: boolean;
  onLayout?: (index: number, layout: { x: number, y: number, width: number, height: number }) => void;
}

// Draggable letter component
const DraggableLetter: React.FC<DraggableLetterProps> = ({ 
  letter, 
  index,
  onDragStart, 
  onDragMove, 
  onDragEnd,
  isDisabled = false
}) => {
  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const zIndex = useSharedValue(1);
  
  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .enabled(!isDisabled)
    .onBegin(() => {
      if (DEBUG) console.log(`Starting drag for letter ${letter.value} at index ${index}`);
      scale.value = withSpring(1.1);
      opacity.value = withSpring(0.8);
      zIndex.value = 100;
      runOnJS(onDragStart)(index);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      
      // Pass absolute position for divider detection
      runOnJS(onDragMove)(
        event.absoluteX,
        event.absoluteY
      );
    })
    .onFinalize(() => {
      if (DEBUG) console.log(`Ending drag for letter ${letter.value}`);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      zIndex.value = 1;
      
      runOnJS(onDragEnd)();
    });
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
      zIndex: zIndex.value
    };
  });
  
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        style={[
          styles.availableLetterBox,
          isDisabled && styles.disabledDraggableLetterBox,
          animatedStyle
        ]}
      >
        <Text style={[styles.letterText, isDisabled && styles.disabledDraggableLetterText]}>{letter.value}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

// Divider component
const Divider: React.FC<DividerProps> = ({ index, isActive, onLayout }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isActive ? DIVIDER_ACTIVE_WIDTH : DIVIDER_INACTIVE_WIDTH, {
        duration: 150,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      }),
      height: DIVIDER_HEIGHT,
      backgroundColor: withTiming(
        isActive ? 'rgba(0, 123, 255, 0.8)' : 'transparent', 
        { duration: 150 }
      ),
      marginHorizontal: 3,
      borderRadius: 2
    };
  });
  
  return (
    <Animated.View 
      style={[styles.divider, animatedStyle]}
      collapsable={false}
      onLayout={(event) => {
        if (onLayout) {
          onLayout(index, event.nativeEvent.layout);
        }
      }}
    />
  );
};

// Add interface for Game props
interface GameProps {
  dictionary: string[];
  onBackToMenu?: () => void;
}

// Update to add props parameter
export default function Game({ dictionary, onBackToMenu }: GameProps) {
  // State
  const [currentWord, setCurrentWord] = useState<Word>(() => {
    // Initialize the current word with marked initial letters
    const word = new Word('voiture');
    word.letters = word.letters.map((letter, index) => ({
      ...letter,
      initialPosition: index // Mark as an initial letter
    }));
    return word;
  });
  const [availableWord, setAvailableWord] = useState<Word>(() => {
    // Initialize available word with sequence information
    const word = new Word('verrat');
    word.letters = word.letters.map((letter, index) => ({
      ...letter,
      originalIndex: index // Track original position
    }));
    return word;
  });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number>(-1);
  const [activeDividerIndex, setActiveDividerIndex] = useState<number>(-1);
  
  // NEW: Track where each letter from the available word was placed in the current word
  const [placedLetterPositions, setPlacedLetterPositions] = useState<Map<number, number>>(new Map());
  
  // NEW: Track the last placed letter's original index
  const [lastPlacedLetterIndices, setLastPlacedLetterIndices] = useState<number[]>([]);
  
  // NEW: Store detected words
  const [detectedWords, setDetectedWords] = useState<DetectedWord[]>([]);
  
  // NEW: Game completion state
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  
  // NEW: Track divider positions
  const [dividerPositions, setDividerPositions] = useState<Map<number, { x: number, y: number, width: number, height: number }>>(new Map());
  
  // Refs for the word container
  const wordContainerRef = useRef<View>(null);
  const wordContainerLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // Helper to check if a letter is enabled for dragging
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
  
  // Helper to check if a divider is valid for the current state
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
    
    // FIXED: Create a new Word instance and update state properly
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

  // NEW: Handle divider layout
  const handleDividerLayout = useCallback((index: number, layout: { x: number, y: number, width: number, height: number }) => {
    setDividerPositions(prev => {
      prev.set(index, layout);
      return prev;
    });
    if (DEBUG) console.log(`Divider ${index} layout: x=${layout.x}, y=${layout.y}, w=${layout.width}, h=${layout.height}`);
  }, []);

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

  // NEW: Function to detect valid words in the current word
  const detectWords = useCallback(() => {
    const letters = currentWord.getLetters();
    const wordString = letters.map(l => l.value).join('').toLowerCase();
    
    // Find all possible subwords
    const foundWords: DetectedWord[] = [];
    
    // Check all possible substrings
    for (let start = 0; start < wordString.length; start++) {
      for (let end = start + MIN_WORD_LENGTH; end <= wordString.length; end++) {
        const subword = wordString.substring(start, end);
        
        // Check if this is a valid word from our dictionary
        if (dictionary.includes(subword)) {
          // Make sure this word contains at least one added letter
          let containsAddedLetter = false;
          for (let i = start; i < end; i++) {
            if (letters[i].initialPosition === undefined) {
              containsAddedLetter = true;
              break;
            }
          }
          
          if (containsAddedLetter) {
            foundWords.push({
              word: subword,
              startIndex: start,
              endIndex: end - 1
            });
          }
        }
      }
    }
    
    // Sort words by length (longest first)
    foundWords.sort((a, b) => b.word.length - a.word.length);
    
    setDetectedWords(foundWords);
  }, [currentWord, dictionary]);
  
  // NEW: Check for valid words after each letter placement
  useEffect(() => {
    if (lastPlacedLetterIndices.length > 0) {
      detectWords();
    }
    
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
  }, [currentWord, lastPlacedLetterIndices, availableWord, detectWords]);
  
  // NEW: Simple function to remove a detected word
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
        
        // Check all possible substrings
        for (let start = 0; start < wordString.length; start++) {
          for (let end = start + MIN_WORD_LENGTH; end <= wordString.length; end++) {
            const subword = wordString.substring(start, end);
            
            // Check if this is a valid word from our dictionary
            if (dictionary.includes(subword)) {
              // Make sure this word contains at least one added letter
              let containsAddedLetter = false;
              for (let i = start; i < end; i++) {
                if (updatedCurrentWord[i].initialPosition === undefined) {
                  containsAddedLetter = true;
                  break;
                }
              }
              
              if (containsAddedLetter) {
                foundWords.push({
                  word: subword,
                  startIndex: start,
                  endIndex: end - 1
                });
              }
            }
          }
        }
        
        // Sort words by length (longest first)
        foundWords.sort((a, b) => b.word.length - a.word.length);
        
        setDetectedWords(foundWords);
      }
    }, 100);
  }, [currentWord, availableWord, lastPlacedLetterIndices, placedLetterPositions, dictionary]);

  // Measure word container for positioning
  const handleWordContainerLayout = useCallback((event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    wordContainerLayout.current = { x, y, width, height };
    if (DEBUG) console.log(`Word container: x=${x}, y=${y}, w=${width}, h=${height}`);
  }, []);

  // Reset divider positions when a letter is placed or removed
  useEffect(() => {
    // Clear divider positions when the word structure changes
    setDividerPositions(new Map());
  }, [currentWord]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Add back button if onBackToMenu prop is provided */}
        {onBackToMenu && (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBackToMenu}
          >
            <Text style={styles.backButtonText}>← Back to Menu</Text>
          </TouchableOpacity>
        )}
        
        <Text style={styles.title}>Word Surgery</Text>
        
        {/* Game completed message */}
        {gameCompleted && (
          <View style={styles.gameCompletedContainer}>
            <Text style={styles.gameCompletedText}>Game Completed!</Text>
            <Button 
              title="Play Again" 
              onPress={() => {
                // Reset game state
                setCurrentWord(() => {
                  const word = new Word('voiture');
                  word.letters = word.letters.map((letter, index) => ({
                    ...letter,
                    initialPosition: index
                  }));
                  return word;
                });
                
                setAvailableWord(() => {
                  const word = new Word('verrat');
                  word.letters = word.letters.map((letter, index) => ({
                    ...letter,
                    originalIndex: index
                  }));
                  return word;
                });
                
                setLastPlacedLetterIndices([]);
                setPlacedLetterPositions(new Map());
                setDetectedWords([]);
                setGameCompleted(false);
              }}
            />
          </View>
        )}
        
        {/* Current Word with Dividers */}
        <View 
          style={styles.wordContainer}
          onLayout={handleWordContainerLayout}
          ref={wordContainerRef}
        >
          {/* First divider (before first letter) */}
          {isDragging && isDividerValid(0) && (
            <Divider 
              index={0}
              isActive={activeDividerIndex === 0}
              onLayout={throttle(handleDividerLayout, 1000, { leading: true, trailing: true })}
            />
          )}
          
          {currentWord.getLetters().map((letter, index) => (
            <React.Fragment key={`letter-${index}`}>
              {/* UPDATED: Added TouchableOpacity for tap handling */}
              <TouchableOpacity 
                style={[
                  styles.letterBox,
                  letter.initialPosition !== undefined && styles.initialLetterBox,
                  // NEW: Add green underline for letters that are part of detected words
                  detectedWords.some(word => 
                    index >= word.startIndex && index <= word.endIndex
                  ) && styles.detectedWordLetter
                ]}
                onPress={() => handleLetterTap(letter, index)}
                // Disable for initial letters
                disabled={letter.initialPosition !== undefined}
              >
                <Text 
                  style={[
                    styles.letterText,
                    letter.initialPosition !== undefined ? styles.staticLetterText : null
                  ]}
                >
                  {letter.value}
                </Text>
              </TouchableOpacity>

              {/* Divider after each letter - only shown when dragging and valid */}
              {isDragging && isDividerValid(index + 1) && (
                <Divider 
                  index={index + 1}
                  isActive={activeDividerIndex === index + 1}
                  onLayout={throttle(handleDividerLayout, 1000, { leading: true, trailing: true })}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Detected Words List - Add disabled state to prevent multiple clicks */}
        {detectedWords.length > 0 && (
          <View style={styles.detectedWordsContainer}>
            <Text style={styles.detectedWordsTitle}>Detected Words:</Text>
            {detectedWords.map((word, index) => (
              <View key={`word-${index}`} style={styles.detectedWordItem}>
                <Text style={styles.detectedWordText}>{word.word}</Text>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => {
                    // Clear UI first
                    setDetectedWords([]);
                    // Then do the actual removal
                    setTimeout(() => handleRemoveWord(word), 50);
                  }}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Available Letters (Draggable) */}
        <View style={styles.availableLettersContainer}>
          {availableWord.getLetters().map((letter, index) => {
            if (!letter.isAvailable) {
              return (
                <View 
                  key={`available-${index}`} 
                  style={[
                    styles.availableLetterBox, 
                    styles.disabledLetterBox,
                    letter.isCompleted && styles.completedLetterBox
                  ]}
                >
                  <Text style={[
                    styles.letterText,
                    letter.isCompleted && styles.completedLetterText
                  ]}>
                    {letter.value}
                  </Text>
                </View>
              );
            }
            
            // UPDATED: Add disabled state for letters that can't be placed yet
            const enabled = isLetterEnabled(letter.originalIndex || 0);
            
            return (
              <DraggableLetter
                key={`draggable-${index}`}
                letter={letter}
                index={index}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
                isDisabled={!enabled}
              />
            );
          })}
        </View>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center'
    },
    container: {
        alignItems: 'center',
        width: '100%',
        padding: 16
    },
    wordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: 16
    },
    letterBox: {
        borderWidth: 1,
        borderColor: 'lightgrey',
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: 60,
        margin: 2,
        flexShrink: 1,
        borderRadius: 8
    },
    initialLetterBox: {
        borderWidth: 0,
        backgroundColor: '#f8f8f8',
    },
    letterText: {
        fontSize: 18,
        textAlign: 'center'
    },
    staticLetterText: {
        color: 'black'
    },
    availableLetterBox: {
        borderWidth: 1,
        borderColor: 'lightgrey',
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: 60,
        margin: 2,
        flexShrink: 1,
        borderRadius: 8
    },
    disabledLetterBox: {
        backgroundColor: 'transparent',
    },
    disabledLetterText: {
        color: '#f0f0f0',
    },
    completedLetterBox: {
        backgroundColor: '#C5E1A5', // Light green for completed letters
        borderColor: '#7CB342',
    },
    completedLetterText: {
        color: '#2E7D32', // Dark green for text in completed letters
        fontWeight: 'bold',
    },
    disabledDraggableLetterBox: {
        backgroundColor: '#e0e0e0',
    },
    disabledDraggableLetterText: {
        color: '#777',
    },
    availableLettersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginHorizontal: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'lightgrey',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        marginTop: 16
    },
    divider: {
        marginHorizontal: 3,
        borderRadius: 2,
    },
    // NEW STYLES
    detectedWordLetter: {
        borderBottomWidth: 3,
        borderBottomColor: '#4CAF50', // green
    },
    detectedWordsContainer: {
        marginTop: 16,
        width: '100%',
        padding: 8,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    detectedWordsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    detectedWordItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 4,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    detectedWordText: {
        fontSize: 16,
    },
    removeButton: {
        backgroundColor: '#f44336',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    removeButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    gameCompletedContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#4CAF50',
        borderRadius: 8,
        alignItems: 'center',
    },
    gameCompletedText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    backButton: {
        position: 'absolute',
        top: 10,
        left: 10,
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderRadius: 8,
        zIndex: 10,
    },
    backButtonText: {
        color: '#007bff',
        fontWeight: '500',
    },
});