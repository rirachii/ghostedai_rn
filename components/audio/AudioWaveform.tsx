import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';

interface AudioWaveformProps {
  isActive: boolean;
  color?: string;
  barCount?: number;
  height?: number;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  color = '#3b82f6', // Default to blue
  barCount = 7,
  height = 60,
}) => {
  // Create animated values for each bar
  const animatedValues = useRef<Animated.Value[]>(
    Array.from({ length: barCount }, () => new Animated.Value(0.3))
  ).current;

  // Start animation when active
  useEffect(() => {
    let animations: Animated.CompositeAnimation[] = [];

    if (isActive) {
      // Create animations for each bar
      animations = animatedValues.map((value, index) => {
        // Generate random values for animation
        const toValue = 0.3 + Math.random() * 0.7; // Random value between 0.3 and 1.0
        const duration = 400 + Math.random() * 600; // Random duration between 400ms and 1000ms
        const delay = index * 50; // Stagger the animations

        // Create sequence to animate up and down
        return Animated.sequence([
          Animated.timing(value, {
            toValue,
            duration,
            delay,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ]);
      });

      // Start all animations in a loop
      const loopAnimations = () => {
        Animated.parallel(animations).start(() => {
          if (isActive) {
            loopAnimations();
          }
        });
      };

      loopAnimations();
    } else {
      // Reset all animations to idle state
      animations = animatedValues.map((value) =>
        Animated.timing(value, {
          toValue: 0.3,
          duration: 300,
          useNativeDriver: false,
        })
      );

      Animated.parallel(animations).start();
    }

    return () => {
      // Stop animations on cleanup
      animations.forEach((anim) => anim.stop());
    };
  }, [isActive, animatedValues]);

  return (
    <View style={[styles.container, { height }]}>
      {animatedValues.map((value, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              height: value.interpolate({
                inputRange: [0, 1],
                outputRange: ['10%', '100%'],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    width: 4,
    borderRadius: 2,
    marginHorizontal: 3,
  },
});

export default AudioWaveform;
