import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context'
import Game from './components/game/Game';
import Menu from './components/Menu';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from './hooks/useLanguage';
import Splash from './components/Splash';

export default function App() {
  const [showMenu, setShowMenu] = useState(true);
  const { currentLanguage, words, wordsArray, isLoading, setLanguage, addCustomDictionary } = useLanguage();
  const [appReady, setAppReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleStartGame = () => {
    setShowMenu(false);
  };

  const handleBackToMenu = () => {
    setShowMenu(true);
  };

  // Handle splash screen fade out when app is ready
  useEffect(() => {
    if (appReady) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setSplashVisible(false);
        }
      });
    }
  }, [appReady, fadeAnim]);

  // Prepare the main app content
  const mainContent = (
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
              isLoading={isLoading}
            />
          ) : (
            <Game
              dictionary={words} 
              dictArray={wordsArray}
              onBackToMenu={handleBackToMenu}
            />
          )}
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  return (
    <View style={styles.rootContainer}>
      {mainContent}
      {splashVisible && (
        <Animated.View 
          style={[
            styles.splashContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Splash setAppReady={setAppReady} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  splashContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
});
