import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { DetectedWordsListProps } from "./interfaces";
import { gameStyles } from "./styles";
import { Ionicons } from "@expo/vector-icons";
const DetectedWordsList: React.FC<DetectedWordsListProps> = ({ 
  t,
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
            <Ionicons name="cut" size={28} color="white" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

export default DetectedWordsList; 