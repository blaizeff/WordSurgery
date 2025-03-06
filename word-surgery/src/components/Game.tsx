import React, { useState, useRef, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, findNodeHandle, UIManager, Platform } from "react-native";
import { Word } from "src/classes/Word";
import { 
  GestureHandlerRootView, 
  PanGestureHandler, 
  PanGestureHandlerGestureEvent,
  GestureDetector,
  Gesture
} from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  withTiming,
  useAnimatedReaction,
  Easing
} from 'react-native-reanimated';
import { Letter } from "../interfaces/Letter";

// Get screen width for calculations
const SCREEN_WIDTH = Dimensions.get('window').width;
// Maximum number of letters that can fit comfortably
const MAX_COMFORTABLE_LETTERS = 10;
// Minimum letter box size
const MIN_LETTER_SIZE = 20;

// Define context type for gesture handlers
type GestureContext = {
  startX: number;
  startY: number;
};

// Type for the letterPositions ref
type LetterPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Props for draggable letter component
interface DraggableLetterProps {
  letter: string;
  index: number;
  onDragStart: (index: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
}

// Props for drop zone component
interface DropZoneProps {
  index: number;
  isActive: boolean;
  onLayout: (ref: any) => void;
  letterSize: number;
}

// For debug purposes
const DEBUG = true;

// Pre-create animation values rather than in useMemo
const createAnimationValues = () => ({
  translateX: useSharedValue(0),
  translateY: useSharedValue(0),
  scale: useSharedValue(1),
  opacity: useSharedValue(1),
  zIndex: useSharedValue(1),
  originalX: useSharedValue(0),
  originalY: useSharedValue(0)
});

// Component for a draggable letter
const DraggableLetter: React.FC<DraggableLetterProps> = ({ 
  letter, 
  index, 
  onDragStart, 
  onDragMove, 
  onDragEnd
}) => {
  // Create animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const zIndex = useSharedValue(1);
  
  // Use a Pan gesture handler directly from react-native-gesture-handler
  const panGesture = Gesture.Pan()
    .onBegin(() => {
      if (DEBUG) console.log(`Starting drag for letter ${letter} at index ${index}`);
      scale.value = withSpring(1.1);
      opacity.value = withSpring(0.8);
      zIndex.value = 100;
      runOnJS(onDragStart)(index);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      
      // Check for drop zone hover
      runOnJS(onDragMove)(
        event.absoluteX,
        event.absoluteY
      );
    })
    .onEnd(() => {
      if (DEBUG) console.log(`Ending drag for letter ${letter}`);
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
          animatedStyle
        ]}
      >
        <Text style={styles.letterText}>{letter}</Text>
      </Animated.View>
    </GestureDetector>
  );
};

// Component for a drop zone
const DropZone: React.FC<DropZoneProps> = ({ 
  index, 
  isActive, 
  onLayout,
  letterSize
}) => {
  // Use a worklet to ensure smooth animations
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isActive ? letterSize : 4, { 
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      }),
      height: 40,
      opacity: withTiming(isActive ? 1 : 0, { 
        duration: 250,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      }),
      backgroundColor: isActive ? 'rgba(173, 216, 230, 0.7)' : 'transparent',
      borderWidth: withTiming(isActive ? 2 : 0, { 
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      }),
      borderColor: '#007bff',
      borderStyle: 'dashed',
      borderRadius: 8,
      marginHorizontal: 0
    };
  });
  
  return (
    <Animated.View 
      ref={onLayout}
      style={[styles.dropZone, animatedStyle]}
    />
  );
};

// For dropped letter animation
const DroppedLetter: React.FC<{letter: string, size: number}> = ({ letter, size }) => {
  return (
    <View 
      style={[
        styles.letterBox,
        { width: size, height: size }
      ]}
    >
      <Text style={[
        styles.letterText,
        size < 30 ? { fontSize: 14 } : {}
      ]}>{letter}</Text>
    </View>
  );
};

