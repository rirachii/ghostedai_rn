import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "@/components/safe-area-view";
import { H1, Muted } from "@/components/ui/typography";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center items-center p-4">
        <View className="w-32 h-32 rounded-full bg-primary/20 mb-8 items-center justify-center">
          <Text className="text-4xl">🎙️</Text>
        </View>
        
        <H1 className="text-center mb-2">Record Voice Memo</H1>
        <Muted className="text-center mb-8">
          Tap the button below to start recording your voice memo
        </Muted>
        
        <Button className="w-64 h-16 rounded-full mb-4" variant="default">
          <Text className="text-lg">Start Recording</Text>
        </Button>
        
        <Muted className="text-center">
          AI will automatically transcribe and extract tasks from your memo
        </Muted>
      </View>
    </SafeAreaView>
  );
}
