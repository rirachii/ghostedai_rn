import React from 'react';
import { Canvas, Circle, Paint } from '@shopify/react-native-skia';
import { View } from 'react-native';

const SkiaTest: React.FC = () => {
  return (
    <View style={{ width: 200, height: 200 }}>
      <Canvas style={{ flex: 1 }}>
        <Circle cx={100} cy={100} r={50} color="#3b82f6" />
      </Canvas>
    </View>
  );
};

export default SkiaTest;
