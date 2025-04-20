import { useEffect } from 'react';
import { useDerivedValue, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { SharedValue } from 'react-native-reanimated';

export const useSphereAnimations = (
  isRecording: SharedValue<boolean>,
  amplitude: SharedValue<number>
) => {
  const sphereScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);
  const pulseScale = useSharedValue(1);
  
  // Update animations based on recording state
  useEffect(() => {
    if (isRecording.value) {
      sphereScale.value = withSpring(1 + amplitude.value * 0.2, {
        damping: 12,
        stiffness: 100,
      });
      glowOpacity.value = withSpring(0.2 + amplitude.value * 0.3, {
        damping: 12,
        stiffness: 100,
      });
    } else {
      sphereScale.value = withSpring(1, {
        damping: 12,
        stiffness: 100,
      });
      glowOpacity.value = withSpring(0.2, {
        damping: 12,
        stiffness: 100,
      });
    }
  }, [isRecording.value, amplitude.value]);

  return {
    sphereScale,
    glowOpacity,
    pulseScale,
  };
};
