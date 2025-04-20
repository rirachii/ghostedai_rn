import React, { useEffect } from 'react';
import { 
  Canvas, 
  Circle, 
  Group, 
  RadialGradient, 
  vec,
  useValue,
  useTiming,
  useComputedValue,
  runTiming,
} from '@shopify/react-native-skia';
import { View, StyleSheet } from 'react-native';

interface SkiaBreathingSphereProps {
  isRecording: boolean;
  amplitude: number;
  size?: number;
  color?: string;
}

const SkiaBreathingSphere: React.FC<SkiaBreathingSphereProps> = ({
  isRecording,
  amplitude,
  size = 200,
  color = '#3b82f6',
}) => {
  const center = { x: size / 2, y: size / 2 };
  const radius = size * 0.35;

  // Breathing animation values
  const scale = useValue(1);
  const glowOpacity = useValue(0.2);

  // Setup breathing animation
  useEffect(() => {
    const breathInterval = setInterval(() => {
      // For scale
      if (scale.current >= 1.2) {
        scale.current = 1.0;
      } else {
        scale.current += 0.002;
      }

      // For glow
      if (glowOpacity.current >= 0.4) {
        glowOpacity.current = 0.2;
      } else {
        glowOpacity.current += 0.001;
      }
    }, 16); // ~60fps

    return () => clearInterval(breathInterval);
  }, []);

  // Compute dynamic scale with amplitude
  const dynamicScale = useComputedValue(() => {
    return isRecording 
      ? scale.current + amplitude * 0.3 
      : scale.current;
  }, [scale, amplitude, isRecording]);

  // Compute dynamic opacity
  const dynamicGlowOpacity = useComputedValue(() => {
    return isRecording 
      ? glowOpacity.current + amplitude * 0.3 
      : glowOpacity.current;
  }, [glowOpacity, amplitude, isRecording]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale: dynamicScale }]} origin={center}>
          {/* Outer glow effect */}
          <Circle 
            cx={center.x} 
            cy={center.y} 
            r={radius * 1.5}
            opacity={dynamicGlowOpacity}
          >
            <RadialGradient
              c={vec(center.x, center.y)}
              r={radius * 1.5}
              colors={[`${color}88`, `${color}44`, `${color}00`]}
              positions={[0, 0.5, 1]}
            />
          </Circle>

          {/* Inner sphere */}
          <Circle 
            cx={center.x} 
            cy={center.y} 
            r={radius}
            color={isRecording ? `${color}44` : '#e5e7eb'}
          />
        </Group>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default SkiaBreathingSphere;
