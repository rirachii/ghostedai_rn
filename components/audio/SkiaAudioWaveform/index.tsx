import React, { useEffect } from 'react';
import { Canvas, Group, Rect } from '@shopify/react-native-skia';
import { View, StyleSheet } from 'react-native';
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { AudioVisualizerProps } from '../shared/types';

const SkiaAudioWaveform: React.FC<AudioVisualizerProps> = ({
  isRecording,
  amplitude = 0,
  size = 60,
  color = '#3b82f6',
}) => {
  const width = size * 2;
  const height = size;
  const barCount = 15;
  const barWidth = 3;
  const barGap = 2;

  // Create shared values for each bar height
  const barHeights = Array.from({ length: barCount }, () => useSharedValue(0.3));

  // Update bar heights based on amplitude and recording state
  useEffect(() => {
    if (isRecording) {
      // Simulate audio frequency data with varying amplitudes
      barHeights.forEach((barHeight, index) => {
        const centerOffset = Math.abs(index - Math.floor(barCount / 2)) / Math.floor(barCount / 2);
        const randomAmplitude = 0.7 + Math.random() * 0.3;
        const targetHeight = 0.1 + (amplitude * randomAmplitude * (1 - centerOffset * 0.3));
        
        barHeight.value = withSpring(targetHeight, {
          damping: 10,
          stiffness: 100,
          mass: 0.5,
        });
      });
    } else {
      // Reset to idle state
      barHeights.forEach((barHeight) => {
        barHeight.value = withSpring(0.3, {
          damping: 12,
          stiffness: 80,
        });
      });
    }
  }, [isRecording, amplitude]);

  const totalBarsWidth = barCount * barWidth + (barCount - 1) * barGap;
  const startX = (width - totalBarsWidth) / 2;

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Group>
          {Array.from({ length: barCount }).map((_, index) => {
            const x = startX + index * (barWidth + barGap);
            const barHeight = barHeights[index];
            
            return (
              <Rect
                key={index}
                x={x}
                y={height / 2}
                width={barWidth}
                height={barHeight}
                color={color}
                origin={{ x: x + barWidth / 2, y: height / 2 }}
                transform={[{ scaleY: barHeight }]}
              />
            );
          })}
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

export default SkiaAudioWaveform;
