import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { Text } from "@/components/ui/text";
import { router, usePathname } from "expo-router";
import { colors } from "@/constants/colors";
import { useColorScheme } from "@/lib/useColorScheme";

interface TabItem {
  name: string;
  label: string;
  icon: keyof typeof FontAwesome.glyphMap;
  path: string;
}

export default function BottomTabs() {
  const { colorScheme } = useColorScheme();
  const currentPath = usePathname();
  
  const tabs: TabItem[] = [
    {
      name: "home",
      label: "Home",
      icon: "home",
      path: "/(app)/(protected)"
    },
    {
      name: "memos",
      label: "Memos",
      icon: "list",
      path: "/(app)/(protected)/memos"
    },
    {
      name: "settings",
      label: "Settings",
      icon: "gear",
      path: "/(app)/(protected)/settings"
    }
  ];
  
  const isActive = (path: string): boolean => {
    return currentPath === path;
  };
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: colorScheme === 'dark' 
          ? colors.dark.background 
          : colors.light.background,
        borderTopColor: colorScheme === 'dark' 
          ? colors.dark.border 
          : colors.light.border
      }
    ]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.name}
          style={styles.tab}
          onPress={() => router.push(tab.path)}
        >
          <FontAwesome
            name={tab.icon}
            size={24}
            color={isActive(tab.path) 
              ? (colorScheme === 'dark' ? colors.dark.foreground : colors.light.foreground)
              : (colorScheme === 'dark' ? colors.dark.mutedForeground : colors.light.mutedForeground)
            }
          />
          <Text
            style={[
              styles.label,
              {
                color: isActive(tab.path)
                  ? (colorScheme === 'dark' ? colors.dark.foreground : colors.light.foreground)
                  : (colorScheme === 'dark' ? colors.dark.mutedForeground : colors.light.mutedForeground)
              }
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
  }
});
