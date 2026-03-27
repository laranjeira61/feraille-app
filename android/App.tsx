import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import FicheScreen from './src/screens/FicheScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type Screen = 'Fiche' | 'Settings';

export default function App() {
  const [screen, setScreen] = useState<Screen>('Fiche');

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />
      {screen === 'Settings' ? (
        <SettingsScreen onBack={() => setScreen('Fiche')} />
      ) : (
        <FicheScreen onOpenSettings={() => setScreen('Settings')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
