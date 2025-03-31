import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { DetectedWordsListProps } from "./interfaces";
import { gameStyles } from "./styles";

const DetectedWordsList: React.FC<DetectedWordsListProps> = ({ 
  detectedWords, 
  handleRemoveWord 
}) => {
  if (detectedWords.length === 0) {
    return null;
  }

  return (
    <View style={gameStyles.detectedWordsContainer}>
      <Text style={gameStyles.detectedWordsTitle}>Detected Words:</Text>
      {detectedWords.map((word, index) => (
        <View key={`word-${index}`} style={gameStyles.detectedWordItem}>
          <Text style={gameStyles.detectedWordText}>{word.word}</Text>
          <TouchableOpacity
            style={gameStyles.removeButton}
            onPress={() => {
              setTimeout(() => handleRemoveWord(word), 50);
            }}
          >
            <Text style={gameStyles.removeButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

export default DetectedWordsList; 