import { useEffect } from 'react';
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { Audio } from 'expo-av';
import { AudioState } from '../types';

export const useAudioState = (isRecording: boolean, initialAmplitude: number = 0): AudioState => {
  const amplitude = useSharedValue(initialAmplitude);
  const frequency = useSharedValue<number[]>(new Array(32).fill(0));
  const isRecordingShared = useSharedValue(isRecording);

  useEffect(() => {
    isRecordingShared.value = isRecording;
    
    // Simulate audio analysis for now
    if (isRecording) {
      const interval = setInterval(() => {
        // Simulate random amplitude
        amplitude.value = withSpring(Math.random() * 0.8 + 0.2);
        
        // Simulate frequency data
        frequency.value = withTiming(
          Array(32)
            .fill(0)
            .map(() => Math.random()),
          { duration: 100 }
        );
      }, 100);

      return () => clearInterval(interval);
    } else {
      amplitude.value = withSpring(0);
      frequency.value = withTiming(new Array(32).fill(0));
    }
  }, [isRecording]);

  return { amplitude, frequency, isRecording: isRecordingShared };
};
