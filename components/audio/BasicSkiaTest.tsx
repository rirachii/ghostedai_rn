import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Circle, Paint } from '@shopify/react-native-skia';

const BasicSkiaTest: React.FC = () => {
  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Circle cx={100} cy={100} r={50}>
          <Paint color="#3b82f6" />
        </Circle>
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0',
  },
  canvas: {
    flex: 1,
  },
});

export default BasicSkiaTest;
