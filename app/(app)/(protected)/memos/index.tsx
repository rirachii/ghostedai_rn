import React, { useState, useEffect } from "react";
import { View, FlatList, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "@/components/safe-area-view";

import { H1, Muted } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/context/supabase-provider";
import { supabase } from "@/config/supabase";
import { Tables } from "@/types/database";

// Define the Memo type using the database.ts types
type Memo = Tables<"memos">;

export default function MemosScreen() {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useSupabase();

  // Fetch memos when component mounts or user changes
  useEffect(() => {
    fetchMemos();
  }, [user]);

  // Function to fetch memos from Supabase
  const fetchMemos = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('memos')
        .select('id, title, created_at, summary, storage_path')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMemos(data as Memo[]);
    } catch (error) {
      console.error('Error fetching memos:', error);
      Alert.alert('Error', 'Failed to load your memos. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Handle refresh on pull down
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchMemos();
  };

  // Navigate to memo detail
  const handleMemoPress = (id: string) => {
    router.push({
      pathname: "/memos/[id]",
      params: { id }
    });
  };

  // Handle memo deletion
  const handleDeleteMemo = async (id: string) => {
    Alert.alert(
      "Delete Memo",
      "Are you sure you want to delete this memo?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('memos')
                .delete()
                .eq('id', id);

              if (error) throw error;

              // Update local state to remove the deleted memo
              setMemos(memos.filter(memo => memo.id !== id));
              
            } catch (error) {
              console.error('Error deleting memo:', error);
              Alert.alert('Error', 'Failed to delete the memo. Please try again.');
            }
          }
        }
      ]
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center p-4">
      <View className="w-20 h-20 rounded-full bg-muted mb-4 items-center justify-center">
        <Text className="text-2xl">📝</Text>
      </View>
      <Text className="text-xl font-medium text-center mb-2">No Memos Yet</Text>
      <Muted className="text-center mb-6">
        Your voice memos will appear here after you record them
      </Muted>
      <Button
        onPress={() => router.push("/memos/new")}
        className="px-6"
      >
        Record a Voice Memo
      </Button>
    </View>
  );

  const renderMemoItem = ({ item }: { item: Memo }) => (
    <TouchableOpacity
      className="bg-card rounded-lg p-4 mb-4 flex-row items-center"
      onPress={() => handleMemoPress(item.id)}
    >
      <View className="flex-1">
        <Text className="text-lg font-medium mb-1">{item.title}</Text>
        <Text className="text-xs text-muted-foreground mb-2">
          {formatDate(item.created_at)}
        </Text>
        {item.summary ? (
          <Muted className="text-sm">{item.summary}</Muted>
        ) : (
          <Text className="text-sm text-primary italic">Processing...</Text>
        )}
      </View>
      
      <View className="flex-row items-center">
        <TouchableOpacity
          className="p-2 mr-2"
          onPress={() => handleDeleteMemo(item.id)}
        >
          
          <Text className="text-lg text-destructive">🗑️</Text>
        </TouchableOpacity>
        <Text className="text-muted-foreground">›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-4">
        <H1 className="mb-6">Your Memos</H1>
        
        {isLoading && !isRefreshing ? (
          <View className="flex-1 justify-center items-center p-4">
            <ActivityIndicator size="large" color="#0000ff" />
            <Text className="mt-4">Loading your memos...</Text>
          </View>
        ) : (
          <FlatList
            data={memos}
            keyExtractor={(item) => item.id}
            renderItem={renderMemoItem}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={{ 
              flexGrow: 1, 
              paddingBottom: 20
            }}
            showsVerticalScrollIndicator={false}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
