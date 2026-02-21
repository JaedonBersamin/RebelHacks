import { Tabs } from "expo-router";
import React from "react";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ tabBarStyle: { display: "none" }, headerShown: false }}
    >
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
