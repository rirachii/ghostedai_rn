import React from 'react';
import { RoundedRect, vec, Group, Paint } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';

interface FrequencyBarsProps {
  barHeights: SharedValue<number[]>;
  barWidths: SharedValue<number[]>;
  barOpacities: SharedValue<number[]>;
  barCount: number;
  containerWidth: number;
  containerHeight: number;
  color: string;
}

export const FrequencyBars: React.FC<FrequencyBarsProps> = ({
  barHeights,
  barWidths,
  barOpacities,
  barCount,
  containerWidth,
  containerHeight,
  color,
}) => {
  const totalBarsWidth = barCount * 4 + (barCount - 1) * 3; // bars + gaps
  const startX = (containerWidth - totalBarsWidth) / 2;

  return (
    <Group>
      {Array(barCount).fill(0).map((_, index) => {
        const x = startX + index * (4 + 3); // bar width + gap
        const barHeight = barHeights.value[index] * containerHeight * 0.8;
        const y = (containerHeight - barHeight) / 2;
        const width = barWidths.value[index];
        const opacity = barOpacities.value[index];

        return (
          <RoundedRect
            key={index}
            x={x}
            y={y}
            width={width}
            height={barHeight}
            r={width / 2}
          >
            <Paint color={color} opacity={opacity} />
          </RoundedRect>
        );
      })}
    </Group>
  );
};
