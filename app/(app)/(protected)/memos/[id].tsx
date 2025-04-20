import React, { useState, useEffect, useRef } from "react";
import { View, ActivityIndicator, Alert, TextInput, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { H1, H3, Muted } from "@/components/ui/typography";
import { supabase } from "@/config/supabase";
import { useSupabase } from "@/context/supabase-provider";
import { Tables } from "@/types/database";
import { convertAudioToMp3, processAudioWithAI } from "@/services/audioConversion";
import { Checkbox } from "@/components/ui/checkbox";
import DateTimePicker from '@react-native-community/datetimepicker';
import { FontAwesome } from "@expo/vector-icons";
import { ScrollView } from "react-native";
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';

// Define types
type Memo = Tables<"memos">;

interface Task {
  id: string;
  text: string;
  deadline: string;
  subtasks?: string[];
  isPriority?: boolean;
  isCompleted?: boolean;
}

// Enum to track the processing stages
enum ProcessingStage {
  IDLE = "idle",
  PROCESSING = "processing",
  COMPLETE = "complete",
  ERROR = "error"
}

// Add type for DateTimePicker event
type DateTimePickerEvent = {
  type: string;
  nativeEvent: {
    timestamp: number;
  };
};

export default function MemoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSupabase();
  
  // State
  const [memo, setMemo] = useState<Memo | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState<string>("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(ProcessingStage.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskText, setEditingTaskText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!user) {
      Alert.alert("Error", "Not signed in");
      router.back();
      return;
    }
    
    if (id) {
      fetchMemoDetails();
    } else {
      setIsLoading(false);
    }
  }, [id, user]);

  // Clean up sound object on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const fetchMemoDetails = async () => {
    try {
      setIsLoading(true);

      // Fetch memo data from Supabase
      const { data: memoData, error: memoError } = await supabase
        .from("memos")
        .select("*")
        .eq("id", id)
        .single();

      if (memoError) throw memoError;
      if (!memoData) throw new Error("Memo not found");

      // Check if memo belongs to current user
      if (memoData.user_id !== user?.id) {
        throw new Error("Unauthorized access");
      }

      setMemo(memoData);
      setTitle(memoData.title);

      // If memo has summary/transcription, set as complete
      if (memoData.summary || memoData.transcription) {
        setSummary(memoData.summary || "");
        setProcessingStage(ProcessingStage.COMPLETE);

        // Fetch associated tasks
        const { data: todoData, error: todoError } = await supabase
          .from("todos")
          .select("*")
          .eq("memo_id", memoData.id);

        if (!todoError && todoData) {
          const formattedTasks: Task[] = todoData.map(todo => ({
            id: todo.id,
            text: todo.title,
            deadline: todo.due_date || "No deadline",
            isPriority: false,
            isCompleted: todo.is_completed
          }));

          if (formattedTasks.length > 0) {
            formattedTasks[0].isPriority = true;
          }

          setTasks(formattedTasks);
        }
      } else if (memoData.storage_path) {
        // Start processing if not already processed
        processAudio(memoData);
      }
    } catch (error) {
      console.error("Error loading memo:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to load memo"
      );
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const processAudio = async (memo: Memo) => {
    if (processingStage === ProcessingStage.PROCESSING) {
      console.log("Already processing, skipping duplicate request");
      return;
    }

    try {
      console.log("Starting audio processing for memo:", memo.id);
      setProcessingStage(ProcessingStage.PROCESSING);

      if (!memo.storage_path) {
        throw new Error("Missing storage path for audio file");
      }

      // Step 1: Convert M4A to MP3
      console.log("Starting M4A to MP3 conversion...");
      setError(null);

      let mp3Path = "";
      try {
        mp3Path = await convertAudioToMp3(memo.storage_path);
        console.log("Conversion successful, MP3 path:", mp3Path);
      } catch (conversionError) {
        throw new Error(conversionError instanceof Error ? 
          `Audio conversion failed: ${conversionError.message}` : 
          "Failed to convert audio file");
      }

      // Step 2: Process with AI
      console.log("Starting AI processing...");
      const data = await processAudioWithAI(mp3Path);

      if (!data) {
        throw new Error("Empty response from AI processing");
      }

      // Step 3: Save results
      await handleProcessingResults(data, memo);
      
      console.log("Audio processing complete");
    } catch (error) {
      console.error("Error in audio processing:", error);
      setProcessingStage(ProcessingStage.ERROR);
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setError(errorMsg);
      Alert.alert("Processing Failed", errorMsg);
    }
  };

  const handleProcessingResults = async (data: any, memo: Memo) => {
    try {
      // Update memo with results
      const memoUpdate = {
        transcription: data.transcription || "",
        summary: data.summary || "",
        content: JSON.stringify({
          tasks: data.tasks,
          priority_focus: data.priority_focus,
          timestamp: data.timestamp
        })
      };

      const { error: updateError } = await supabase
        .from("memos")
        .update(memoUpdate)
        .eq("id", memo.id);

      if (updateError) throw updateError;

      // Create todos from tasks
      if (data.tasks?.length > 0) {
        const todosToInsert = data.tasks.map((task: Task) => ({
          user_id: user?.id,
          memo_id: memo.id,
          title: task.text,
          description: task.subtasks ? task.subtasks.join("\n- ") : "",
          due_date: new Date().toISOString(),
          is_completed: false,
        }));

        const { error: todosError } = await supabase
          .from("todos")
          .insert(todosToInsert);

        if (todosError) throw todosError;
      }

      // Update UI state
      setSummary(data.summary || "No summary available");
      setTasks(data.tasks || []);
      setProcessingStage(ProcessingStage.COMPLETE);

      Alert.alert("Success", "Voice memo processed successfully!");
    } catch (error) {
      console.error("Error saving results:", error);
      throw error;
    }
  };

  const handleSave = async () => {
    if (!memo?.id) return;

    try {
      const { error: updateError } = await supabase
        .from("memos")
        .update({ title })
        .eq("id", memo.id);

      if (updateError) throw updateError;

      Alert.alert("Success", "Memo saved successfully!");
      router.push('/(app)/(protected)/memos');
    } catch (error) {
      console.error("Error saving memo:", error);
      Alert.alert("Error", "Failed to save memo");
    }
  };

  const handleDelete = async () => {
    if (!memo?.id) return;

    Alert.alert(
      "Delete Memo",
      "Are you sure you want to delete this memo?",
      [
        { text: "Cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("memos")
                .delete()
                .eq("id", memo.id);

              if (error) throw error;
              router.push('/(app)/(protected)/memos');
            } catch (error) {
              console.error("Error deleting memo:", error);
              Alert.alert("Error", "Failed to delete memo");
            }
          }
        }
      ]
    );
  };

  const handleTaskCheck = async (taskId: string, isCompleted: boolean) => {
    try {
      // Update local state
      setTasks(tasks.map(task => 
        task.id === taskId ? { ...task, isCompleted } : task
      ));

      // Update in database
      const { error } = await supabase
        .from("todos")
        .update({ is_completed: isCompleted })
        .eq("id", taskId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating task completion:", error);
      Alert.alert("Error", "Failed to update task status");
    }
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskText(task.text);
  };

  const handleTaskSave = async (taskId: string) => {
    try {
      // Update local state
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, text: editingTaskText } : task
      ));

      // Update in database
      const { error } = await supabase
        .from("todos")
        .update({ title: editingTaskText })
        .eq("id", taskId);

      if (error) throw error;

      setEditingTaskId(null);
      setEditingTaskText("");
    } catch (error) {
      console.error("Error updating task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  const handleDateChange = async (taskId: string, date: Date) => {
    try {
      // Update local state
      setTasks(tasks.map(task =>
        task.id === taskId ? { ...task, deadline: date.toISOString() } : task
      ));

      // Update in database
      const { error } = await supabase
        .from("todos")
        .update({ due_date: date.toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      setShowDatePicker(false);
      setSelectedTaskId(null);
    } catch (error) {
      console.error("Error updating due date:", error);
      Alert.alert("Error", "Failed to update due date");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleBack = () => {
    router.back();
  };

  const playAudio = async () => {
    try {
      setIsLoadingAudio(true);

      if (!memo?.storage_path) {
        throw new Error('No audio file available');
      }

      // If already loaded, just toggle play/pause
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
          return;
        }
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });

      // Load and play the audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: memo.storage_path },
        { shouldPlay: true },
        (status) => {
          // Update playing state based on playback status
          if (status.isLoaded) {
            setIsPlaying(status.isPlaying);
            if (!status.isPlaying && status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        }
      );

      soundRef.current = sound;
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'Failed to play audio file');
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const stopAudio = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setIsPlaying(false);
      } catch (error) {
        console.error('Error stopping audio:', error);
      }
    }
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView className="flex-1 p-4">
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity onPress={handleBack} className="p-2">
            <FontAwesome name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <H1>{title}</H1>
          <View style={{ width: 32 }} />
        </View>

        {/* Audio Playback Controls */}
        <View className="flex-row items-center justify-center mb-6 bg-card p-4 rounded-lg">
          {isLoadingAudio ? (
            <ActivityIndicator size="large" color="#3b82f6" />
          ) : (
            <TouchableOpacity
              onPress={isPlaying ? stopAudio : playAudio}
              className="p-4 bg-primary rounded-full"
            >
              <FontAwesome
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="#fff"
              />
            </TouchableOpacity>
          )}
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
              <Text>{summary || "No summary available"}</Text>
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
                      <Checkbox
                        checked={task.isCompleted}
                        onCheckedChange={(checked: boolean) => handleTaskCheck(task.id, checked)}
                        className="mr-2"
                      />
                      
                      {editingTaskId === task.id ? (
                        <View className="flex-1 flex-row items-center">
                          <TextInput
                            value={editingTaskText}
                            onChangeText={setEditingTaskText}
                            className="flex-1 p-2 bg-background rounded border border-border"
                            autoFocus
                          />
                          <TouchableOpacity
                            onPress={() => handleTaskSave(task.id)}
                            className="ml-2 p-2"
                          >
                            <FontAwesome name="check" size={16} color="#22c55e" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setEditingTaskId(null)}
                            className="ml-2 p-2"
                          >
                            <FontAwesome name="times" size={16} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <View className="flex-1 flex-row items-center">
                          <Text 
                            className={`flex-1 font-medium ${task.isPriority ? 'text-primary' : ''} ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}
                          >
                            {task.text}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleTaskEdit(task)}
                            className="ml-2 p-2"
                          >
                            <FontAwesome name="pencil" size={16} color="#6b7280" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                    
                    <View className="ml-8 mt-1 flex-row items-center">
                      <TouchableOpacity 
                        onPress={() => {
                          setSelectedTaskId(task.id);
                          setShowDatePicker(true);
                        }}
                        className="flex-row items-center"
                      >
                        <FontAwesome name="calendar" size={12} color="#6b7280" className="mr-1" />
                        <Muted>Due: {formatDate(task.deadline)}</Muted>
                      </TouchableOpacity>
                    </View>

                    {showDatePicker && selectedTaskId === task.id && (
                      <DateTimePicker
                        value={new Date(task.deadline)}
                        mode="date"
                        display="default"
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                          if (event.type === 'set' && date) {
                            handleDateChange(task.id, date);
                          }
                          setShowDatePicker(false);
                        }}
                      />
                    )}
                    
                    {task.subtasks && Array.isArray(task.subtasks) && task.subtasks.length > 0 && (
                      <View className="ml-8 mt-2">
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

            <View className="bg-card rounded-lg p-4 mb-6">
              <H3 className="mb-2">Transcription</H3>
              <Text numberOfLines={3} ellipsizeMode="tail">
                {memo?.transcription || "No transcription available"}
              </Text>
            </View>
          </>
        )}

        <Button
          className="mt-4 mb-4"
          onPress={handleSave}
          disabled={processingStage !== ProcessingStage.COMPLETE}
        >
          <Text>Save Note</Text>
        </Button>

        {memo && (
          <Button
            variant="destructive"
            className="mb-8"
            onPress={handleDelete}
          >
            <Text>Delete Memo</Text>
          </Button>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
