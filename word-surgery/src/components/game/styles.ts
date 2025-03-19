import { StyleSheet, Dimensions } from "react-native";

const { width, height } = Dimensions.get('window');

export const gameStyles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 0,
    
    textAlign: 'center'
  },
  container: {
    alignItems: 'center',
    width: '100%',
    flex: 1,
    padding: 16,
    marginTop: 20
  },
  wordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: 16,
    marginTop: 64
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
    borderRadius: 8,
  },
  disabledLetterBox: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  disabledLetterText: {
    color: 'rgb(150, 150, 150)',
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
    backgroundColor: 'rgb(230, 230, 230)',
    borderWidth: 0,
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
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 32,
    position: 'absolute',
    bottom: 0,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 100,
  },
  gameCompletedInnerContainer: {
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    width: '80%',
  },
  gameCompletedText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 16,
  },
  confettiAnimation: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  playAgainButton: {
    marginTop: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  playAgainButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 8,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    color: 'black',
    fontWeight: '500',
  },
  victoryOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  victoryDialog: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 1001,
  },
  victoryText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
  },
  victoryButton: {
    backgroundColor: '#3A63ED',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 2,
  },
  victoryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginLeft: 4,
  },
}); 