import React from "react";
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { DividerProps } from "./interfaces";
import { gameStyles } from "./styles";
import { DIVIDER_ACTIVE_WIDTH, DIVIDER_INACTIVE_WIDTH, DIVIDER_HEIGHT } from "../../utils/gameUtils";

const LetterDivider: React.FC<DividerProps> = ({ index, isActive, onLayout }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      width: withTiming(isActive ? DIVIDER_ACTIVE_WIDTH : DIVIDER_INACTIVE_WIDTH, {
        duration: 150,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      }),
      height: DIVIDER_HEIGHT,
      backgroundColor: withTiming(
        isActive ? 'rgba(0, 123, 255, 0.8)' : 'transparent', 
        { duration: 150 }
      ),
      marginHorizontal: 3,
      borderRadius: 2
    };
  });
  
  return (
    <Animated.View 
      style={[gameStyles.divider, animatedStyle]}
      collapsable={false}
      onLayout={(event) => {
        if (onLayout) {
          onLayout(index, event.nativeEvent.layout);
        }
      }}
    />
  );
};

export default LetterDivider;