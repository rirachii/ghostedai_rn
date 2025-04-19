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
  subtasks?: string[];
  isPriority?: boolean;
}

interface ProcessedData {
  id: string;
  timestamp: string;
  summary: string;
  transcription: string;
  tasks: Task[];
  priority_focus?: string;
  rawResponse: string;
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
    // Prevent multiple processing attempts
    if (processingStage === ProcessingStage.PROCESSING) {
      console.log("Already processing, skipping duplicate request");
      return;
    }
    
    try {
      console.log("Starting audio processing for memo:", memo.id);
      setProcessingStage(ProcessingStage.PROCESSING);
      
      if (!user) {
        throw new Error("Please sign in to process audio");
      }
      
      if (!memo.storage_path) {
        throw new Error("Missing storage path for audio file");
      }
      
      // Step 1: Convert M4A to MP3 using our cloud service
      console.log("Starting M4A to MP3 conversion...");
      setError(null); // Clear any previous errors
      
      let mp3Path = "";
      try {
        console.log(`Converting file from path: ${memo.storage_path}`);
        mp3Path = await convertAudioToMp3(memo.storage_path);
        console.log("Conversion successful, MP3 path:", mp3Path);
      } catch (conversionError) {
        console.error("Error during audio conversion:", conversionError);
        throw new Error(conversionError instanceof Error ? 
          `Audio conversion failed: ${conversionError.message}` : 
          "Failed to convert audio file to MP3 format");
      }
      
      // Step 2: Process the audio with AI through Supabase Edge Function
      console.log("Starting AI processing with file:", mp3Path);
      let data: ProcessedData;
      try {
        data = await processAudioWithAI(mp3Path);
        console.log("AI processing complete");
      } catch (aiError) {
        console.error("Error during AI processing:", aiError);
        throw new Error(aiError instanceof Error ? 
          `AI processing failed: ${aiError.message}` : 
          "Failed to process audio with AI");
      }
      
      if (!data) {
        throw new Error("Empty response from AI processing server");
      }
      
      console.log("AI processing results:", {
        summarySample: data.summary?.substring(0, 50) + "...",
        transcriptionLength: data.transcription?.length,
        taskCount: data.tasks?.length
      });
      
      // Step 3: Save the processing results to the database
      console.log("Saving processing results to database");
      try {
        await handleProcessingResults(data, memo);
        console.log("Processing results saved successfully");
      } catch (saveError) {
        console.error("Error saving processing results:", saveError);
        throw new Error(saveError instanceof Error ? 
          `Failed to save results: ${saveError.message}` : 
          "Failed to save processing results");
      }
      
      console.log("Audio processing workflow completed successfully");
    } catch (error) {
      console.error("Error in audio processing workflow:", error);
      setProcessingStage(ProcessingStage.ERROR);
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMsg);
      Alert.alert("Processing Failed", errorMsg);
    }
  };
  
  // Helper function to parse dates into timestamps
  const parseRelativeDate = (dateStr: string): string => {
    if (!dateStr) return new Date().toISOString();
    
    try {
      const now = new Date();
      const lowercaseStr = dateStr.toLowerCase();
      
      // Try to parse explicit date formats first (e.g., "Sun Apr 20 2025")
      const explicitDate = new Date(dateStr);
      if (!isNaN(explicitDate.getTime())) {
        console.log(`Parsed explicit date: ${dateStr} -> ${explicitDate.toISOString()}`);
        // Set to end of day
        explicitDate.setHours(23, 59, 59, 999);
        return explicitDate.toISOString();
      }
      
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
      
      if (lowercaseStr.includes("today")) {
        const today = new Date(now);
        today.setHours(23, 59, 59, 999);
        return today.toISOString();
      }
      
      // Check for "in X days" format
      const daysMatch = lowercaseStr.match(/in\s+(\d+)\s+days?/i);
      if (daysMatch && daysMatch[1]) {
        const days = parseInt(daysMatch[1], 10);
        const futureDate = new Date(now);
        futureDate.setDate(now.getDate() + days);
        futureDate.setHours(23, 59, 59, 999);
        return futureDate.toISOString();
      }
      
      // Default to end of current day if we can't parse
      console.log(`Could not parse date: ${dateStr}, using default`);
      const endOfToday = new Date(now);
      endOfToday.setHours(23, 59, 59, 999);
      return endOfToday.toISOString();
    } catch (error) {
      console.error(`Error parsing date: ${dateStr}`, error);
      // Return current date as fallback
      return new Date().toISOString();
    }
  };
  
  // Handle the processing results
  const handleProcessingResults = async (data: ProcessedData, memo: Memo) => {
    try {
      console.log("Handling processing results:", {
        memoId: memo.id,
        summaryLength: data.summary?.length,
        transcriptionLength: data.transcription?.length,
        taskCount: data.tasks?.length
      });
      
      // Step 1: Update memo with processing results
      const memoUpdate = {
        transcription: data.transcription || "",
        summary: data.summary || "",
        // Store the raw response in the content field as JSON
        content: JSON.stringify({
          tasks: data.tasks,
          priority_focus: data.priority_focus,
          timestamp: data.timestamp
        })
      };
      
      console.log("Updating memo in database...");
      const { error: updateError } = await supabase
        .from("memos")
        .update(memoUpdate)
        .eq("id", memo.id);
      
      if (updateError) {
        console.error("Supabase error updating memo:", updateError);
        throw new Error(`Failed to update memo: ${updateError.message}`);
      }
      
      // Step 2: Create todos if tasks were extracted
      if (data.tasks && data.tasks.length > 0) {
        console.log(`Creating ${data.tasks.length} todos from tasks...`);
        
        const todosToInsert = data.tasks.map((task) => {
          if (!user?.id) {
            throw new Error("User not found");
          }
          
          try {
            // Parse the deadline string to create a timestamp
            const parsedDeadline = parseRelativeDate(task.deadline);
            
            // Create the todo object
            return {
              user_id: user.id,
              memo_id: memo.id,
              title: task.text,
              // Store subtasks in description field if available
              description: task.subtasks ? task.subtasks.join("\n- ") : "",
              due_date: parsedDeadline,
              is_completed: false,
            };
          } catch (parseError) {
            console.warn("Error parsing deadline for task:", task, parseError);
            // Return a todo with a default deadline if parsing fails
            return {
              user_id: user.id,
              memo_id: memo.id,
              title: task.text,
              description: task.subtasks ? task.subtasks.join("\n- ") : "",
              due_date: new Date().toISOString(), // Default to now
              is_completed: false,
            };
          }
        });
        
        console.log("Inserting todos into database...");
        const { error: todosError } = await supabase
          .from("todos")
          .insert(todosToInsert);
        
        if (todosError) {
          console.error("Supabase error creating todos:", todosError);
          throw new Error(`Failed to create todos: ${todosError.message}`);
        }
        
        console.log("Todos created successfully");
      } else {
        console.log("No tasks to create todos from");
      }
      
      // Step 3: Update the UI state
      setSummary(data.summary || "No summary available");
      setTasks(data.tasks || []);
      
      // Step 4: Mark processing as complete
      setProcessingStage(ProcessingStage.COMPLETE);
      console.log("Processing complete!");
      
      // Only show alert if we're not resuming a previous processing
      if (memo.transcription === null && memo.summary === null) {
        Alert.alert("Success", "Voice memo processed successfully!");
      }
    } catch (error) {
      console.error("Error in handleProcessingResults:", error);
      setProcessingStage(ProcessingStage.ERROR);
      const errorMsg = error instanceof Error ? error.message : "Failed to process results";
      setError(errorMsg);
      throw error instanceof Error ? error : new Error(errorMsg);
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
                <H3 className="mb-4">
                  Tasks{" "}
                  <Text className="text-sm font-normal text-muted-foreground">
                    ({tasks.length})
                  </Text>
                </H3>
                
                {tasks.map((task, index) => (
                  <View key={task.id} 
                    className={`py-3 ${index < tasks.length - 1 ? 'border-b border-border' : ''}`}>
                    <View className="flex-row items-center">
                      <View 
                        className={`w-2 h-2 rounded-full mr-2 ${task.isPriority ? 'bg-primary' : 'bg-muted'}`} 
                      />
                      <Text className={`font-medium ${task.isPriority ? 'text-primary' : ''}`}>
                        {task.text}
                      </Text>
                    </View>
                    
                    {task.deadline && (
                      <Muted className="ml-4 mt-1">
                        Due: {task.deadline}
                      </Muted>
                    )}
                    
                    {task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                      <View className="ml-4 mt-2">
                        {task.subtasks.map((subtask, i) => (
                          <Text key={i} className="text-sm mt-1">
                            • {subtask}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            
            {/* Transcription section (collapsible) */}
            <View className="bg-card rounded-lg p-4 mb-6">
              <H3 className="mb-2">Transcription</H3>
              <Text numberOfLines={3} ellipsizeMode="tail">
                {memo?.transcription || "No transcription available"}
              </Text>
              {/* Could add a "Show more" button to expand the full transcription */}
            </View>
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
