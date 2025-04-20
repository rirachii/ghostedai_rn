import React from 'react';
import { Circle, Paint, RadialGradient, vec } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';

interface GlowEffectProps {
  center: { x: number; y: number };
  radius: number;
  color: string;
  opacity: SharedValue<number>;
  scale: SharedValue<number>;
}

export const GlowEffect: React.FC<GlowEffectProps> = ({
  center,
  radius,
  color,
  opacity,
  scale,
}) => {
  return (
    <Circle
      cx={center.x}
      cy={center.y}
      r={radius * 1.5}
      transform={[{ scale: scale.value }]}
      opacity={opacity.value}
    >
      <Paint>
        <RadialGradient
          c={vec(center.x, center.y)}
          r={radius * 1.5}
          colors={[`${color}88`, `${color}44`, `${color}00`]}
          positions={[0, 0.5, 1]}
        />
      </Paint>
    </Circle>
  );
};
