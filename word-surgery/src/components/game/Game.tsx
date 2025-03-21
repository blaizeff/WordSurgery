import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Modal, Dimensions, Animated } from "react-native";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LottieView from 'lottie-react-native';
import { Word } from "../../classes/Word";
import { ILetter } from "../../interfaces/ILetter";
import { gameStyles } from "./styles";
import { GameProps, DetectedWord } from "./interfaces";
import CurrentWord from "./CurrentWord";
import AvailableLetters from "./AvailableLetters";
import DetectedWordsList from "./DetectedWordsList";
import { useDragDrop } from "../../hooks/game/useDragDrop";
import { useWordDetection } from "../../hooks/game/useWordDetection";
import Ionicons from '@expo/vector-icons/Ionicons';

// Store the game state for undo functionality
interface GameState {
  currentWord: Word;
  availableWord: Word;
  lastPlacedLetterIndices: number[];
  placedLetterPositions: Map<number, number>;
  detectedWords: DetectedWord[];
}

// Debug mode for testing
const DEBUG_MODE = false;

// Game duration in seconds (2 minutes)
const GAME_DURATION = DEBUG_MODE ? 15 : 120; // 2 minutes or 15 seconds in debug mode

// Min/max word length constraints
const MIN_WORD_LENGTH = 5;
const MAX_WORD_LENGTH = 8;

