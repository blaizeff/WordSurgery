import { StyleSheet } from "react-native";

export const gameStyles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  container: {
    alignItems: 'center',
    width: '100%',
    padding: 16
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
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
    margin: 2,
    flexShrink: 1,
    borderRadius: 8
  },
  initialLetterBox: {
    borderWidth: 0,
    backgroundColor: '#f8f8f8',
  },
  letterText: {
    fontSize: 18,
    textAlign: 'center'
  },
  staticLetterText: {
    color: 'black'
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
    borderRadius: 8
  },
  disabledLetterBox: {
    backgroundColor: 'transparent',
  },
  disabledLetterText: {
    color: '#f0f0f0',
  },
  completedLetterBox: {
    backgroundColor: '#C5E1A5', // Light green for completed letters
    borderColor: '#7CB342',
  },
  completedLetterText: {
    color: '#2E7D32', // Dark green for text in completed letters
    fontWeight: 'bold',
  },
  disabledDraggableLetterBox: {
    backgroundColor: '#e0e0e0',
  },
  disabledDraggableLetterText: {
    color: '#777',
  },
  availableLettersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'lightgrey',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 16
  },
  divider: {
    marginHorizontal: 3,
    borderRadius: 2,
  },
  detectedWordLetter: {
    borderBottomWidth: 3,
    borderBottomColor: '#4CAF50', // green
  },
  detectedWordsContainer: {
    marginTop: 16,
    width: '100%',
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  detectedWordsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  detectedWordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    padding: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  detectedWordText: {
    fontSize: 16,
  },
  removeButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  gameCompletedContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  gameCompletedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  backButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 8,
    zIndex: 10,
  },
  backButtonText: {
    color: '#007bff',
    fontWeight: '500',
  },
}); 