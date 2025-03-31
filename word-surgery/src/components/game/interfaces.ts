import { ILetter } from "../../interfaces/ILetter";
import { Word } from "../../classes/Word";

// Interface for detected words
export class DetectedWord {
  word: string;
  startIndex: number;
  endIndex: number;

  constructor(word: string, startIndex: number, endIndex: number) {
    this.word = word;
    this.startIndex = startIndex;
    this.endIndex = endIndex;
  }

  valueOf(): string {
    return this.word;
  }
}

// Props for draggable letter component
export interface DraggableLetterProps {
  letter: ILetter;
  index: number;
  onDragStart: (index: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
  isDisabled?: boolean;
}

// Props for divider component
export interface DividerProps {
  index: number;
  isActive: boolean;
  onLayout?: (index: number, layout: { x: number, y: number, width: number, height: number }) => void;
}

// Add interface for Game props
export interface GameProps {
  dictionary: Set<string>;
  dictArray: string[];
  onBackToMenu?: () => void;
}

// Props for CurrentWord component
export interface CurrentWordProps {
  currentWord: Word;
  isDragging: boolean;
  activeDividerIndex: number;
  isDividerValid: (index: number) => boolean;
  handleDividerLayout: (index: number, layout: { x: number, y: number, width: number, height: number }) => void;
  handleLetterTap: (letter: ILetter, index: number) => void;
  handleWordContainerLayout: (event: any) => void;
  detectedWords: DetectedWord[];
  wordContainerRef: React.RefObject<any>;
}

// Props for AvailableLetters component
export interface AvailableLettersProps {
  availableWord: Word;
  isLetterEnabled: (originalIndex: number) => boolean;
  handleDragStart: (index: number) => void;
  handleDragMove: (x: number, y: number) => void;
  handleDragEnd: () => void;
}

// Props for LetterDivider component
export interface LetterDividerProps extends DividerProps {
  // Extension of the base DividerProps
}

// Interface for DetectedWordsList component
export interface DetectedWordsListProps {
  detectedWords: DetectedWord[];
  handleRemoveWord: (word: DetectedWord) => void;
} 


export interface GameState {
  currentWord: Word;
  availableWord: Word;
  lastPlacedLetterIndices: number[];
  placedLetterPositions: Map<number, number>;
  detectedWords: DetectedWord[];
}

export type GameStateAction = 'tapletter' | 'dragstart' | 'dragend' | 'removeword';