export default function Game({ dictionary, dictArray, onBackToMenu }: GameProps) {
  // Create refs and states
  const wordContainerRef = useRef<View>(null);
  const confettiRef = useRef<LottieView>(null);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(GAME_DURATION);
  const [gameActive, setGameActive] = useState<boolean>(true);
  const [timeUp, setTimeUp] = useState<boolean>(false);
  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  
  // Word generation functions
  const generateRandomWords = useCallback(() => {
    console.log('Generating random words');
    // Pick two random words that meet the length criteria
    const maxAttempts = 1000;

    const firstIndex = Math.floor(Math.random() * (dictArray.length - maxAttempts));
    const secondIndex = Math.floor(Math.random() * (dictArray.length - maxAttempts));

    for (let i = firstIndex; i < firstIndex + maxAttempts; i++) {
      // Randomly sample words from dictionary
      const word1 = dictArray[i];
      if (word1.length < MIN_WORD_LENGTH || word1.length > MAX_WORD_LENGTH) {
        console.log('Invalid word length:', word1);
        continue;
      }
      for (let j = secondIndex; j < secondIndex + maxAttempts; j++) {
        const word2 = dictArray[j];
        if (word2.length < MIN_WORD_LENGTH || word2.length > MAX_WORD_LENGTH) {
          console.log('Invalid word length:', word2);
          continue;
        }
      
        // Create Word objects
        const currentWordObj = new Word(word1);
        const availableWordObj = new Word(word2);
        
        console.log('Selected random word pair:', word1, word2);
        
        // Add initial position to current word's letters
        currentWordObj.letters = currentWordObj.letters.map((letter, index) => ({
          ...letter,
          initialPosition: index
        }));
        
        // Add original index to available word's letters
        availableWordObj.letters = availableWordObj.letters.map((letter, index) => ({
          ...letter,
          originalIndex: index
        }));
        
        return { currentWord: currentWordObj, availableWord: availableWordObj };
      }
    }
    
    // Fallback if randomization doesn't work for some reason
    console.warn('Using fallback words');
    const fallbackCurrent = new Word('voiture');
    fallbackCurrent.letters = fallbackCurrent.letters.map((letter, index) => ({
      ...letter,
      initialPosition: index
    }));
    
    const fallbackAvailable = new Word('verrat');
    fallbackAvailable.letters = fallbackAvailable.letters.map((letter, index) => ({
      ...letter,
      originalIndex: index
    }));
    
    return { 
      currentWord: fallbackCurrent, 
      availableWord: fallbackAvailable
    };
  }, [dictArray]);
  
  // Generate initial words
  const [initialWords] = useState(() => generateRandomWords());
  
  // Initialize words
  const initialCurrentWord = initialWords.currentWord;
  const initialAvailableWord = initialWords.availableWord;
  
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

  // Save current state to undo stack
  const saveState = useCallback((action: string) => {
    // Deep copy the state before modifying it
    const currentState: GameState = {
      currentWord: new Word(''),
      availableWord: new Word(''),
      lastPlacedLetterIndices: [...lastPlacedLetterIndices],
      placedLetterPositions: new Map(placedLetterPositions),
      detectedWords: [...detectedWords]
    };
    
    // Deep copy letter arrays
    currentState.currentWord.letters = JSON.parse(JSON.stringify(currentWord.getLetters()));
    currentState.availableWord.letters = JSON.parse(JSON.stringify(availableWord.getLetters()));
    
    console.log(`Saving state after action: ${action}`);
    setUndoStack(prev => [...prev, currentState]);
  }, [currentWord, availableWord, lastPlacedLetterIndices, placedLetterPositions, detectedWords]);

  // Track letter placement in a ref
  const actionStateRef = useRef({
    lastSavedWordLength: initialCurrentWord.getLetters().length,
    lastSavedPlacedLetterIndices: [] as number[],
    lastSavedDetectedWordsLength: 0,
    saving: false,
    dragInProgress: false
  });

  // Handle undo action
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    // Set flag to prevent state saving during restoration
    actionStateRef.current.saving = true;
    
    // Get the previous state
    const prevState = undoStack[undoStack.length - 1];
    
    // Restore the previous state
    const newCurrentWord = new Word('');
    newCurrentWord.letters = [...prevState.currentWord.letters];
    setCurrentWord(newCurrentWord);
    
    const newAvailableWord = new Word('');
    newAvailableWord.letters = [...prevState.availableWord.letters];
    setAvailableWord(newAvailableWord);
    
    setLastPlacedLetterIndices([...prevState.lastPlacedLetterIndices]);
    setPlacedLetterPositions(new Map(prevState.placedLetterPositions));
    setDetectedWords([...prevState.detectedWords]);
    
    // Update tracking refs
    actionStateRef.current = {
      lastSavedWordLength: prevState.currentWord.letters.length,
      lastSavedPlacedLetterIndices: [...prevState.lastPlacedLetterIndices],
      lastSavedDetectedWordsLength: prevState.detectedWords.length,
      saving: false,
      dragInProgress: false
    };
    
    // Remove the used state from the stack
    setUndoStack(prev => prev.slice(0, -1));
    
    console.log("Undo completed - restored previous state");
  }, [undoStack, setCurrentWord, setAvailableWord, setLastPlacedLetterIndices, setPlacedLetterPositions, setDetectedWords]);

  // Enhanced letter tap handler to save state before modification
  const handleLetterTapWithUndo = useCallback((letter: ILetter, index: number) => {
    // Save state before modifying
    if (!actionStateRef.current.saving) {
      saveState("tap letter");
    }
    
    // Call original handler
    handleLetterTap(letter, index);
  }, [handleLetterTap, saveState]);

  // Enhanced drag handlers to save state
  const handleDragStartWithUndo = useCallback((index: number) => {
    // Save state before starting to drag (before any letter is added)
    if (!actionStateRef.current.saving && !actionStateRef.current.dragInProgress) {
      saveState("drag start");
      actionStateRef.current.dragInProgress = true;
    }
    
    // Call original handler
    handleDragStart(index);
  }, [handleDragStart, saveState]);
  
  const handleDragEndWithUndo = useCallback(() => {
    // Call original handler
    handleDragEnd();
    
    // Reset drag flag
    actionStateRef.current.dragInProgress = false;
    
    // Update tracking refs for future operations
    actionStateRef.current.lastSavedWordLength = currentWord.getLetters().length;
    actionStateRef.current.lastSavedPlacedLetterIndices = [...lastPlacedLetterIndices];
    
  }, [handleDragEnd, currentWord, lastPlacedLetterIndices]);

  // Enhanced word removal handler
  const handleRemoveWordWithUndo = useCallback((wordToRemove: DetectedWord) => {
    // Save state before removing word
    if (!actionStateRef.current.saving) {
      saveState("remove word");
    }
    
    // Call original handler
    handleRemoveWord(wordToRemove);
  }, [handleRemoveWord, saveState]);

  // Save initial state on mount
  useEffect(() => {
    // Save initial state references
    actionStateRef.current = {
      lastSavedWordLength: initialCurrentWord.getLetters().length,
      lastSavedPlacedLetterIndices: [],
      lastSavedDetectedWordsLength: 0,
      saving: false,
      dragInProgress: false
    };
    
    // Save the initial game state to enable undoing to the very beginning
    const initialState: GameState = {
      currentWord: new Word(''),
      availableWord: new Word(''),
      lastPlacedLetterIndices: [],
      placedLetterPositions: new Map(),
      detectedWords: []
    };
    
    // Deep copy letter arrays
    initialState.currentWord.letters = JSON.parse(JSON.stringify(initialCurrentWord.getLetters()));
    initialState.availableWord.letters = JSON.parse(JSON.stringify(initialAvailableWord.getLetters()));
    
    // Set the initial state as the first undo point
    console.log("Saving initial game state");
    setUndoStack([initialState]);
  }, [initialCurrentWord, initialAvailableWord]);

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
    // Generate new random words
    const newWords = generateRandomWords();
    
    // Reset all state
    setCurrentWord(() => newWords.currentWord);
    setAvailableWord(() => newWords.availableWord);
    
    setLastPlacedLetterIndices([]);
    setPlacedLetterPositions(new Map());
    setDetectedWords([]);
    setGameCompleted(false);
    setTimeRemaining(GAME_DURATION);
    setGameActive(true);
    setTimeUp(false);
    
    // Clear the undo stack
    setUndoStack([]);
    
    // Reset tracking refs
    actionStateRef.current = {
      lastSavedWordLength: newWords.currentWord.getLetters().length,
      lastSavedPlacedLetterIndices: [],
      lastSavedDetectedWordsLength: 0,
      saving: false,
      dragInProgress: false
    };
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
          handleLetterTap={handleLetterTapWithUndo}
          handleWordContainerLayout={handleWordContainerLayout}
          detectedWords={detectedWords}
          wordContainerRef={wordContainerRef}
        />

        {/* Detected Words List */}
        <DetectedWordsList 
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
            <Text style={gameStyles.undoButtonText}>Undo</Text>
          </TouchableOpacity>

          {/* Available Letters (Draggable) */}
          <AvailableLetters
            availableWord={availableWord}
            isLetterEnabled={isLetterEnabled}
            handleDragStart={handleDragStartWithUndo}
            handleDragMove={handleDragMove}
            handleDragEnd={handleDragEndWithUndo}
          />
        </View>
        
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