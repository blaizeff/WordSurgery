import { useCallback, useEffect, useRef, useState } from "react";
import { Word } from "src/classes/Word";
import { DetectedWord, GameState, GameStateAction } from "src/components/game/interfaces";
import { ILetter } from "src/interfaces/ILetter";
import { DEBUG } from "src/utils/gameUtils";

export function useUndo(
  initialCurrentWord: Word, 
  initialAvailableWord: Word, 
  lastPlacedLetterIndices: number[], 
  placedLetterPositions: Map<number, number>, 
  detectedWords: DetectedWord[],
  currentWord: Word,
  availableWord: Word,
  setCurrentWord: (word: Word) => void,
  setAvailableWord: (word: Word) => void,
  setLastPlacedLetterIndices: (indices: number[]) => void,
  setPlacedLetterPositions: (positions: Map<number, number>) => void,
  setDetectedWords: (words: DetectedWord[]) => void,
  handleLetterTap: (letter: ILetter, index: number) => void,
  handleDragStart: (index: number) => void,
  handleDragEnd: () => boolean,
  handleRemoveWord: (wordToRemove: DetectedWord) => void
) {
  const [undoStack, setUndoStack] = useState<GameState[]>([]);
  const [dragStartState, setDragStartState] = useState<GameState | null>(null);

  const actionStateRef = useRef({
      lastSavedWordLength: initialCurrentWord.getLetters().length,
      lastSavedPlacedLetterIndices: [] as number[],
      lastSavedDetectedWordsLength: 0,
      saving: false,
      dragInProgress: false
  });

  // Save initial state on mount
  useEffect(() => {
    actionStateRef.current = {
      lastSavedWordLength: initialCurrentWord.getLetters().length,
      lastSavedPlacedLetterIndices: [],
      lastSavedDetectedWordsLength: 0,
      saving: false,
      dragInProgress: false
    };
    
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
    
    setUndoStack([initialState]);
  }, [initialCurrentWord, initialAvailableWord]);

  // Save current state to undo stack
  const saveState = useCallback((action: GameStateAction) => {
    const currentState: GameState = {
      currentWord: new Word(''),
      availableWord: new Word(''),
      lastPlacedLetterIndices: [...lastPlacedLetterIndices],
      placedLetterPositions: new Map(placedLetterPositions),
      detectedWords: [...detectedWords]
    };
    
    currentState.currentWord.letters = currentWord.getLetters().map(letter => ({...letter}));
    currentState.availableWord.letters = availableWord.getLetters().map(letter => ({...letter}));
    
    if (DEBUG) console.log(`Saving state after action: ${action}`);
    
    if (action === 'dragstart') {
      setDragStartState(currentState);
    } else {
      setUndoStack(prev => [...prev, currentState]);
    }
  }, [currentWord, availableWord, lastPlacedLetterIndices, placedLetterPositions, detectedWords]);

  const applyGameState = useCallback((state: GameState) => {
    const newCurrentWord = new Word('');
    newCurrentWord.letters = [...state.currentWord.letters];
    setCurrentWord(newCurrentWord);
    
    const newAvailableWord = new Word('');
    newAvailableWord.letters = [...state.availableWord.letters];
    setAvailableWord(newAvailableWord);
    
    setLastPlacedLetterIndices([...state.lastPlacedLetterIndices]);
    setPlacedLetterPositions(new Map(state.placedLetterPositions));
    setDetectedWords([...state.detectedWords]);

    actionStateRef.current = {
      lastSavedWordLength: state.currentWord.letters.length,
      lastSavedPlacedLetterIndices: [...state.lastPlacedLetterIndices],
      lastSavedDetectedWordsLength: state.detectedWords.length,
      saving: false,
      dragInProgress: false
    };
  }, [setCurrentWord, setAvailableWord, setLastPlacedLetterIndices, setPlacedLetterPositions, setDetectedWords]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    
    actionStateRef.current.saving = true;
    
    const prevState = undoStack[undoStack.length - 1];
    applyGameState(prevState);
    
    setUndoStack(prev => prev.slice(0, -1));
    
    console.log("Undo completed - restored previous state");
  }, [undoStack, setCurrentWord, setAvailableWord, setLastPlacedLetterIndices, setPlacedLetterPositions, setDetectedWords]);

  const handleLetterTapWithUndo = useCallback((letter: ILetter, index: number) => {
    if (!actionStateRef.current.saving) {
      saveState("tapletter");
    }
    
    handleLetterTap(letter, index);
  }, [handleLetterTap, saveState]);

  const handleDragStartWithUndo = useCallback((index: number) => {
    if (!actionStateRef.current.saving && !actionStateRef.current.dragInProgress) {
      requestAnimationFrame(() => {
        saveState("dragstart");
      });
      actionStateRef.current.dragInProgress = true;
    }
    
    handleDragStart(index);
  }, [handleDragStart, saveState]);
  
  const handleDragEndWithUndo = useCallback(() => {
    const letterAdded = handleDragEnd();

    if (letterAdded && !actionStateRef.current.saving && dragStartState) {
      setUndoStack(prev => [...prev, dragStartState]);
      setDragStartState(null);
    }
    
    actionStateRef.current.dragInProgress = false;
    
    actionStateRef.current.lastSavedWordLength = currentWord.getLetters().length;
    actionStateRef.current.lastSavedPlacedLetterIndices = [...lastPlacedLetterIndices];
    
  }, [handleDragEnd, currentWord, lastPlacedLetterIndices]);

  const handleRemoveWordWithUndo = useCallback((wordToRemove: DetectedWord) => {
    if (!actionStateRef.current.saving) {
      saveState("removeword");
    }
    
    handleRemoveWord(wordToRemove);
  }, [handleRemoveWord, saveState]);

  const resetUndoState = (newWords: { currentWord: Word, availableWord: Word }) => {
    setUndoStack([]);
    
    actionStateRef.current = {
      lastSavedWordLength: newWords.currentWord.getLetters().length,
      lastSavedPlacedLetterIndices: [],
      lastSavedDetectedWordsLength: 0,
      saving: false,
      dragInProgress: false
    };
  };

  return { undoStack, resetUndoState, handleUndo, handleLetterTapWithUndo, handleDragStartWithUndo, handleDragEndWithUndo, handleRemoveWordWithUndo };
}
