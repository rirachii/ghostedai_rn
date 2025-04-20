import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useSupabase } from '@/context/supabase-provider';

export const GoogleAuthButton = () => {
  const { signInWithGoogle } = useSupabase();
  const [isLoading, setIsLoading] = useState(false);

  const handlePress = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in with Google:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableOpacity
      className="w-full bg-white dark:bg-gray-800 py-3 px-4 rounded-lg flex-row items-center justify-center border border-gray-200 dark:border-gray-700"
      onPress={handlePress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#000" />
      ) : (
        <Text className="text-black dark:text-white font-semibold text-base">
          Continue with Google
        </Text>
      )}
    </TouchableOpacity>
  );
}; 