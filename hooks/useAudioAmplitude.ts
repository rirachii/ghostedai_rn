import { useEffect, useState, useRef } from 'react';
import { Audio } from 'expo-av';

export const useAudioAmplitude = (isRecording: boolean, recordingRef: React.MutableRefObject<Audio.Recording | null>) => {
  const [amplitude, setAmplitude] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording && recordingRef.current) {
      // Poll for recording status and get audio level
      intervalRef.current = setInterval(async () => {
        try {
          if (recordingRef.current) {
            const status = await recordingRef.current.getStatusAsync();
            // Check if metering is available
            if (status.isRecording && typeof status.metering === 'number') {
              // Convert dB to a 0-1 range
              // Assuming metering range from -60dB to 0dB for better sensitivity
              const normalizedAmplitude = (status.metering + 60) / 60;
              // Apply power curve for better visual response
              const powerAmplitude = Math.pow(normalizedAmplitude, 0.5);
              // Clamp to 0-1 range
              setAmplitude(Math.max(0, Math.min(1, powerAmplitude)));
            } else {
              // Fallback to random values to show some activity
              setAmplitude(Math.random() * 0.3 + 0.2);
            }
          }
        } catch (error) {
          console.warn('Error getting audio metering:', error);
          // Fallback to random values
          setAmplitude(Math.random() * 0.3 + 0.2);
        }
      }, 100); // Update every 100ms
      
    } else {
      // Not recording, clear interval and reset amplitude
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setAmplitude(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRecording, recordingRef]);

  return amplitude;
};
