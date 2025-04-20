# Audio Visualization Components

This directory contains both the legacy React Native Animated API components and the new Skia-based audio visualization components.

## Components

### Legacy Components
- `AudioSphere`: Original React Native Animated API sphere visualization
- `AudioWaveform`: Original React Native Animated API waveform visualization

### Skia Components (NEW)
- `SkiaAudioSphere`: GPU-accelerated sphere with particle effects
- `SkiaAudioWaveform`: Smooth waveform with gradient effects
- `SkiaAudioVisualizer`: Combined sphere and waveform visualizer

## Features

### SkiaAudioSphere
- Radial gradient glow effects
- Particle system for high amplitude moments
- Smooth pulsating animation
- Dynamic color changes

### SkiaAudioWaveform
- Smooth bezier curve waveform
- Dynamic frequency bars
- Gradient effects
- Responsive bar widths

## Usage

Basic usage with the combined visualizer:

```tsx
import { SkiaAudioVisualizer } from '@/components/audio';

function RecordingScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [amplitude, setAmplitude] = useState(0);

  return (
    <SkiaAudioVisualizer 
      isRecording={isRecording}
      amplitude={amplitude}
      size={240}
      color="#3b82f6"
    />
  );
}
```

Advanced usage with individual components:

```tsx
import { SkiaAudioSphere, SkiaAudioWaveform } from '@/components/audio';

// Sphere only
<SkiaAudioSphere 
  isRecording={isRecording}
  amplitude={amplitude}
  size={240}
  color="#3b82f6"
/>

// Waveform only
<SkiaAudioWaveform 
  isRecording={isRecording}
  amplitude={amplitude}
  size={60}
  color="#3b82f6"
/>
```

## Performance

The Skia-based components offer significantly better performance than the React Native Animated API versions:

- GPU acceleration for smoother animations
- Lower CPU usage during intensive animations
- Better battery efficiency
- Higher frame rates on complex visualizations

## Customization

Both components support extensive customization through configuration props:

```tsx
// Particle configuration for SkiaAudioSphere
const particleConfig = {
  count: 30,
  maxSize: 5,
  minSize: 2,
  speed: 3,
  lifetime: 60,
};

// Waveform configuration for SkiaAudioWaveform
const waveformConfig = {
  barCount: 12,
  barWidth: 4,
  barGap: 3,
  smoothness: 0.7,
  amplitudeScale: 0.8,
};
```

## Migration

See `migration-guide.md` for detailed instructions on migrating from the legacy components to the new Skia components.

## Development

To add new features or effects:

1. Create new components in their respective directories
2. Update type definitions in `shared/types.ts`
3. Create or update animations in `animations.ts`
4. Export new components in `index.ts`

## Technical Details

The Skia components utilize:
- `@shopify/react-native-skia` for rendering
- `react-native-reanimated` for animation values
- SharedValue for efficient state updates
- Canvas API for drawing operations
- GPU shaders for visual effects

For optimal performance, avoid:
- Heavy computation in render methods
- Too many particles (over 100)
- Excessive blur effects
- Frequent dimension changes
