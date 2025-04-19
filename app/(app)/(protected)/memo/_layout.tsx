import { Stack } from "expo-router";

export default function MemoLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false,
          presentation: "card"
        }}
      />
    </Stack>
  );
}
