import { useRef, useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, StatusBar, View, StyleSheet, Text } from "react-native";
import { useLanguage } from "../hooks/useLanguage";
import { useTranslation } from "../hooks/useTranslation";


export default function Splash({ setAppReady }: { setAppReady: (ready: boolean) => void }) {
  const { isLoading, words, currentLanguage } = useLanguage();
  const { t } = useTranslation(currentLanguage);
  // Animation values for initial loading screen
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const [initialAnimationComplete, setInitialAnimationComplete] = useState(false);
  
  // Setup initial loading animation
  useEffect(() => {
    // Start fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Start scale animation
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setInitialAnimationComplete(true);
    });
    
    // Start spinning animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, [fadeAnim, scaleAnim, spinAnim]);
  
  // Set app as ready when both dictionary is loaded and initial animation is complete
  useEffect(() => {
    if (!isLoading && words.size > 0 && initialAnimationComplete) {
      setAppReady(true);
    }
  }, [isLoading, words, initialAnimationComplete, setAppReady]);
  
  // Create spinning rotation interpolation
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.initialLoadingContainer}>
        <StatusBar />
        <Animated.View 
        style={[
            styles.loadingContent,
            {
            opacity: fadeAnim,
            transform: [
                { scale: scaleAnim },
            ],
            }
        ]}
        >
        <Text style={styles.appTitle}>Word Surgery</Text>
        <View style={styles.loadingIconContainer}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
            {isLoading ? <ActivityIndicator size="large" color="#3A63ED" /> : ""}
            </Animated.View>
        </View>
        <Text style={styles.loadingText}>
            {isLoading ? t("splash.loading") : ""}
        </Text>
        </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  initialLoadingContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  appTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  loadingIconContainer: {
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
