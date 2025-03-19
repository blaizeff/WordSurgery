import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, Dimensions, Animated } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import { Word } from "../../classes/Word";
import { gameStyles } from "./styles";
import { GameProps } from "./interfaces";
import CurrentWord from "./CurrentWord";
import AvailableLetters from "./AvailableLetters";
import DetectedWordsList from "./DetectedWordsList";
import { useDragDrop } from "../../hooks/game/useDragDrop";
import { useWordDetection } from "../../hooks/game/useWordDetection";
import Ionicons from '@expo/vector-icons/Ionicons';

// Game duration in seconds (2 minutes)
const GAME_DURATION = 15; // 2 minutes

export default function Game({ dictionary, onBackToMenu }: GameProps) {
  // Create refs and states
  const wordContainerRef = useRef<View>(null);
  const confettiRef = useRef<LottieView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_DURATION);
  const [gameActive, setGameActive] = useState<boolean>(true);
  const [timeUp, setTimeUp] = useState<boolean>(false);
  
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

  // Format time as mm:ss
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);
  
  // Get timer color based on remaining time
  const getTimerColor = useCallback((seconds: number) => {
    if (seconds <= 10) return '#FF5252'; // Red for 10 seconds or less
    if (seconds <= 30) return '#FFC107'; // Yellow for 30 seconds or less
    return '#4CAF50'; // Default green
  }, []);

  // Timer effect
  useEffect(() => {
    if (!gameActive || gameCompleted) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameActive, gameCompleted]);

  // Game completion effect
  useEffect(() => {
    if (currentWord.size() === 0) {
      setGameCompleted(true);
      setGameActive(false);
    }
  }, [currentWord]);

  // Time's up effect
  useEffect(() => {
    if (timeRemaining === 0 && !gameCompleted) {
      // Game over due to time running out
      setTimeUp(true);
      setGameActive(false);
    }
  }, [timeRemaining, gameCompleted]);
  
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
    setTimeRemaining(GAME_DURATION);
    setGameActive(true);
    setTimeUp(false);
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
        
        {/* Timer */}
        <View style={[gameStyles.timerContainer]}>
          <Ionicons 
            name="timer-outline" 
            size={18} 
            color={getTimerColor(timeRemaining)} 
          />
          <Text 
            style={[
              gameStyles.timerText, 
              { color: getTimerColor(timeRemaining) }
            ]}
          >
            {formatTime(timeRemaining)}
          </Text>
        </View>
        
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
        
        {/* Victory Modal with Confetti */}
        {gameCompleted && (
          <View style={gameStyles.victoryOverlay}>
            <LottieView
              ref={confettiRef}
              source={require('../../../assets/confetti.json')}
              style={{
                position: 'absolute',
                width: '150%',
                height: '100%',
                left: '-25%', // Center the wider animation (150% width means 25% on each side)
                top: 0,
              }}
              speed={1.2}
              autoPlay
              loop={false}
            />
            <View style={gameStyles.victoryDialog}>
              <Text style={gameStyles.victoryText}>Game Completed!</Text>
              <TouchableOpacity 
                style={gameStyles.victoryButton}
                onPress={resetGame}
              >
                <Text style={gameStyles.victoryButtonText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Time's Up Modal */}
        {timeUp && (
          <View style={gameStyles.victoryOverlay}>
            <View style={gameStyles.victoryDialog}>
              <Ionicons name="timer-outline" size={50} color="#FF5252" style={{marginBottom: 10}} />
              <Text style={[gameStyles.victoryText, {color: '#FF5252'}]}>Time's Up!</Text>
              <TouchableOpacity 
                style={[gameStyles.victoryButton, {backgroundColor: '#FF5252'}]}
                onPress={resetGame}
              >
                <Text style={gameStyles.victoryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
} 