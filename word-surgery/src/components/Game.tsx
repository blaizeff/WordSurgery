import React, { useState, useRef, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
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
import { Letter } from "../interfaces/Letter";

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
  letter: string;
  index: number;
  onDragStart: (index: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
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
  onDragEnd
}) => {
  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const zIndex = useSharedValue(1);
  
  // Pan gesture handler
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
      
      // Pass absolute position for divider detection
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
  const [currentWord, setCurrentWord] = useState<string>('voiture');
  const [availableWord, setAvailableWord] = useState<Word>(new Word('tortue'));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedIndex, setDraggedIndex] = useState<number>(-1);
  const [activeDividerIndex, setActiveDividerIndex] = useState<number>(-1);
  
  // Refs for the word container
  const wordContainerRef = useRef<View>(null);
  const wordContainerLayout = useRef({ x: 0, y: 0, width: 0, height: 0 });
  
  // Handlers
  const handleInsertLetter = useCallback((letter: string, insertIndex: number): void => {
    if (DEBUG) console.log(`Inserting letter ${letter} at index ${insertIndex}`);
    
    setCurrentWord(prev => {
      const wordArray = prev.split('');
      wordArray.splice(insertIndex, 0, letter);
      return wordArray.join('');
    });
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
    const totalDividers = currentWord.length + 1;
    const containerWidth = wordContainerLayout.current.width;
    const approximateDividerSpace = containerWidth / totalDividers;
    
    // Find the closest divider
    let closestIndex = -1;
    let closestDistance = Number.MAX_VALUE;
    
    for (let i = 0; i < totalDividers; i++) {
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
  }, [currentWord.length]);
  
  // Handle drop
  const handleDrop = useCallback((): void => {
    if (activeDividerIndex >= 0 && draggedIndex >= 0) {
      const letters = availableWord.getLetters();
      if (letters && draggedIndex < letters.length) {
        const letter = letters[draggedIndex].letter;
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
          {isDragging && (
            <Divider 
              index={0}
              isActive={activeDividerIndex === 0}
            />
          )}
          
          {currentWord.split('').map((letter, index) => (
            <React.Fragment key={`letter-${index}`}>
              <View style={styles.letterBox}>
                <Text style={styles.letterText}>{letter}</Text>
              </View>

              {/* Divider after each letter - only shown when dragging */}
              {isDragging && (
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
                  <Text style={styles.letterText}>{letter.letter}</Text>
                </View>
              );
            }
            
            return (
              <DraggableLetter
                key={`draggable-${index}`}
                letter={letter.letter}
                index={index}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
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
        width: 60,
        height: 60,
        margin: 2,
        flexShrink: 1,
        borderRadius: 8
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