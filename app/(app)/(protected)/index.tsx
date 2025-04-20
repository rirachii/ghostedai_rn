import React, { useState, useEffect } from "react";
import { View, Alert, TouchableOpacity, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import * as FileSystem from 'expo-file-system';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "@/components/safe-area-view";

import { H1, H3, Muted } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import AudioSphere from "@/components/audio/AudioSphere";
import { useVoiceRecorder, RecordingQuality } from "@/hooks/useVoiceRecorder";
import { useSupabase } from "@/context/supabase-provider";
import { supabase } from "@/config/supabase";
import { formatTime, generateFilename } from "@/lib/utils";
import { Buffer } from 'buffer';

export default function HomeScreen() {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<RecordingQuality>('high');
  const [showQualitySettings, setShowQualitySettings] = useState(false);
  const { user } = useSupabase();
  
  const {
    isRecording,
    isPlaying,
    recordingTime,
    audioUri,
    startRecording,
    stopRecording,
    playRecording,
    stopPlayback,
    resetRecording,
    changeQuality,
    getEstimatedFileSize,
    getQualityDescription,
    formatTime: formatRecordingTime,
    recordingQuality
  } = useVoiceRecorder(selectedQuality);

  // Maximum recording time in seconds (10 minutes)
  const MAX_RECORDING_TIME = 10 * 60;

  // Check if approaching max recording time
  useEffect(() => {
    if (isRecording) {
      // Warn when 30 seconds left
      if (recordingTime === MAX_RECORDING_TIME - 30) {
        Alert.alert('Recording Time Limit', 'You have 30 seconds left in your recording.');
      }
      
      // Stop automatically at max time
      if (recordingTime >= MAX_RECORDING_TIME) {
        stopRecording();
        Alert.alert('Maximum Recording Time Reached', 'Your recording has reached the maximum allowed time of 10 minutes.');
      }
    }
  }, [recordingTime, isRecording]);

  // Handle record button press
  const handleRecordPress = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  // Handle play button press
  const handlePlayPress = async () => {
    if (isPlaying) {
      await stopPlayback();
    } else {
      await playRecording();
    }
  };

  // Handle quality change
  const handleQualityChange = (quality: RecordingQuality) => {
    setSelectedQuality(quality);
    changeQuality(quality);
    setShowQualitySettings(false);
  };

  // Check memo count before recording
  const checkMemoLimit = async () => {
    if (!user) return false;
    
    try {
      const { count, error } = await supabase
        .from('memos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      if (count && count >= 50) {
        Alert.alert(
          'Free Plan Limit Reached',
          'You have reached the 50 memo limit for the free plan. Pro plan coming soon!',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking memo count:', error);
      return false;
    }
  };

  // Handle save recording
  const handleSaveRecording = async () => {
    if (!user || !audioUri) {
      Alert.alert('Error', 'Please sign in and record audio first');
      return;
    }
    
    try {
      setIsSaving(true);
      
      // Generate a unique filename
      const timestamp = new Date().getTime();
      const filename = `${timestamp}-${user.id}.m4a`;
      
      // Create backup before upload
      const backupDir = `${FileSystem.documentDirectory}backups/`;
      const backupPath = `${backupDir}${filename}`;
      
      try {
        await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
        await FileSystem.copyAsync({ from: audioUri, to: backupPath });
        console.log('Backup created at:', backupPath);
      } catch (backupError) {
        console.warn('Failed to create backup:', backupError);
      }
      
      // Get file content - verify file exists and get proper info
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Audio file not found');
      }
      
      console.log('Audio file info:', fileInfo);
      
      // Read file as binary instead of base64 for more reliable upload
      // const fileContent = await FileSystem.readAsStringAsync(audioUri, {
      //   encoding: FileSystem.EncodingType.Base64,
      // });

      const fileContent = Buffer.from(await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      }), 'base64')
      
      // Upload to Supabase Storage with proper content type
      const { data, error } = await supabase.storage
        .from('voice-memos')
        .upload(`${user.id}/${filename}`, fileContent, {
          contentType: 'audio/x-m4a',
          upsert: true // Use upsert to replace if file exists
        });
      
      if (error) throw error;
      
      // Create memo in database
      const { data: memo, error: memoError } = await supabase
        .from('memos')
        .insert({
          user_id: user.id,
          title: `Voice Memo ${new Date().toLocaleString()}`,
          storage_path: `${user.id}/${filename}`,
        })
        .select()
        .single();
      
      if (memoError) throw memoError;
      
      // Reset recording state
      resetRecording();
      
      // Navigate to processing screen with the memo ID
      router.push({
        pathname: "/memos/[id]",
        params: { id: memo.id }
      });
      
    } catch (error) {
      console.error('Error saving recording:', error);
      Alert.alert(
        'Error',
        'Failed to save your recording. Please try again. A backup is available in the app documents folder.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Render quality setting button
  const renderQualityButton = (quality: RecordingQuality, label: string) => (
    <TouchableOpacity
      className={`px-4 py-2 rounded-full mx-1 ${
        selectedQuality === quality
          ? 'bg-primary'
          : 'bg-muted'
      }`}
      onPress={() => handleQualityChange(quality)}
    >
      <Text className={selectedQuality === quality ? 'text-white' : 'text-primary'}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 p-4">
        <View className="py-2 mb-4">
          <H1 className="text-center">Voice Memo</H1>
        </View>

        {/* Recording Visualization */}
        <View className="flex-1 justify-center items-center">
          <View className="mb-8">
            <AudioSphere 
              isRecording={isRecording} 
              size={240}
              color="#3b82f6"
            />
          </View>
          
          {/* Recording Time */}
          <Text className="text-3xl font-bold mb-8">
            {formatRecordingTime(recordingTime)}
          </Text>
          
          {/* Quality Settings Toggle */}
          {!isRecording && !audioUri && (
            <TouchableOpacity
              className="mb-4"
              onPress={() => setShowQualitySettings(!showQualitySettings)}
            >
              <View className="flex-row items-center">
                <Ionicons 
                  name={showQualitySettings ? "settings" : "settings-outline"} 
                  size={20} 
                  color="#3b82f6" 
                />
                <Text className="text-primary ml-2">
                  {showQualitySettings ? "Hide Quality Settings" : "Quality Settings"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          
          {/* Quality Settings */}
          {showQualitySettings && (
            <View className="mb-6">
              <View className="flex-row justify-center mb-4">
                {renderQualityButton('low', 'Low')}
                {renderQualityButton('medium', 'Medium')}
                {renderQualityButton('high', 'High')}
              </View>
              
              <View className="bg-muted/30 p-3 rounded-lg">
                <Text className="text-center font-medium mb-1">
                  {selectedQuality.charAt(0).toUpperCase() + selectedQuality.slice(1)} Quality
                </Text>
                <Muted className="text-center text-xs mb-1">
                  {getQualityDescription()}
                </Muted>
                <Muted className="text-center text-xs">
                  Est. size: {getEstimatedFileSize(60)} MB per minute
                </Muted>
              </View>
            </View>
          )}
          
          {/* Main Action Button */}
          {!audioUri ? (
            // Recording Button
            <TouchableOpacity
              className={`w-20 h-20 rounded-full items-center justify-center ${
                isRecording ? 'bg-red-500' : 'bg-primary'
              }`}
              onPress={handleRecordPress}
              disabled={isSaving}
            >
              <FontAwesome
                name={isRecording ? 'stop' : 'microphone'}
                size={36}
                color="white"
              />
            </TouchableOpacity>
          ) : (
            // Playback and Save Controls
            <View className="flex-row">
              <TouchableOpacity
                className="w-16 h-16 rounded-full bg-muted items-center justify-center mr-4"
                onPress={resetRecording}
                disabled={isSaving}
              >
                <FontAwesome name="trash" size={24} color="#ef4444" />
              </TouchableOpacity>
              
              <TouchableOpacity
                className="w-16 h-16 rounded-full bg-primary items-center justify-center mr-4"
                onPress={handlePlayPress}
                disabled={isSaving}
              >
                <FontAwesome
                  name={isPlaying ? 'pause' : 'play'}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                className="w-16 h-16 rounded-full bg-green-500 items-center justify-center"
                onPress={handleSaveRecording}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <FontAwesome name="check" size={24} color="white" />
                )}
              </TouchableOpacity>
            </View>
          )}
          
          {/* Instructions */}
          <View className="mt-8">
            <Muted className="text-center">
              {isRecording
                ? 'Tap the stop button when you are finished recording'
                : audioUri
                ? 'Listen to your recording before saving'
                : 'Tap the microphone to start recording'}
            </Muted>
            
            {isRecording && (
              <Muted className="text-center mt-2 text-xs">
                {MAX_RECORDING_TIME - recordingTime} seconds remaining
              </Muted>
            )}
          </View>
        </View>
      </View>

    </SafeAreaView>
  );
}
