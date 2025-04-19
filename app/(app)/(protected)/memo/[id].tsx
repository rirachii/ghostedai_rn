import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { H1, H3, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { Tables } from "@/types/database";

// Define the type for a memo using the database types
type Memo = Tables<"memos">;

export default function MemoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchMemoDetails();
  }, [id]);

  const fetchMemoDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);

      // Fetch the memo details
      const { data: memoData, error: memoError } = await supabase
        .from('memos')
        .select('*')
        .eq('id', id)
        .single();

      if (memoError) throw memoError;

      setMemo(memoData);
    } catch (error) {
      console.error('Error fetching memo details:', error);
      Alert.alert('Error', 'Failed to load memo details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-4">Loading memo details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!memo) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center p-4">
          <Text className="text-xl mb-4">Memo not found</Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1">
        <View className="p-4">
          {/* Header with back button */}
          <View className="flex-row items-center mb-4">
            <Button
              variant="ghost"
              onPress={() => router.back()} 
              className="mr-2"
            >
              <Text>Back</Text>
            </Button>
            <H1 numberOfLines={1} className="flex-1">
              {memo.title}
            </H1>
          </View>

          {/* Date */}
          <Text className="text-muted-foreground mb-6">
            {formatDate(memo.created_at)}
          </Text>

          {/* Summary Section */}
          <View className="bg-card rounded-lg p-4 mb-6">
            <H3 className="mb-2">Summary</H3>
            <Text>{memo.summary || "No summary available yet. Processing..."}</Text>
          </View>

          {/* Transcription Section */}
          <View className="bg-card rounded-lg p-4 mb-6">
            <H3 className="mb-2">Transcription</H3>
            <Text>{memo.transcription || "No transcription available yet. Processing..."}</Text>
          </View>

          {/* Delete Button */}
          <Button 
            variant="destructive" 
            className="mt-4 mb-8"
            onPress={() => {
              Alert.alert(
                "Delete Memo",
                "Are you sure you want to delete this memo?",
                [
                  { text: "Cancel" },
                  { 
                    text: "Delete", 
                    style: "destructive",
                    onPress: () => router.back()
                  }
                ]
              );
            }}
          >
            <Text>Delete Memo</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
