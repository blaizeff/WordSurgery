import React from "react";
import { Text } from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS
} from 'react-native-reanimated';
import { gameStyles } from "./styles";
import { DraggableLetterProps } from "./interfaces";
import { DEBUG } from "../../utils/gameUtils";

const DraggableLetter: React.FC<DraggableLetterProps> = ({ 
  letter, 
  index,
  onDragStart, 
  onDragMove, 
  onDragEnd,
  isDisabled = false
}) => {
  // Animation values
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const zIndex = useSharedValue(1);
  
  // Pan gesture handler
  const panGesture = Gesture.Pan()
    .enabled(!isDisabled)
    .onBegin(() => {
      if (DEBUG) console.log(`Starting drag for letter ${letter.value} at index ${index}`);
      scale.value = withSpring(1.1);
      opacity.value = withSpring(0.8);
      zIndex.value = 100;
      runOnJS(onDragStart)(index);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      
      // Pass absolute position for divider detection
      runOnJS(onDragMove)(
        event.absoluteX,
        event.absoluteY
      );
    })
    .onFinalize(() => {
      if (DEBUG) console.log(`Ending drag for letter ${letter.value}`);
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      zIndex.value = 1;
      
      runOnJS(onDragEnd)();
    });
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      opacity: opacity.value,
      zIndex: zIndex.value
    };
  });
  
  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View 
        style={[
          gameStyles.availableLetterBox,
          isDisabled && gameStyles.disabledDraggableLetterBox,
          animatedStyle
        ]}
      >
        <Text style={[gameStyles.letterText, isDisabled && gameStyles.disabledDraggableLetterText]}>
          {letter.value}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
};

export default DraggableLetter; 