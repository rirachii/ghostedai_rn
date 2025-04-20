import React, { useEffect } from 'react';
import { 
  Canvas, 
  Group, 
  RoundedRect, 
  Paint,
  useValue,
  useComputedValue,
} from '@shopify/react-native-skia';
import { View, StyleSheet } from 'react-native';

interface SkiaReactiveWaveformProps {
  isRecording: boolean;
  amplitude: number;
  size?: number;
  color?: string;
}

const SkiaReactiveWaveform: React.FC<SkiaReactiveWaveformProps> = ({
  isRecording,
  amplitude,
  size = 60,
  color = '#3b82f6',
}) => {
  const width = size * 2;
  const height = size;
  const barCount = 17;
  const barWidth = 2.5;
  const barGap = 1.5;

  // Create animated values for each bar
  const barValues = Array.from({ length: barCount }, () => useValue(0.3));

  // Update bar heights based on amplitude and recording state
  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (isRecording) {
        barValues.forEach((value, index) => {
          const centerIndex = Math.floor(barCount / 2);
          const distanceFromCenter = Math.abs(index - centerIndex);
          const normalizedDistance = distanceFromCenter / centerIndex;
          
          // Create a peak at the center that falls off towards the edges
          const centerWeight = 1 - normalizedDistance;
          
          // Add randomness for natural movement
          const randomFactor = 0.7 + Math.random() * 0.3;
          
          // Calculate target height
          const baseHeight = 0.2 + amplitude * 0.8;
          const targetHeight = baseHeight * centerWeight * randomFactor;
          
          // Smooth transition
          const current = value.current;
          const diff = targetHeight - current;
          value.current = current + diff * 0.1;
        });
      } else {
        // Reset to idle state
        barValues.forEach((value) => {
          const current = value.current;
          const diff = 0.3 - current;
          value.current = current + diff * 0.1;
        });
      }
    }, 16); // ~60fps

    return () => clearInterval(updateInterval);
  }, [isRecording, amplitude]);

  const totalBarsWidth = barCount * barWidth + (barCount - 1) * barGap;
  const startX = (width - totalBarsWidth) / 2;

  return (
    <View style={[styles.container, { width, height }]}>
      <Canvas style={{ width, height }}>
        <Group>
          {barValues.map((value, index) => {
            const x = startX + index * (barWidth + barGap);
            
            const barHeight = useComputedValue(() => {
              return value.current * height * 0.8;
            }, [value]);

            const y = useComputedValue(() => {
              return (height - barHeight.current) / 2;
            }, [barHeight]);

            const opacity = useComputedValue(() => {
              return 0.4 + value.current * 0.6;
            }, [value]);

            return (
              <RoundedRect
                key={index}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                r={barWidth / 2}
              >
                <Paint color={color} opacity={opacity} />
              </RoundedRect>
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

export default SkiaReactiveWaveform;
