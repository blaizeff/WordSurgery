import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Word } from "src/classes/Word";

export default function Game() {
    const startingWord = 'voiture';
    const startingAvailableWord = 'tortue';
    const [currentWord, setCurrentWord] = useState(startingWord);
    const [availableWord, setAvailableWord] = useState(new Word(startingAvailableWord));

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Word Surgery</Text>
            <View style={styles.wordContainer}>
                {currentWord.split('').map((letter, index) => (
                    <View style={styles.letterBox} key={index}>
                        <Text style={{ fontSize: 18 }}>{letter}</Text>
                    </View>
                ))}
            </View>
            <View style={styles.availableLettersContainer}>
                {availableWord.getLetters().map((letter, index) => (
                    <View style={styles.availableLetterBox} key={index}>
                        <Text style={{ fontSize: 18 }}>{letter.letter}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    container: {
        alignItems: 'center',
        width: '100%',
    },
    wordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: 16
    },
    letterBox: {
        borderWidth: 1,
        borderColor: 'lightgrey',
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: 60,
        margin: 2,
        flexShrink: 1,
        borderRadius: 8,
    },
    availableLetterBox: {
        borderWidth: 1,
        borderColor: 'lightgrey',
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        width: 60,
        height: 60,
        margin: 2,
        flexShrink: 1,
        borderRadius: 8,
    },
    disabledLetterBox: {
        backgroundColor: 'lightgrey',
    },
    availableLettersContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'lightgrey',
        backgroundColor: '#f0f0f0',
        borderRadius: 8,
    }
});