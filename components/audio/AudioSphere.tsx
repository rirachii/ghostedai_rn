import React from 'react';
import { View, StyleSheet } from 'react-native';
import AudioWaveform from './AudioWaveform';

interface AudioSphereProps {
  isRecording: boolean;
  size?: number;
  color?: string;
}

const AudioSphere: React.FC<AudioSphereProps> = ({
  isRecording,
  size = 200,
  color = '#3b82f6',
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[
        styles.sphere,
        { 
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isRecording ? `${color}20` : '#e5e7eb' 
        }
      ]}>
        <View style={styles.waveformContainer}>
          <AudioWaveform 
            isActive={isRecording} 
            color={color}
            height={size * 0.4}
            barCount={9}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  sphere: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  waveformContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AudioSphere;
