import React, { useRef } from "react";
import { View, Text, Button, TouchableOpacity } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Word } from "../../classes/Word";
import { gameStyles } from "./styles";
import { GameProps } from "./interfaces";
import CurrentWord from "./CurrentWord";
import AvailableLetters from "./AvailableLetters";
import DetectedWordsList from "./DetectedWordsList";
import { useDragDrop } from "../../hooks/game/useDragDrop";
import { useWordDetection } from "../../hooks/game/useWordDetection";
import Ionicons from '@expo/vector-icons/Ionicons';

export default function Game({ dictionary, onBackToMenu }: GameProps) {
  // Create refs
  const wordContainerRef = useRef<View>(null);
  
  // Initialize words
  const initialCurrentWord = new Word('voiture');
  initialCurrentWord.letters = initialCurrentWord.letters.map((letter, index) => ({
    ...letter,
    initialPosition: index // Mark as an initial letter
  }));
  
  const initialAvailableWord = new Word('verrat');
  initialAvailableWord.letters = initialAvailableWord.letters.map((letter, index) => ({
    ...letter,
    originalIndex: index // Track original position
  }));
  
  // Use custom hooks
  const {
    currentWord,
    setCurrentWord,
    availableWord,
    setAvailableWord,
    isDragging,
    activeDividerIndex,
    lastPlacedLetterIndices,
    setLastPlacedLetterIndices,
    placedLetterPositions,
    setPlacedLetterPositions,
    isLetterEnabled,
    isDividerValid,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDividerLayout,
    handleLetterTap,
    handleWordContainerLayout,
  } = useDragDrop(initialCurrentWord, initialAvailableWord);
  
  const {
    detectedWords,
    setDetectedWords,
    gameCompleted,
    setGameCompleted,
    handleRemoveWord,
  } = useWordDetection(
    currentWord,
    availableWord,
    dictionary,
    lastPlacedLetterIndices,
    placedLetterPositions,
    setCurrentWord,
    setAvailableWord,
    setLastPlacedLetterIndices,
    setPlacedLetterPositions
  );
  
  // Reset game function
  const resetGame = () => {
    // Reset all state
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
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={gameStyles.container}>
        {/* Add back button if onBackToMenu prop is provided */}
        {onBackToMenu && (
          <TouchableOpacity 
            style={gameStyles.backButton}
            onPress={onBackToMenu}
          >
            <Ionicons name="arrow-back" size={16} color="black" />
            <Text style={gameStyles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <Text style={gameStyles.title}>Word Surgery</Text>
        
        {/* Game completed message */}
        {gameCompleted && (
          <View style={gameStyles.gameCompletedContainer}>
            <Text style={gameStyles.gameCompletedText}>Game Completed!</Text>
            <Button 
              title="Play Again" 
              onPress={resetGame}
            />
          </View>
        )}
        
        {/* Current Word with Dividers */}
        <CurrentWord
          currentWord={currentWord}
          isDragging={isDragging}
          activeDividerIndex={activeDividerIndex}
          isDividerValid={isDividerValid}
          handleDividerLayout={handleDividerLayout}
          handleLetterTap={handleLetterTap}
          handleWordContainerLayout={handleWordContainerLayout}
          detectedWords={detectedWords}
          wordContainerRef={wordContainerRef}
        />

        {/* Detected Words List */}
        <DetectedWordsList 
          detectedWords={detectedWords} 
          handleRemoveWord={handleRemoveWord} 
        />

        {/* Available Letters (Draggable) */}
        <AvailableLetters
          availableWord={availableWord}
          isLetterEnabled={isLetterEnabled}
          handleDragStart={handleDragStart}
          handleDragMove={handleDragMove}
          handleDragEnd={handleDragEnd}
        />
      </View>
    </GestureHandlerRootView>
  );
} 