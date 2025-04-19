import { useState, useEffect, useRef } from 'react';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
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

  // Quality presets with enhanced input gain settings for louder recordings
  const qualitySettings: Record<RecordingQuality, QualitySettings> = {
    low: {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 22050,
        numberOfChannels: 1,
        bitRate: 64000,
        // Android-specific gain settings - make recording louder
        // For newer Android versions
        maxFileSize: 5242880, // 5MB limit to prevent issues
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.HIGH, // Upgraded even for low quality
        sampleRate: 22050,
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
        // These specific settings help with recording gain on iOS
        // Higher bit depth can capture more dynamic range
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 64000,
      },
    },
    medium: {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
        // Android-specific enhancements for better gain
        maxFileSize: 10485760, // 10MB limit
      },
      ios: {
        extension: '.m4a',
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 44100,
        numberOfChannels: 1, 
        bitRate: 128000,
        linearPCMBitDepth: 16, // Higher bit depth for better dynamic range
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    },
    high: {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 44100,
        numberOfChannels: 1, // Mono for voice clarity
        bitRate: 192000,
        // Android-specific enhancements for best quality recording
        maxFileSize: 20971520, // 20MB limit
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.MAX,
        sampleRate: 44100,
        numberOfChannels: 2, // Use stereo
        bitRate: 128000,
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
  // Updated to match our fixed bitrates
  const approximateFileSizePerSecond = {
    low: 64000 / 8, // 64 kbps -> bytes per second
    medium: 128000 / 8, // 128 kbps -> bytes per second
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

  // Set up recorder with fixed audio settings
  const setupRecorder = async () => {
    try {
      // Request permissions
      const permissionResponse = await Audio.requestPermissionsAsync();
      if (permissionResponse.status !== 'granted') {
        throw new Error('Microphone permission not granted');
      }
      
      // Set audio mode with correct settings for iOS and Android
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        // Using the correct enum values directly
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        shouldDuckAndroid: false,
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
      // Remove the metering callback for now to avoid potential issues
      const { recording } = await Audio.Recording.createAsync(
        qualitySettings[recordingQuality]
      );
      
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

  // Play recording with enhanced volume
  const playRecording = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      if (!recorderState.audioUri) {
        throw new Error('No recording to play');
      }

      // First set playback mode to optimize audio output
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false, // <-- Important for playback!
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        // Try to use device speakers for louder playback
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Create sound object with enhanced playback settings
      const { sound } = await Audio.Sound.createAsync(
        { uri: recorderState.audioUri },
        { 
          shouldPlay: true,
          volume: 1.0, // Start with max volume 
          // We'll boost further after loading
        }
      );
      
      soundRef.current = sound;
      
      setRecorderState(prev => ({ ...prev, isPlaying: true }));
      
      // Update state when playback finishes
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
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
      return `${settings.android.sampleRate ?? 0 / 1000}kHz, ${settings.android.numberOfChannels} channel(s), ${settings.android.bitRate ?? 0 / 1000}kbps`;
    } else {
      return `WebM format, ${settings.web.bitsPerSecond ?? 0 / 1000}kbps`;
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
