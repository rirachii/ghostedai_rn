import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useSupabase } from '@/context/supabase-provider';

export const AppleAuthButton = () => {
  const { signInWithApple } = useSupabase();

  const handlePress = async () => {
    try {
      await signInWithApple();
    } catch (error) {
      console.error('Error signing in with Apple:', error);
    }
  };

  return (
    <TouchableOpacity
      className="w-full bg-black dark:bg-white py-3 px-4 rounded-lg flex-row items-center justify-center"
      onPress={handlePress}
    >
      <Text className="text-white dark:text-black font-semibold text-base">
        Continue with Apple
      </Text>
    </TouchableOpacity>
  );
}; 