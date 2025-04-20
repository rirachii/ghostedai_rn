# Migration Guide: AudioSphere → SkiaAudioVisualizer

This guide explains how to migrate from the existing AudioSphere component to the new Skia-based audio visualization components.

## Why Migrate?

The new Skia-based components offer:
- Better performance through GPU acceleration
- Smoother animations with lower CPU usage
- More advanced visual effects (particles, gradients, path animations)
- Better battery efficiency
- More customization options

## Installation

1. Install the required dependencies:
```bash
npx expo install @shopify/react-native-skia
```

2. Clear Metro bundler cache and rebuild:
```bash
npx expo start -c
```

## Basic Migration

Replace your existing import and component usage:

### Before:
```tsx
import AudioSphere from "@/components/audio/AudioSphere";

// In your component:
<AudioSphere 
  isRecording={isRecording} 
  size={240}
  color="#3b82f6"
/>
```

### After:
```tsx
import { SkiaAudioVisualizer } from "@/components/audio";

// In your component:
<SkiaAudioVisualizer 
  isRecording={isRecording} 
  size={240}
  color="#3b82f6"
/>
```

## Advanced Usage

### Using individual components:

```tsx
import { SkiaAudioSphere, SkiaAudioWaveform } from "@/components/audio";

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

### Custom hooks for advanced scenarios:

```tsx
import { useAudioState, useAudioAnalyzer } from "@/components/audio";

const MyCustomComponent = () => {
  const { amplitude, frequency, isRecording } = useAudioState(isRecording);
  
  // Custom visualization logic here
};
```

## Performance Considerations

1. The Skia components are generally more performant than the Animated API versions
2. If you experience performance issues on low-end devices, consider:
   - Reducing particle count
   - Disabling blur effects
   - Reducing animation frequency

## Troubleshooting

### Common Issues:

1. **Build errors after installing Skia**
   - Clean your gradle/iOS build folders
   - Run `npx expo prebuild --clean`

2. **Visual glitches on Android**
   - Ensure you're using the latest Expo SDK
   - Try disabling hardware acceleration: `<Canvas style={{ ...styles.canvas, hardwareAcceleration: false }} />`

3. **Higher battery consumption**
   - Adjust animation frame rates in `useAudioState` hook
   - Reduce particle count in configurations

## Customization Options

The new components offer more customization:

```tsx
const PARTICLE_CONFIG = {
  count: 30,
  maxSize: 5,
  minSize: 2,
  speed: 3,
  lifetime: 60,
};

const WAVEFORM_CONFIG = {
  barCount: 12,
  barWidth: 4,
  barGap: 3,
  smoothness: 0.7,
  amplitudeScale: 0.8,
};

// Pass these to your components as needed
```

## Next Steps

1. Test the new components with your existing code
2. Gradually migrate screens one by one
3. Monitor performance on different devices
4. Experiment with advanced effects and configurations

For more detailed documentation, refer to the type definitions in `shared/types.ts`.
