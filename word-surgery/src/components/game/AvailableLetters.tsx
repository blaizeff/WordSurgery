import React from "react";
import { View, Text } from "react-native";
import { AvailableLettersProps } from "./interfaces";
import { gameStyles } from "./styles";
import DraggableLetter from "./DraggableLetter";

const AvailableLetters: React.FC<AvailableLettersProps> = ({
  availableWord,
  isLetterEnabled,
  handleDragStart,
  handleDragMove,
  handleDragEnd
}) => {
  return (
    <View style={gameStyles.availableLettersContainer}>
      {availableWord.getLetters().map((letter, index) => {
        if (!letter.isAvailable) {
          return (
            <View 
              key={`available-${index}`} 
              style={[
                gameStyles.availableLetterBox, 
                gameStyles.disabledLetterBox,
                letter.isCompleted && gameStyles.completedLetterBox
              ]}
            >
              <Text style={[
                gameStyles.letterText,
                gameStyles.disabledLetterText,
                letter.isCompleted && gameStyles.completedLetterText
              ]}>
                {letter.value}
              </Text>
            </View>
          );
        }
        
        // Add disabled state for letters that can't be placed yet
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
  );
};

export default AvailableLetters; 