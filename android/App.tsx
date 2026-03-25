import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

import FicheScreen from './src/screens/FicheScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// ─── Navigation types ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Fiche: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Fiche"
            screenOptions={{
              // All headers are rendered inside each screen for full control
              headerShown: false,
              // Slide transition for Settings screen
              cardStyleInterpolator: ({ current, layouts }) => ({
                cardStyle: {
                  transform: [
                    {
                      translateY: current.progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [layouts.screen.height, 0],
                      }),
                    },
                  ],
                },
              }),
            }}
          >
            <Stack.Screen name="Fiche" component={FicheScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
