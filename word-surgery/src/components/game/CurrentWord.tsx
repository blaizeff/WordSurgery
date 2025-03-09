import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { throttle } from 'lodash';
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
          onLayout={throttle(handleDividerLayout, 1000, { leading: true, trailing: true })}
        />
      )}
      
      {currentWord.getLetters().map((letter, index) => (
        <React.Fragment key={`letter-${index}`}>
          {/* Added TouchableOpacity for tap handling */}
          <TouchableOpacity 
            style={[
              gameStyles.letterBox,
              letter.initialPosition !== undefined && gameStyles.initialLetterBox,
              // Add green underline for letters that are part of detected words
              detectedWords.some(word => 
                index >= word.startIndex && index <= word.endIndex
              ) && gameStyles.detectedWordLetter
            ]}
            onPress={() => handleLetterTap(letter, index)}
            // Disable for initial letters
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

          {/* Divider after each letter - only shown when dragging and valid */}
          {isDragging && isDividerValid(index + 1) && (
            <LetterDivider 
              index={index + 1}
              isActive={activeDividerIndex === index + 1}
              onLayout={throttle(handleDividerLayout, 1000, { leading: true, trailing: true })}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

export default CurrentWord; 