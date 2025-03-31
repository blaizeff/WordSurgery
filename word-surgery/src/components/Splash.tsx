import { useRef, useEffect, useState } from "react";
import { ActivityIndicator, Animated, Easing, StatusBar, View, StyleSheet, Text } from "react-native";
import { useLanguage } from "../hooks/useLanguage";
import { useTranslation } from "../hooks/useTranslation";

export default function Splash({ setAppReady }: { setAppReady: (ready: boolean) => void }) {
  const { isLoading, words, currentLanguage } = useLanguage();
  const { t } = useTranslation(currentLanguage);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [initialAnimationComplete, setInitialAnimationComplete] = useState(false);
  
  // Setup initial loading animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start(() => {
      setInitialAnimationComplete(true);
    });
  }, [fadeAnim, scaleAnim]);
  
  // Set app as ready when dictionary is loaded
  useEffect(() => {
    if (!isLoading && words.size > 0 && initialAnimationComplete) {
      setAppReady(true);
    }
  }, [isLoading, words, initialAnimationComplete, setAppReady]);

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
          <ActivityIndicator size="large" color="#3A63ED" animating={isLoading} hidesWhenStopped={false} />
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
