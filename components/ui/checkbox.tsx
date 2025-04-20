import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { cn } from '@/lib/utils';

interface CheckboxProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
}

export function Checkbox({ checked = false, onCheckedChange, className }: CheckboxProps) {
  return (
    <TouchableOpacity
      onPress={() => onCheckedChange?.(!checked)}
      className={cn(
        'h-5 w-5 rounded border border-primary',
        checked ? 'bg-primary' : 'bg-transparent',
        className
      )}
    >
      {checked && (
        <View className="flex-1 items-center justify-center">
          <FontAwesome name="check" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );
} 