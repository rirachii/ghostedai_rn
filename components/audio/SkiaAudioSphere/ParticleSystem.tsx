import React, { useEffect } from 'react';
import { Circle, Paint, runTiming, useValue, vec } from '@shopify/react-native-skia';
import { SharedValue } from 'react-native-reanimated';
import { ParticleConfig } from '../shared/types';

interface Particle {
  x: number;
  y: number;
  radius: number;
  velocity: { x: number; y: number };
  life: number;
  opacity: number;
}

interface ParticleSystemProps {
  center: { x: number; y: number };
  amplitude: SharedValue<number>;
  isRecording: SharedValue<boolean>;
  config: ParticleConfig;
  color: string;
}

export const ParticleSystem: React.FC<ParticleSystemProps> = ({
  center,
  amplitude,
  isRecording,
  config,
  color,
}) => {
  const particles = useValue<Particle[]>([]);

  // Create and update particles
  useEffect(() => {
    let animationFrame: number;
    
    const updateParticles = () => {
      if (isRecording.value && amplitude.value > 0.5) {
        // Create new particles
        const particleCount = Math.floor(amplitude.value * config.count);
        for (let i = 0; i < particleCount; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = config.speed * (0.5 + Math.random() * 0.5);
          const size = config.minSize + Math.random() * (config.maxSize - config.minSize);
          
          particles.current.push({
            x: center.x,
            y: center.y,
            radius: size,
            velocity: {
              x: Math.cos(angle) * speed,
              y: Math.sin(angle) * speed,
            },
            life: config.lifetime,
            opacity: 1,
          });
        }
      }

      // Update existing particles
      particles.current = particles.current
        .filter(p => p.life > 0)
        .map(p => ({
          ...p,
          x: p.x + p.velocity.x,
          y: p.y + p.velocity.y,
          life: p.life - 1,
          opacity: p.life / config.lifetime,
        }));

      // Limit particle count
      if (particles.current.length > config.count * 5) {
        particles.current = particles.current.slice(-config.count * 5);
      }

      animationFrame = requestAnimationFrame(updateParticles);
    };

    updateParticles();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  return (
    <>
      {particles.current.map((particle, index) => (
        <Circle
          key={index}
          cx={particle.x}
          cy={particle.y}
          r={particle.radius}
          opacity={particle.opacity}
        >
          <Paint color={color} />
        </Circle>
      ))}
    </>
  );
};
