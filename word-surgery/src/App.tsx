import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Game from './components/Game';
import Menu from './components/Menu';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState } from 'react';
import { useLanguage } from './hooks/useLanguage';

export default function App() {
  const [showMenu, setShowMenu] = useState(true);
  const { currentLanguage, words, setLanguage, addCustomDictionary } = useLanguage();

  const handleStartGame = () => {
    setShowMenu(false);
  };

  const handleBackToMenu = () => {
    setShowMenu(true);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <StatusBar style="auto" />
          {showMenu ? (
            <Menu 
              onStart={handleStartGame} 
              onSelectLanguage={setLanguage}
              onAddCustomDictionary={addCustomDictionary}
              currentLanguage={currentLanguage}
            />
          ) : (
            <Game
              dictionary={words} 
              onBackToMenu={handleBackToMenu}
            />
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
