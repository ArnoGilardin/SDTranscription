import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins';
import { View, Platform } from 'react-native';
import { LanguageProvider } from '@/contexts/LanguageContext';

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Poppins-SemiBold': Poppins_600SemiBold,
  });

  useEffect(() => {
    // Prevent build issues with console warnings
    if (__DEV__) {
      // Suppress non-critical warnings during development
      const originalWarn = console.warn;
      console.warn = (...args) => {
        if (
          typeof args[0] === 'string' &&
          (args[0].includes('VirtualizedLists') ||
           args[0].includes('componentWillReceiveProps') ||
           args[0].includes('componentWillMount'))
        ) {
          return;
        }
        originalWarn(...args);
      };
    }
  }, []);
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: '#0D0D0D' }} />;
  }

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" options={{ title: 'Oops!' }} />
      </Stack>
      <StatusBar style="light" />
    </LanguageProvider>
  );
}