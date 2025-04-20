import React from 'react';
import { Path, vec, Paint, LinearGradient } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';

interface WaveformPathProps {
  frequency: SharedValue<number[]>;
  amplitude: SharedValue<number>;
  width: number;
  height: number;
  color: string;
}

export const WaveformPath: React.FC<WaveformPathProps> = ({
  frequency,
  amplitude,
  width,
  height,
  color,
}) => {
  // Create smooth waveform path from frequency data
  const createWaveformPath = () => {
    const points = frequency.value.map((freq, index) => {
      const x = (index / frequency.value.length) * width;
      const y = height / 2 + (freq * amplitude.value * height * 0.3);
      return { x, y };
    });

    // Create smooth path with bezier curves
    let path = `M 0 ${height / 2}`;
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];
      const controlPointX = (current.x + next.x) / 2;
      
      path += ` Q ${current.x} ${current.y} ${controlPointX} ${(current.y + next.y) / 2}`;
    }
    
    // Close the path
    path += ` L ${width} ${height / 2}`;
    
    return path;
  };

  return (
    <Path path={createWaveformPath()} style="stroke" strokeWidth={2}>
      <Paint>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, 0)}
          colors={[`${color}00`, color, `${color}00`]}
          positions={[0, 0.5, 1]}
        />
      </Paint>
    </Path>
  );
};
