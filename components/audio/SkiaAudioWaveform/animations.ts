import { useDerivedValue, withSpring, interpolate, Easing } from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';

export const useWaveformAnimations = (
  isRecording: SharedValue<boolean>,
  amplitude: SharedValue<number>,
  frequency: SharedValue<number[]>,
  barCount: number
) => {
  // Bar heights animation
  const barHeights = useDerivedValue(() => {
    return frequency.value.slice(0, barCount).map((freq, index) => {
      const centerOffset = Math.abs(index - Math.floor(barCount / 2)) / Math.floor(barCount / 2);
      const maxHeight = 1 - centerOffset * 0.3;
      
      if (isRecording.value) {
        const height = freq * amplitude.value * maxHeight;
        return withSpring(height, {
          damping: 12,
          stiffness: 100,
        });
      }
      return withSpring(0.3, {
        damping: 12,
        stiffness: 100,
      });
    });
  });

  // Bar widths animation (wider in the middle)
  const barWidths = useDerivedValue(() => {
    return Array(barCount).fill(0).map((_, index) => {
      const centerOffset = Math.abs(index - Math.floor(barCount / 2)) / Math.floor(barCount / 2);
      return interpolate(centerOffset, [0, 1], [4, 2.5]);
    });
  });

  // Bar opacities animation
  const barOpacities = useDerivedValue(() => {
    return frequency.value.slice(0, barCount).map((freq, index) => {
      if (isRecording.value) {
        return interpolate(freq * amplitude.value, [0, 1], [0.4, 1]);
      }
      return 0.6;
    });
  });

  return {
    barHeights,
    barWidths,
    barOpacities,
  };
};
