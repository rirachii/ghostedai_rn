import React from "react";
import { View, FlatList } from "react-native";
import { SafeAreaView } from "@/components/safe-area-view";
import { H1, Muted } from "@/components/ui/typography";
import { Text } from "@/components/ui/text";

// Mock data for memo list
interface Memo {
  id: string;
  title: string;
  date: string;
  summary: string;
}

const MOCK_MEMOS = [
  {
    id: '1',
    title: 'Interview preparation',
    date: '2023-11-15',
    summary: 'Prepare for Google technical interview, practice algorithms and system design.',
  },
  {
    id: '2',
    title: 'Follow-up with recruiters',
    date: '2023-11-10',
    summary: 'Send follow-up emails to Amazon and Microsoft recruiters by Friday.',
  },
  {
    id: '3',
    title: 'Portfolio updates',
    date: '2023-11-05',
    summary: 'Update GitHub portfolio with recent projects and improve resume.',
  },
];

export default function MemosScreen() {
  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center p-4">
      <View className="w-20 h-20 rounded-full bg-muted mb-4 items-center justify-center">
        <Text className="text-2xl">📝</Text>
      </View>
      <Text className="text-xl font-medium text-center mb-2">No Memos Yet</Text>
      <Muted className="text-center">
        Your voice memos will appear here after you record them
      </Muted>
    </View>
  );

  const renderMemoItem = ({ item }: { item: Memo }) => (
    <View className="bg-card rounded-lg p-4 mb-4">
      <Text className="text-lg font-medium">{item.title}</Text>
      <Text className="text-xs text-muted-foreground mb-2">{item.date}</Text>
      <Muted>{item.summary}</Muted>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="p-4">
        <H1 className="mb-6">Your Memos</H1>
        
        <FlatList
          data={MOCK_MEMOS}
          keyExtractor={(item) => item.id}
          renderItem={renderMemoItem}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={{ 
            flexGrow: 1, 
            paddingBottom: 20
          }}
        />
      </View>
    </SafeAreaView>
  );
}
