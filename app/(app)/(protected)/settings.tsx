import React, { useState } from "react";
import { View, ScrollView, Switch, Alert } from "react-native";
import { SafeAreaView } from "@/components/safe-area-view";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { H1, H3, Muted } from "@/components/ui/typography";
import { useSupabase } from "@/context/supabase-provider";

export default function SettingsScreen() {
  const { user, signOut } = useSupabase();
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      // Navigation is handled by the auth context
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "An unknown error occurred");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-background">
      <ScrollView className="flex-1 px-4">
        <View className="py-4">
          <H1>Settings</H1>
        </View>

        {/* User Profile Section */}
        <View className="bg-card rounded-lg p-4 mb-6">
          <H3 className="mb-2">Account</H3>
          <Text className="text-foreground">{user?.email}</Text>
          <Text className="text-muted-foreground text-sm mb-4">
            {user?.id ? `User ID: ${user.id.substring(0, 8)}...` : ""}
          </Text>
          <Button
            variant="destructive"
            onPress={handleSignOut}
            className="w-full"
            disabled={isLoading}
          >
            <Text>{isLoading ? "Signing out..." : "Sign Out"}</Text>
          </Button>
        </View>

        {/* App Preferences */}
        <View className="bg-card rounded-lg p-4 mb-6">
          <H3 className="mb-4">Preferences</H3>
          
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-foreground">Dark Mode</Text>
              <Muted>Switch between light and dark theme</Muted>
            </View>
            <Switch
              value={darkMode}
              onValueChange={() => setDarkMode(!darkMode)}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
            />
          </View>
          
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-foreground">Notifications</Text>
              <Muted>Get notified about task deadlines</Muted>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={() => setNotificationsEnabled(!notificationsEnabled)}
              trackColor={{ false: "#767577", true: "#81b0ff" }}
            />
          </View>
        </View>

        {/* About App */}
        <View className="bg-card rounded-lg p-4 mb-6">
          <H3 className="mb-2">About</H3>
          <Text className="mb-4">
            Ghosted AI helps job seekers stay organized by recording voice memos and extracting tasks automatically.
          </Text>

        </View>

        {/* App Info */}
        <View className="items-center pb-8">
          <Text className="text-muted-foreground text-sm">
            Ghosted AI © {new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
