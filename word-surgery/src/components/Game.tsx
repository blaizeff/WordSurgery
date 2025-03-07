import React, { useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
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

// For debug purposes
const DEBUG = true;

// Divider width when active
const DIVIDER_ACTIVE_WIDTH = 6;
// Divider width when inactive
const DIVIDER_INACTIVE_WIDTH = 2;
// Divider height 
const DIVIDER_HEIGHT = 60;

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
const Divider: React.FC<DividerProps> = ({ index, isActive }) => {
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
    />
  );
};

export default function Game() {
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
  
  // NEW: Track the last placed letter's original index
  const [lastPlacedLetterIndices, setLastPlacedLetterIndices] = useState<number[]>([]);
  
  // NEW: Track where each letter from the available word was placed in the current word
  const [placedLetterPositions, setPlacedLetterPositions] = useState<Map<number, number>>(new Map());
  
  // Refs for the word container
  const wordContainerRef = useRef<View>(null);
  const wordContainerLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // NEW: Helper to check if a letter is enabled for dragging
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
  
  // NEW: Helper to check if a divider is valid for the current state
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

  // Measure word container for positioning
  const handleWordContainerLayout = useCallback((event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    wordContainerLayout.current = { x, y, width, height };
    if (DEBUG) console.log(`Word container: x=${x}, y=${y}, w=${width}, h=${height}`);
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
    
    // Calculate the distance from the left edge of the container
    const relativeX = x - containerLeft;
    
    // Estimate divider positions based on equal spacing
    const totalDividers = currentWord.size() + 1;
    const containerWidth = wordContainerLayout.current.width;
    const approximateDividerSpace = containerWidth / totalDividers;
    
    // Find the closest divider
    let closestIndex = -1;
    let closestDistance = Number.MAX_VALUE;
    
    for (let i = 0; i < totalDividers; i++) {
      // UPDATED: Skip invalid dividers
      if (!isDividerValid(i)) {
        continue;
      }
      
      const dividerPosition = i * approximateDividerSpace;
      const distance = Math.abs(relativeX - dividerPosition);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    
    // Only activate if within a reasonable distance
    const activationThreshold = approximateDividerSpace / 3;
    if (closestDistance < activationThreshold) {
      setActiveDividerIndex(closestIndex);
    } else {
      setActiveDividerIndex(-1);
    }
  }, [currentWord.size(), isDividerValid]);
  
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Word Surgery</Text>
        
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
            />
          )}
          
          {currentWord.getLetters().map((letter, index) => (
            <React.Fragment key={`letter-${index}`}>
              {/* UPDATED: Added TouchableOpacity for tap handling */}
              <TouchableOpacity 
                style={[
                  styles.letterBox,
                  letter.initialPosition !== undefined && styles.initialLetterBox
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
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Available Letters (Draggable) */}
        <View style={styles.availableLettersContainer}>
          {availableWord.getLetters().map((letter, index) => {
            if (!letter.isAvailable) {
              return (
                <View 
                  key={`available-${index}`} 
                  style={[styles.availableLetterBox, styles.disabledLetterBox]}
                >
                  <Text style={[styles.letterText, styles.disabledLetterText]}>{letter.value}</Text>
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
});