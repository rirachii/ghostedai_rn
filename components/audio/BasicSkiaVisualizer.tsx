import React from 'react';
import { Canvas, Circle, vec, RadialGradient } from '@shopify/react-native-skia';
import { View, StyleSheet } from 'react-native';

interface BasicSkiaVisualizerProps {
  isRecording: boolean;
  amplitude: number;
  size?: number;
  color?: string;
}

const BasicSkiaVisualizer: React.FC<BasicSkiaVisualizerProps> = ({
  isRecording,
  amplitude,
  size = 200,
  color = '#3b82f6',
}) => {
  const center = { x: size / 2, y: size / 2 };
  const radius = size * 0.35;
  const scale = isRecording ? 1 + amplitude * 0.3 : 1;
  const outerRadius = radius * scale;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Canvas style={{ width: size, height: size }}>
        {/* Glow effect */}
        <Circle cx={center.x} cy={center.y} r={outerRadius * 1.5}>
          <RadialGradient
            c={vec(center.x, center.y)}
            r={outerRadius * 1.5}
            colors={[`${color}88`, `${color}00`]}
          />
        </Circle>
        
        {/* Main circle */}
        <Circle 
          cx={center.x} 
          cy={center.y} 
          r={outerRadius}
          color={isRecording ? `${color}44` : '#e5e7eb'}
        />
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

export default BasicSkiaVisualizer;
