import React, { useEffect } from 'react';
import { Canvas, Circle, Paint, Group, RadialGradient, vec } from '@shopify/react-native-skia';
import { View, StyleSheet } from 'react-native';
import { useSharedValue, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { AudioVisualizerProps } from '../shared/types';

const SkiaAudioSphere: React.FC<AudioVisualizerProps> = ({
  isRecording,
  amplitude = 0,
  size = 200,
  color = '#3b82f6',
}) => {
  const center = { x: size / 2, y: size / 2 };
  const radius = size * 0.35;
  
  // Breathing animation values
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.2);
  const glowScale = useSharedValue(1);

  // Setup breathing animation
  useEffect(() => {
    // Continuous breathing animation
    scale.value = withRepeat(
      withTiming(1.1, { 
        duration: 2000, 
        easing: Easing.bezier(0.4, 0, 0.2, 1)
      }),
      -1,
      true
    );

    glowScale.value = withRepeat(
      withTiming(1.2, { 
        duration: 2000, 
        easing: Easing.bezier(0.4, 0, 0.2, 1)
      }),
      -1,
      true
    );

    glowOpacity.value = withRepeat(
      withTiming(0.4, { 
        duration: 2000, 
        easing: Easing.bezier(0.4, 0, 0.2, 1)
      }),
      -1,
      true
    );
  }, []);

  // React to recording state and amplitude
  useEffect(() => {
    if (isRecording) {
      // Enhance breathing with amplitude
      const targetScale = 1.1 + amplitude * 0.3;
      scale.value = withSpring(targetScale, {
        damping: 12,
        stiffness: 100,
      });
      
      glowOpacity.value = withSpring(0.4 + amplitude * 0.4, {
        damping: 12,
        stiffness: 100,
      });
    }
  }, [isRecording, amplitude]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        <Group>
          {/* Outer glow effect */}
          <Circle
            cx={center.x}
            cy={center.y}
            r={radius * 1.5}
            transform={[
              { translateX: center.x },
              { translateY: center.y },
              { scale: glowScale },
              { translateX: -center.x },
              { translateY: -center.y },
            ]}
          >
            <Paint opacity={glowOpacity.value}>
              <RadialGradient
                c={vec(center.x, center.y)}
                r={radius * 1.5}
                colors={[`${color}88`, `${color}44`, `${color}00`]}
                positions={[0, 0.5, 1]}
              />
            </Paint>
          </Circle>

          {/* Main sphere */}
          <Circle 
            cx={center.x} 
            cy={center.y} 
            r={radius}
            transform={[
              { translateX: center.x },
              { translateY: center.y },
              { scale: scale },
              { translateX: -center.x },
              { translateY: -center.y },
            ]}
          >
            <Paint color={isRecording ? `${color}33` : '#e5e7eb'} />
          </Circle>
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

export default SkiaAudioSphere;
