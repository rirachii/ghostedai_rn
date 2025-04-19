import React, { useState, useEffect } from "react";
import { View, ScrollView, ActivityIndicator, Alert, TextInput } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { H1, H3, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { convertAudioToMp3, processAudioWithAI } from "@/services/audioConversion";

// Enum to track the processing stages
enum ProcessingStage {
  IDLE = "idle",
  PROCESSING = "processing",
  COMPLETE = "complete",
  ERROR = "error"
}

// Types
interface Task {
  id: string;
  text: string;
  deadline: string;
  isPriority?: boolean;
}

interface ProcessedData {
  id: string;
  timestamp: string;
  summary: string;
  transcription: string;
  tasks: Task[];
}

interface Memo {
  id: string;
  user_id: string;
  title: string;
  storage_path: string | null;
  transcription: string | null;
  summary: string | null;
  created_at: string | null;
  updated_at: string | null;
  content: string | null;
}

export default function NewNoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSupabase();
  
  // Memo data
  const [memo, setMemo] = useState<Memo | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(ProcessingStage.IDLE);
  const [error, setError] = useState<string | null>(null);
  
  // Load memo when component mounts
  useEffect(() => {
    if (!id || !user) {
      Alert.alert("Error", "Invalid memo ID or not signed in");
      router.back();
      return;
    }
    
    const loadMemo = async () => {
      try {
        // Fetch memo data from Supabase
        const { data: memo, error: memoError } = await supabase
          .from("memos")
          .select()
          .eq("id", id)
          .single();
        
        if (memoError) throw memoError;
        if (!memo) throw new Error("Memo not found");
        
        // Check if memo belongs to current user
        if (memo.user_id !== user.id) {
          throw new Error("Unauthorized access");
        }
        
        // Check if we have a valid storage path
        if (!memo.storage_path) {
          throw new Error("Missing storage path for audio file");
        }
        
        setMemo(memo);
        setTitle(memo.title);
        
        // Start processing if not already processed and not already started
        if (!memo.transcription && !memo.summary) {
          processAudio(memo);
        } else if (memo.summary) {
          // If already processed, load the data
          setSummary(memo.summary);
          
          // Fetch associated tasks
          const { data: todoData, error: todoError } = await supabase
            .from("todos")
            .select("*")
            .eq("memo_id", memo.id);
          
          if (!todoError && todoData) {
            const formattedTasks: Task[] = todoData.map(todo => ({
              id: todo.id,
              text: todo.title,
              deadline: todo.due_date || "No deadline",
              isPriority: false
            }));
            
            // Set the first task as priority by default
            if (formattedTasks.length > 0) {
              formattedTasks[0].isPriority = true;
            }
            
            setTasks(formattedTasks);
          }
          
          setProcessingStage(ProcessingStage.COMPLETE);
        }
      } catch (error) {
        console.error("Error loading memo:", error);
        Alert.alert(
          "Error",
          error instanceof Error ? error.message : "Failed to load memo"
        );
        router.back();
      }
    };
    
    loadMemo();
  }, [id, user]);
  
  // Process the audio file
  const processAudio = async (memo: Memo) => {
    if (processingStage === ProcessingStage.PROCESSING) {
      return;
    }
    
    try {
      console.log("Starting audio processing for memo:", memo.id);
      setProcessingStage(ProcessingStage.PROCESSING);
      
      if (!user) {
        throw new Error("Please sign in to process audio");
      }
      
      // Convert M4A to MP3 using our service
      console.log("Starting M4A conversion...");
      
      let mp3Path = "";
      try {
        mp3Path = await convertAudioToMp3(memo.storage_path as string);
        console.log("Conversion successful, MP3 path:", mp3Path);
      } catch (conversionError) {
        console.error("Error during audio conversion:", conversionError);
        throw new Error(conversionError instanceof Error ? 
          conversionError.message : 
          "Failed to convert audio file");
      }
      
      // Process the audio with AI
      console.log("Starting AI processing...");
      const data = await processAudioWithAI(mp3Path);
      
      if (!data) {
        throw new Error("Empty response from server");
      }
      
      await handleProcessingResults(data, memo);
    } catch (error) {
      console.error("Error processing audio:", error);
      setProcessingStage(ProcessingStage.ERROR);
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      Alert.alert("Processing Failed", error instanceof Error ? error.message : "Failed to process audio");
    }
  };
  
  // Helper function to parse relative dates into timestamps
  const parseRelativeDate = (dateStr: string): string => {
    const now = new Date();
    const lowercaseStr = dateStr.toLowerCase();
    
    // Handle common relative date formats
    if (lowercaseStr.includes("tomorrow")) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);
      return tomorrow.toISOString();
    }
    
    if (lowercaseStr.includes("next week")) {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      nextWeek.setHours(23, 59, 59, 999);
      return nextWeek.toISOString();
    }
    
    // Default to end of current day if we can't parse
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);
    return endOfToday.toISOString();
  };
  
  // Handle the processing results
  const handleProcessingResults = async (data: ProcessedData, memo: Memo) => {
    try {
      // Update memo with processing results
      const { error: updateError } = await supabase
        .from("memos")
        .update({
          transcription: data.transcription || "",
          summary: data.summary,
        })
        .eq("id", memo.id);
      
      if (updateError) {
        throw new Error(`Failed to update memo: ${updateError.message}`);
      }
      
      // Create todos if tasks were extracted
      if (data.tasks && data.tasks.length > 0) {
        const todosToInsert = data.tasks.map((task) => {
          if (!user?.id) {
            throw new Error("User not found");
          }
          
          const parsedDeadline = parseRelativeDate(task.deadline);
          
          return {
            user_id: user.id,
            memo_id: memo.id,
            title: task.text,
            due_date: parsedDeadline,
            is_completed: false,
          };
        });
        
        const { error: todosError } = await supabase
          .from("todos")
          .insert(todosToInsert);
        
        if (todosError) {
          throw new Error(`Failed to create todos: ${todosError.message}`);
        }
      }
      
      setSummary(data.summary);
      setTasks(data.tasks);
      
      setProcessingStage(ProcessingStage.COMPLETE);
      Alert.alert("Success", "Processing complete!");
    } catch (error) {
      console.error("Error in handleProcessingResults:", error);
      throw error instanceof Error ? error : new Error("Failed to process results");
    }
  };
  
  // Save the memo
  const handleSave = async () => {
    if (!memo) return;
    
    try {
      // Update memo title
      const { error: updateError } = await supabase
        .from("memos")
        .update({ title })
        .eq("id", memo.id);
      
      if (updateError) throw updateError;
      
      Alert.alert("Success", "Memo saved successfully!");
      router.push("/(app)/(protected)/memos");
    } catch (error) {
      console.error("Error saving memo:", error);
      Alert.alert("Error", "Failed to save memo");
    }
  };
  
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <View className="flex-row items-center mb-4">
          <Button
            variant="ghost"
            onPress={() => router.back()}
            className="mr-2"
          >
            <Text>Back</Text>
          </Button>
          <H1>Processing Memo</H1>
        </View>

        <TextInput
          className="text-xl font-semibold p-3 bg-card rounded-md border border-border mb-4"
          placeholder="Note title..."
          value={title}
          onChangeText={setTitle}
        />

        {processingStage === ProcessingStage.PROCESSING && (
          <View className="bg-card rounded-lg p-4 mb-6 items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-4 text-center">
              Processing your voice memo...
            </Text>
            <Muted className="text-center mt-2">
              This may take a few moments as we transcribe and analyze your audio.
            </Muted>
          </View>
        )}

        {processingStage === ProcessingStage.ERROR && (
          <View className="bg-destructive/10 rounded-lg p-4 mb-6">
            <H3 className="text-destructive mb-2">Processing Error</H3>
            <Text>{error || "An error occurred while processing your voice memo"}</Text>
            <Button 
              variant="outline" 
              className="mt-4"
              onPress={() => memo && processAudio(memo)}
            >
              <Text>Retry Processing</Text>
            </Button>
          </View>
        )}

        {processingStage === ProcessingStage.COMPLETE && (
          <>
            <View className="bg-card rounded-lg p-4 mb-6">
              <H3 className="mb-2">Summary</H3>
              <Text>{summary}</Text>
            </View>

            {tasks.length > 0 && (
              <View className="bg-card rounded-lg p-4 mb-6">
                <H3 className="mb-4">Tasks</H3>
                {tasks.map((task, index) => (
                  <View key={task.id} className="py-2 border-b border-border">
                    <Text className="font-medium">
                      {index + 1}. {task.text}
                    </Text>
                    {task.deadline && (
                      <Muted>Due: {task.deadline}</Muted>
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Button
          className="mt-4 mb-8"
          onPress={handleSave}
          disabled={processingStage !== ProcessingStage.COMPLETE}
        >
          <Text>Save Note</Text>
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
