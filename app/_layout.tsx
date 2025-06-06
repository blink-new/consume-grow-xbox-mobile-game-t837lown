import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { Gamepad2, TrendingUp, Trophy } from 'lucide-react-native';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0E1021',
            borderTopColor: '#1E293B',
            borderTopWidth: 1,
            height: 80,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#00D4AA',
          tabBarInactiveTintColor: '#64748B',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Play',
            tabBarIcon: ({ color, size }) => (
              <Gamepad2 color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="upgrades"
          options={{
            title: 'Upgrades',
            tabBarIcon: ({ color, size }) => (
              <TrendingUp color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color, size }) => (
              <Trophy color={color} size={size} />
            ),
          }}
        />
      </Tabs>
      <StatusBar style="light" />
    </>
  );
}