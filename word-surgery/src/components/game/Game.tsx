import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, Dimensions, Animated } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import { gameStyles } from "./styles";
import { GameProps } from "./interfaces";
import CurrentWord from "./CurrentWord";
import AvailableLetters from "./AvailableLetters";
import DetectedWordsList from "./DetectedWordsList";
import { useDragDrop } from "../../hooks/game/useDragDrop";
import { useWordDetection } from "../../hooks/game/useWordDetection";
import Ionicons from '@expo/vector-icons/Ionicons';
import { DEBUG, generateRandomWords } from "src/utils/gameUtils";
import { useUndo } from "src/hooks/game/useUndo";
import { useTranslation } from "src/hooks/useTranslation";
const GAME_DURATION = 120;

export default function Game({ currentLanguage, dictionary, dictArray, onBackToMenu }: GameProps) {
  // Create refs and states
  const wordContainerRef = useRef<View>(null);
  const confettiRef = useRef<LottieView>(null);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_DURATION);
  const [gameActive, setGameActive] = useState<boolean>(true);
  const [timeUp, setTimeUp] = useState<boolean>(false);
  
  const getNewWords = useCallback(() => {
    return generateRandomWords(dictArray);
  }, [dictArray]);
  
  const [initialWords] = useState(() => getNewWords());
  
  const initialCurrentWord = initialWords.currentWord;
  const initialAvailableWord = initialWords.availableWord;
  
  // Hooks
  const { t } = useTranslation(currentLanguage);

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

  const {
    undoStack,
    resetUndoState,
    handleUndo,
    handleDragStartWithUndo,
    handleDragEndWithUndo,
    handleLetterTapWithUndo,
    handleRemoveWordWithUndo,
  } = useUndo(
    initialCurrentWord,
    initialAvailableWord,
    lastPlacedLetterIndices,
    placedLetterPositions,
    detectedWords,
    currentWord,
    availableWord,
    setCurrentWord,
    setAvailableWord,
    setLastPlacedLetterIndices,
    setPlacedLetterPositions,
    setDetectedWords,
    handleLetterTap,
    handleDragStart,
    handleDragEnd,
    handleRemoveWord
  );

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, []);
  
  const getTimerColor = useCallback((seconds: number) => {
    if (seconds <= 10) return '#FF5252'; // Red
    if (seconds <= 30) return '#FFC107'; // Yellow
    return '#4CAF50'; // Green
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

  // Game over effect
  useEffect(() => {
    if (currentWord.size() === 0) {
      setGameCompleted(true);
      setGameActive(false);
    }
  }, [currentWord]);

  // Time's up effect
  useEffect(() => {
    if (timeRemaining === 0 && !gameCompleted) {
      setTimeUp(true);
      setGameActive(false);
    }
  }, [timeRemaining, gameCompleted]);
  
  const resetGame = () => {
    const newWords = getNewWords();
    
    setCurrentWord(() => newWords.currentWord);
    setAvailableWord(() => newWords.availableWord);
    
    setLastPlacedLetterIndices([]);
    setPlacedLetterPositions(new Map());
    setDetectedWords([]);
    setGameCompleted(false);
    setTimeRemaining(GAME_DURATION);
    setGameActive(true);
    setTimeUp(false);

    resetUndoState(newWords);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={gameStyles.container}>
        {/* Back button */}
        {onBackToMenu && (
          <TouchableOpacity 
            style={gameStyles.backButton}
            onPress={onBackToMenu}
          >
            <Ionicons name="arrow-back" size={16} color="black" />
            <Text style={gameStyles.backButtonText}>{t('game.back_button')}</Text>
          </TouchableOpacity>
        )}
        
        <Text style={gameStyles.title}>{t('game.title')}</Text>
        
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
        
        {/* Current Word */}
        <CurrentWord
          currentWord={currentWord}
          isDragging={isDragging}
          activeDividerIndex={activeDividerIndex}
          isDividerValid={isDividerValid}
          handleDividerLayout={handleDividerLayout}
          handleLetterTap={handleLetterTapWithUndo}
          handleWordContainerLayout={handleWordContainerLayout}
          detectedWords={detectedWords}
          wordContainerRef={wordContainerRef}
        />

        {/* Detected Words Alert */}
        <DetectedWordsList 
          t={t}
          detectedWords={detectedWords} 
          handleRemoveWord={handleRemoveWordWithUndo} 
        />

        <View style={gameStyles.bottomContainer}>
          {/* Undo Button */}
          <TouchableOpacity
            style={[
              gameStyles.undoButton,
              { opacity: undoStack.length > 0 ? 1 : 0.5 }
            ]}
            onPress={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Ionicons name="arrow-undo" size={20} color="white" />
            <Text style={gameStyles.undoButtonText}>{t('game.button_undo')}</Text>
          </TouchableOpacity>

          {/* Available Letters */}
          <AvailableLetters
            availableWord={availableWord}
            isLetterEnabled={isLetterEnabled}
            handleDragStart={handleDragStartWithUndo}
            handleDragMove={handleDragMove}
            handleDragEnd={handleDragEndWithUndo}
          />
        </View>
        
        {/* Victory Modal */}
        {gameCompleted && (
          <View style={gameStyles.victoryOverlay}>
            <LottieView
              ref={confettiRef}
              source={require('../../../assets/confetti.json')}
              style={{
                position: 'absolute',
                width: '150%',
                height: '100%',
                left: '-25%',
                top: 0,
              }}
              speed={1.2}
              autoPlay
              loop={false}
            />
            <View style={gameStyles.victoryDialog}>
              <Text style={gameStyles.victoryText}>{t('game.game_completed')}</Text>
              <TouchableOpacity 
                style={gameStyles.victoryButton}
                onPress={resetGame}
              >
                <Text style={gameStyles.victoryButtonText}>{t('game.button_play_again')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        {/* Time's Up Modal */}
        {timeUp && (
          <View style={gameStyles.victoryOverlay}>
            <View style={gameStyles.victoryDialog}>
              <Ionicons name="timer-outline" size={50} color="#FF5252" style={{marginBottom: 10}} />
              <Text style={[gameStyles.victoryText, {color: '#FF5252'}]}>{t('game.time_up')}</Text>
              <TouchableOpacity 
                style={[gameStyles.victoryButton, {backgroundColor: '#FF5252'}]}
                onPress={resetGame}
              >
                <Text style={gameStyles.victoryButtonText}>{t('game.button_try_again')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
} 