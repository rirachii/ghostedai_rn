import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';

export type RecordingQuality = 'low' | 'medium' | 'high';

interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  recordingTime: number;
  audioUri: string | null;
  error: string | null;
}

interface QualitySettings {
  android: Audio.RecordingOptions['android'];
  ios: Audio.RecordingOptions['ios'];
  web: Audio.RecordingOptions['web'];
}

export const useVoiceRecorder = (initialQuality: RecordingQuality = 'medium') => {
  const [recorderState, setRecorderState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    recordingTime: 0,
    audioUri: null,
    error: null,
  });
  
  const [recordingQuality, setRecordingQuality] = useState<RecordingQuality>(initialQuality);
  
  // References to track internal state
  const recorderRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Quality presets
  const qualitySettings: Record<RecordingQuality, QualitySettings> = {
    low: {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 22050,
        numberOfChannels: 1,
        bitRate: 32000, // 32 kbps
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.LOW,
        sampleRate: 22050,
        numberOfChannels: 1,
        bitRate: 32000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 32000,
      },
    },
    medium: {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 96000, // 96 kbps
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.MEDIUM,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 96000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 96000,
      },
    },
    high: {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 48000,
        numberOfChannels: 2, // Stereo
        bitRate: 192000, // 192 kbps
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 48000,
        numberOfChannels: 2, // Stereo
        bitRate: 192000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 192000,
      },
    },
  };

  // Calculate approximate file sizes for estimation (bytes per second)
  const approximateFileSizePerSecond = {
    low: 32000 / 8, // 32 kbps -> bytes per second
    medium: 96000 / 8, // 96 kbps -> bytes per second
    high: 192000 / 8, // 192 kbps -> bytes per second
  };

  // Cleanup function for timers and audio objects
  const cleanup = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      stopRecording();
      stopPlayback();
    };
  }, []);

  // Set up recorder
  const setupRecorder = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error setting up recorder:', error);
      setRecorderState(prev => ({
        ...prev,
        error: 'Failed to set up recording. Please check microphone permissions.'
      }));
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      await setupRecorder();
      
      // Reset state before starting
      setRecorderState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        recordingTime: 0,
        error: null,
      }));
      
      // Create recording with selected quality settings
      const { recording } = await Audio.Recording.createAsync(qualitySettings[recordingQuality]);
      
      recorderRef.current = recording;
      
      // Start timer for recording duration
      timerRef.current = setInterval(() => {
        setRecorderState(prev => ({
          ...prev,
          recordingTime: prev.recordingTime + 1
        }));
      }, 1000);
      
      setRecorderState(prev => ({ ...prev, isRecording: true }));
    } catch (error) {
      console.error('Error starting recording:', error);
      setRecorderState(prev => ({
        ...prev,
        error: 'Failed to start recording. Please try again.'
      }));
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      if (!recorderRef.current) return;

      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop recording
      await recorderRef.current.stopAndUnloadAsync();
      
      // Get URI of the recording
      const uri = recorderRef.current.getURI();
      
      // Reset recorder
      recorderRef.current = null;
      
      setRecorderState(prev => ({
        ...prev,
        isRecording: false,
        audioUri: uri,
      }));

      // Return URI for the saved recording
      return uri;
    } catch (error) {
      console.error('Error stopping recording:', error);
      setRecorderState(prev => ({
        ...prev,
        isRecording: false,
        error: 'Failed to stop recording. Please try again.'
      }));
      return null;
    }
  };

  // Play recording
  const playRecording = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      if (!recorderState.audioUri) {
        throw new Error('No recording to play');
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: recorderState.audioUri },
        { shouldPlay: true }
      );
      
      soundRef.current = sound;
      
      setRecorderState(prev => ({ ...prev, isPlaying: true }));
      
      // Update state when playback finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setRecorderState(prev => ({ ...prev, isPlaying: false }));
        }
      });
    } catch (error) {
      console.error('Error playing recording:', error);
      setRecorderState(prev => ({
        ...prev,
        error: 'Failed to play recording. Please try again.'
      }));
    }
  };

  // Stop playback
  const stopPlayback = async () => {
    try {
      if (!soundRef.current) return;
      
      await soundRef.current.stopAsync();
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      
      setRecorderState(prev => ({ ...prev, isPlaying: false }));
    } catch (error) {
      console.error('Error stopping playback:', error);
    }
  };

  // Reset recording (discard current recording)
  const resetRecording = () => {
    stopPlayback();
    
    setRecorderState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      recordingTime: 0,
      audioUri: null,
      error: null,
    });
  };

  // Change recording quality
  const changeQuality = (quality: RecordingQuality) => {
    if (recorderState.isRecording) {
      Alert.alert('Cannot change quality', 'Stop recording first before changing quality');
      return;
    }
    
    setRecordingQuality(quality);
  };

  // Get estimated file size (in MB) for a given duration (in seconds)
  const getEstimatedFileSize = (durationInSeconds: number): string => {
    const bytesPerSecond = approximateFileSizePerSecond[recordingQuality];
    const totalBytes = bytesPerSecond * durationInSeconds;
    const megabytes = totalBytes / (1024 * 1024);
    return megabytes.toFixed(2);
  };

  // Get current quality settings description
  const getQualityDescription = (): string => {
    const settings = qualitySettings[recordingQuality];
    
    if (Platform.OS === 'ios') {
      return `${settings.ios.sampleRate / 1000}kHz, ${settings.ios.numberOfChannels} channel(s), ${settings.ios.bitRate / 1000}kbps`;
    } else if (Platform.OS === 'android') {
      return `${settings.android.sampleRate / 1000}kHz, ${settings.android.numberOfChannels} channel(s), ${settings.android.bitRate / 1000}kbps`;
    } else {
      return `WebM format, ${settings.web.bitsPerSecond / 1000}kbps`;
    }
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return {
    ...recorderState,
    recordingQuality,
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    resetRecording,
    changeQuality,
    getEstimatedFileSize,
    getQualityDescription,
    formatTime,
  };
};
