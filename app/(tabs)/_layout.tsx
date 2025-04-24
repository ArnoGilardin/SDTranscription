import { Tabs } from 'expo-router';
import { Mic, FileText, Library, Settings, Brain } from 'lucide-react-native';
import { Platform } from 'react-native';

function TabBarIcon({ name: Icon, color }: { name: any, color: string }) {
  return <Icon size={24} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1A1A1A',
          borderTopWidth: 1,
          borderTopColor: '#2A2A2A',
          height: 65,
          paddingBottom: Platform.OS === 'ios' ? 24 : 12,
          paddingTop: 12,
        },
        tabBarActiveTintColor: '#EF4444',
        tabBarInactiveTintColor: '#E5E7EB',
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingTop: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Enregistrer',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name={Mic} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="transcripts"
        options={{
          title: 'Transcriptions',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name={FileText} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="summary"
        options={{
          title: 'Résumé',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name={Brain} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Bibliothèque',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name={Library} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Paramètres',
          tabBarIcon: ({ color }) => (
            <TabBarIcon name={Settings} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}