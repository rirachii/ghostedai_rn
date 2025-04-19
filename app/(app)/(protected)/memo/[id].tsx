import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { H1, H3, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { Tables } from "@/types/database";

// Define the type for a memo using the database types
type Memo = Tables<"memos">;
type Todo = Tables<"todos">;

export default function MemoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [memo, setMemo] = useState<Memo | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
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

      // Fetch todos for this memo
      const { data: todoData, error: todoError } = await supabase
        .from('todos')
        .select('*')
        .eq('memo_id', id)
        .order('created_at', { ascending: false });

      if (todoError) throw todoError;

      setTodos(todoData || []);
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

  const handleToggleTodo = async (todoId: string, currentStatus: boolean | null) => {
    try {
      const newStatus = !currentStatus;
      
      const { error } = await supabase
        .from('todos')
        .update({ is_completed: newStatus })
        .eq('id', todoId);

      if (error) throw error;

      // Update local state
      setTodos(todos.map(todo => 
        todo.id === todoId ? { ...todo, is_completed: newStatus } : todo
      ));
    } catch (error) {
      console.error('Error updating todo:', error);
      Alert.alert('Error', 'Failed to update task status.');
    }
  };

  const handleDeleteMemo = async () => {
    if (!memo) return;

    Alert.alert(
      "Delete Memo",
      "Are you sure you want to delete this memo? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Delete the memo
              const { error } = await supabase
                .from('memos')
                .delete()
                .eq('id', memo.id);

              if (error) throw error;

              // Navigate back to the memos list
              router.back();
            } catch (error) {
              console.error('Error deleting memo:', error);
              Alert.alert('Error', 'Failed to delete the memo.');
            }
          }
        }
      ]
    );
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
          <Button onPress={() => router.back()}>
            <Text>Go Back</Text>
          </Button>
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
          {memo.summary && (
            <View className="bg-card rounded-lg p-4 mb-6">
              <H3 className="mb-2">Summary</H3>
              <Text>{memo.summary}</Text>
            </View>
          )}

          {/* Transcription Section */}
          {memo.transcription && (
            <View className="bg-card rounded-lg p-4 mb-6">
              <H3 className="mb-2">Transcription</H3>
              <Text>{memo.transcription}</Text>
            </View>
          )}

          {/* Tasks Section */}
          <View className="bg-card rounded-lg p-4 mb-6">
            <H3 className="mb-4">Tasks</H3>
            
            {todos.length === 0 ? (
              <Muted>No tasks were identified in this memo.</Muted>
            ) : (
              todos.map((todo) => (
                <View key={todo.id} className="flex-row items-center py-3 border-b border-border">
                  <TouchableOpacity
                    className="mr-3 w-6 h-6 rounded-full border border-primary items-center justify-center"
                    onPress={() => handleToggleTodo(todo.id, todo.is_completed)}
                  >
                    {todo.is_completed && (
                      <View className="w-4 h-4 rounded-full bg-primary" />
                    )}
                  </TouchableOpacity>
                  <Text className={todo.is_completed ? "flex-1 line-through text-muted-foreground" : "flex-1"}>
                    {todo.title}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Audio Playback - Placeholder for now */}
          {memo.storage_path && (
            <View className="bg-card rounded-lg p-4 mb-6">
              <H3 className="mb-2">Original Recording</H3>
              <Button variant="outline" className="mt-2">
                <Text>Play Recording</Text>
              </Button>
            </View>
          )}

          {/* Delete Button */}
          <Button
            variant="destructive"
            onPress={handleDeleteMemo}
            className="mt-4"
          >
            <Text>Delete Memo</Text>
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