export default function Game() {
  // State
  const [currentWord, setCurrentWord] = useState<string>('voiture');
  const [availableWord, setAvailableWord] = useState<Word>(new Word('tortue'));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number>(-1);
  const [hoveredDropIndex, setHoveredDropIndex] = useState<number>(-1);
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [letterSizeSnapshot, setLetterSizeSnapshot] = useState<number>(0);
  
  // Refs
  const letterPositions = useRef<{[key: string]: LetterPosition}>({});
  
  // Handlers
  const handleInsertLetter = useCallback((letter: string, insertIndex: number): void => {
    if (DEBUG) console.log(`Inserting letter ${letter} at index ${insertIndex}`);
    
    // No need for setTimeout here - just update the state
    setCurrentWord(prev => {
      const wordArray = prev.split('');
      wordArray.splice(insertIndex, 0, letter);
      return wordArray.join('');
    });
    
    // Reset dropping state after a short delay to ensure the animation completes
    setTimeout(() => {
      setIsDropping(false);
    }, 300); // Make this match the animation duration
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

  const detectHoveredDropZone = useCallback((x: number, y: number): void => {
    const dropZoneIds = Array(currentWord.length + 1)
      .fill(0)
      .map((_, i) => `dropzone-${i}`);
      
    let foundIndex = -1;
    
    for (const id of dropZoneIds) {
      const zone = letterPositions.current[id];
      if (!zone) continue;
      
      const expanded = {
        x: zone.x - 30,
        y: zone.y - 30,
        width: zone.width + 60,
        height: zone.height + 60
      };
      
      const isWithinX = x >= expanded.x && x <= (expanded.x + expanded.width);
      const isWithinY = y >= expanded.y && y <= (expanded.y + expanded.height);
      
      if (isWithinX && isWithinY) {
        // Extract the index from the id (dropzone-X)
        foundIndex = parseInt(id.split('-')[1]);
        if (DEBUG) console.log(`Hovering over drop zone ${foundIndex}`);
        break;
      }
    }
    
    setHoveredDropIndex(foundIndex);
  }, [currentWord]);

  const handleDrop = useCallback((): void => {
    if (hoveredDropIndex >= 0 && draggedIndex >= 0) {
      const letters = availableWord.getLetters();
      if (letters && draggedIndex < letters.length) {
        const letter = letters[draggedIndex].letter;
        if (letter) {
          // Take a snapshot of the current letter size to maintain consistency
          const currentSize = getLetterBoxSize();
          setLetterSizeSnapshot(currentSize);
          
          // Signal that we're in the middle of a drop
          setIsDropping(true);
          
          // Mark the letter as used
          handleRemoveLetter(draggedIndex);
          
          // Insert the letter immediately without the timeout to avoid visual glitch
          handleInsertLetter(letter, hoveredDropIndex);
        }
      }
    } else {
      if (DEBUG) console.log('No valid drop zone found');
      setIsDropping(false);
    }
  }, [hoveredDropIndex, draggedIndex, availableWord, handleInsertLetter, handleRemoveLetter]);
  
  const handleDragStart = useCallback((index: number): void => {
    setIsDragging(true);
    setDraggedIndex(index);
  }, []);
  
  const handleDragEnd = useCallback((): void => {
    handleDrop();
    
    setIsDragging(false);
    setDraggedIndex(-1);
    setHoveredDropIndex(-1);
  }, [handleDrop]);
  
  const measureElement = useCallback((id: string, ref: any): void => {
    if (!ref) return;
    
    const handle = findNodeHandle(ref);
    if (!handle) return;
    
    UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
      letterPositions.current[id] = {
        x: pageX,
        y: pageY,
        width,
        height
      };
      
      if (DEBUG) console.log(`Measured ${id}: x=${pageX}, y=${pageY}, w=${width}, h=${height}`);
    });
  }, []);

  // Calculate letter size based on word length and drop zone state
  const getLetterBoxSize = () => {
    // Get available width - use 92% of screen width
    const containerWidth = SCREEN_WIDTH * 0.92;
    const padding = 10;
    
    // Calculate based on number of letters plus potential new letter if dropping
    // When dragging over a drop zone, we need to account for an additional letter
    const effectiveLetterCount = isDragging && hoveredDropIndex >= 0 ? 
      currentWord.length + 1 : 
      currentWord.length;
    
    const totalDropZones = effectiveLetterCount + 1;
    
    // Account for drop zones
    let dropZonesWidth = 0;
    
    // If we're dropping, use the snapshot to prevent recalculation
    if (isDropping && letterSizeSnapshot > 0) {
      // Use the snapshot during the drop process
      return letterSizeSnapshot;
    }
    
    // All drop zones at minimal width except the active one
    if (isDragging && hoveredDropIndex >= 0) {
      // One expanded drop zone (minimal width for all others)
      dropZonesWidth = ((totalDropZones - 1) * 4);
    } else {
      // All drop zones at minimal width
      dropZonesWidth = totalDropZones * 4;
    }
    
    // Total width available for letters
    const availableWidth = containerWidth - dropZonesWidth - padding;
    
    // Calculate size per letter
    let size = Math.floor(availableWidth / effectiveLetterCount);
    
    // Enforce minimum size
    return Math.max(size, MIN_LETTER_SIZE);
  };

  // Create a shared value for animating the letter box size
  const animatedLetterSize = useSharedValue(getLetterBoxSize());

  // Update the animated size when letter count or drop zone state changes
  useEffect(() => {
    if (!isDropping) {
      const newSize = getLetterBoxSize();
      animatedLetterSize.value = withTiming(newSize, { 
        duration: 300,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
    }
  }, [currentWord.length, isDragging, hoveredDropIndex, isDropping]);

  // Create animated style for letter boxes
  const letterBoxAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: animatedLetterSize.value,
      height: animatedLetterSize.value
    };
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Text style={styles.title}>Word Surgery</Text>
        
        {/* Current Word with Drop Zones */}
        <View style={styles.wordContainer}>
          <View style={styles.wordInnerContainer}>
            {/* First drop zone (before first letter) */}
            <DropZone 
              index={0}
              isActive={isDragging && hoveredDropIndex === 0}
              onLayout={ref => measureElement('dropzone-0', ref)}
              letterSize={animatedLetterSize.value}
            />
            
            {currentWord.split('').map((letter, index) => (
              <View key={`letter-${index}`} style={styles.letterContainer}>
                <Animated.View 
                  style={[
                    styles.letterBox,
                    letterBoxAnimatedStyle,
                    {
                      // Ensure consistent border with drop zones for smooth transition
                      borderWidth: 1,
                      borderColor: 'lightgrey',
                      backgroundColor: 'white',
                    }
                  ]}
                >
                  <Text style={[
                    styles.letterText,
                    animatedLetterSize.value < 30 ? { fontSize: 14 } : {}
                  ]}>{letter}</Text>
                </Animated.View>

                {/* Drop zone after each letter */}
                <DropZone 
                  index={index + 1}
                  isActive={isDragging && hoveredDropIndex === index + 1}
                  onLayout={ref => measureElement(`dropzone-${index + 1}`, ref)}
                  letterSize={animatedLetterSize.value}
                />
              </View>
            ))}
          </View>
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
                  <Text style={[styles.letterText, { color: 'lightgray' }]}>{letter.letter}</Text>
                </View>
              );
            }
            
            return (
              <DraggableLetter
                key={`draggable-${index}`}
                letter={letter.letter}
                index={index}
                onDragStart={handleDragStart}
                onDragMove={detectHoveredDropZone}
                onDragEnd={handleDragEnd}
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
        flex: 1,
        alignItems: 'center',
        width: '100%',
        padding: 16
    },
    wordContainer: {
        width: '92%',
        borderWidth: 1,
        borderColor: 'lightgrey',
        borderRadius: 8,
        padding: 8,
        backgroundColor: '#f9f9f9',
        overflow: 'hidden'
    },
    wordInnerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        flexWrap: 'nowrap',
        padding: 2
    },
    letterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    letterBox: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
    },
    letterText: {
        fontSize: 18,
        textAlign: 'center'
    },
    availableLetterBox: {
        borderWidth: 1,
        borderColor: 'lightgrey',
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        width: 40,
        height: 40,
        margin: 4,
        borderRadius: 6,
    },
    disabledLetterBox: {
        backgroundColor: 'lightgrey',
    },
    availableLettersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginHorizontal: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: 'lightgrey',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
        maxWidth: '90%',
        marginTop: 16
    },
    dropZone: {
        width: 4,
        height: 46,
        backgroundColor: 'transparent',
        borderRadius: 8,
        marginHorizontal: 0,
    },
});