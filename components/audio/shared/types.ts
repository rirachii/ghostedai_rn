import { SharedValue } from 'react-native-reanimated';

export interface AudioVisualizerProps {
  isRecording: boolean;
  amplitude?: number;
  size?: number;
  color?: string;
}

export interface AudioState {
  amplitude: SharedValue<number>;
  frequency: SharedValue<number[]>;
  isRecording: SharedValue<boolean>;
}

export interface SkiaAudioTheme {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  backgroundColor: string;
}

export interface ParticleConfig {
  count: number;
  maxSize: number;
  minSize: number;
  speed: number;
  lifetime: number;
}

export interface WaveformConfig {
  barCount: number;
  barWidth: number;
  barGap: number;
  smoothness: number;
  amplitudeScale: number;
}
