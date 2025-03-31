import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CurrentWordProps } from "./interfaces";
import { gameStyles } from "./styles";
import LetterDivider from "./LetterDivider";

const CurrentWord: React.FC<CurrentWordProps> = ({
  currentWord,
  isDragging,
  activeDividerIndex,
  isDividerValid,
  handleDividerLayout,
  handleLetterTap,
  handleWordContainerLayout,
  detectedWords,
  wordContainerRef
}) => {
  return (
    <View 
      style={gameStyles.wordContainer}
      onLayout={handleWordContainerLayout}
      ref={wordContainerRef}
    >
      {/* First divider (before first letter) */}
      {isDragging && isDividerValid(0) && (
        <LetterDivider 
          index={0}
          isActive={activeDividerIndex === 0}
          onLayout={handleDividerLayout}
        />
      )}
      
      {currentWord.getLetters().map((letter, index) => (
        <React.Fragment key={`letter-${index}`}>
          <TouchableOpacity 
            style={[
              gameStyles.letterBox,
              letter.initialPosition !== undefined && gameStyles.initialLetterBox,
              // Green underline for detected words
              detectedWords.some(word => 
                index >= word.startIndex && index <= word.endIndex
              ) && gameStyles.detectedWordLetter
            ]}
            onPress={() => handleLetterTap(letter, index)}
            disabled={letter.initialPosition !== undefined}
          >
            <Text 
              style={[
                gameStyles.letterText,
                letter.initialPosition !== undefined ? gameStyles.staticLetterText : null
              ]}
            >
              {letter.value}
            </Text>
          </TouchableOpacity>

          {/* Only divider shown when dragging and valid */}
          {isDragging && isDividerValid(index + 1) && (
            <LetterDivider 
              index={index + 1}
              isActive={activeDividerIndex === index + 1}
              onLayout={handleDividerLayout}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

export default CurrentWord; 