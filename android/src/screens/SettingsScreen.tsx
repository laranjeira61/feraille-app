import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { getApiUrl, saveApiUrl, checkVersion, getTabletName, saveTabletName } from '../services/api';

// ─── Component ────────────────────────────────────────────────────────────────

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [apiUrl, setApiUrl] = useState('');
  const [tabletName, setTabletName] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Load stored settings on mount
  useEffect(() => {
    getApiUrl().then((url) => setApiUrl(url));
    getTabletName().then((name) => setTabletName(name));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!apiUrl.trim()) {
      Alert.alert(
        'URL manquante',
        "Veuillez entrer l'URL de base de l'API (ex: http://192.168.1.10:3000)"
      );
      return;
    }
    setSaving(true);
    try {
      await saveApiUrl(apiUrl.trim());
      await saveTabletName(tabletName.trim());
      setTestResult(null);
      Alert.alert('Enregistré', 'Les paramètres ont été sauvegardés.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Erreur', 'Impossible de sauvegarder les paramètres.');
    } finally {
      setSaving(false);
    }
  }, [apiUrl, tabletName, navigation]);

  // ── Test connection ────────────────────────────────────────────────────────

  const handleTest = useCallback(async () => {
    if (!apiUrl.trim()) {
      Alert.alert('URL manquante', 'Entrez une URL avant de tester.');
      return;
    }
    // Temporarily save so getClient() uses the typed URL
    await saveApiUrl(apiUrl.trim());
    setTesting(true);
    setTestResult(null);
    try {
      const version = await checkVersion();
      setTestResult({
        ok: true,
        message: `Connexion réussie — version API : ${version}`,
      });
    } catch (err: any) {
      const url = apiUrl.trim().startsWith('http') ? apiUrl.trim() : 'http://' + apiUrl.trim();
      const msg = (err?.message ?? 'Impossible de joindre le serveur.') + `\n→ URL testée : ${url}/api/version`;
      setTestResult({ ok: false, message: msg });
    } finally {
      setTesting(false);
    }
  }, [apiUrl]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView style={styles.root} behavior="padding">
      <StatusBar style="light" />

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Configuration API</Text>
          <Text style={styles.description}>
            Entrez l'adresse IP et le port du serveur backend.{'\n'}
            Exemple : <Text style={styles.codeExample}>http://192.168.1.10:3000</Text>
          </Text>

          {/* Tablet name input */}
          <Text style={styles.label}>Nom de cette tablette</Text>
          <TextInput
            style={styles.input}
            value={tabletName}
            onChangeText={setTabletName}
            placeholder="Ex : Tablette 1, Atelier A..."
            placeholderTextColor="#bbb"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="next"
          />

          {/* URL input */}
          <Text style={styles.label}>URL de base de l'API</Text>
          <TextInput
            style={styles.input}
            value={apiUrl}
            onChangeText={(text) => {
              setApiUrl(text);
              setTestResult(null);
            }}
            placeholder="http://192.168.1.x:3000"
            placeholderTextColor="#bbb"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          {/* Test result banner */}
          {testResult && (
            <View
              style={[
                styles.testResultBanner,
                testResult.ok
                  ? styles.testResultOk
                  : styles.testResultError,
              ]}
            >
              <Text style={styles.testResultText}>
                {testResult.ok ? '✓  ' : '✕  '}
                {testResult.message}
              </Text>
            </View>
          )}

          {/* Buttons row */}
          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonTest]}
              onPress={handleTest}
              disabled={testing}
              activeOpacity={0.8}
            >
              {testing ? (
                <ActivityIndicator color="#1a1a2e" />
              ) : (
                <Text style={styles.buttonTestText}>Tester la connexion</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonSave]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonSaveText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️  Comment accéder à ces paramètres</Text>
          <Text style={styles.infoText}>
            Appuyez longuement (2 secondes) sur le titre{' '}
            <Text style={styles.infoCode}>TicketPro</Text> dans la barre d'en-tête
            de l'écran principal.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SettingsScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 24,
    paddingVertical: 16,
    minHeight: 70,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 56,
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButtonPlaceholder: {
    width: 100,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },

  // Body
  body: {
    padding: 32,
    gap: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#555',
    lineHeight: 24,
    marginBottom: 24,
  },
  codeExample: {
    fontFamily: 'monospace',
    backgroundColor: '#f0f2f5',
    color: '#1a1a2e',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  input: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 20,
    color: '#1a1a2e',
    backgroundColor: '#fafafa',
    minHeight: 60,
    marginBottom: 16,
    fontFamily: 'monospace',
  },

  // Test result
  testResultBanner: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  testResultOk: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#2e7d32',
  },
  testResultError: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#c62828',
  },
  testResultText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 22,
  },

  // Buttons
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  button: {
    flex: 1,
    minHeight: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
  },
  buttonTest: {
    backgroundColor: '#e8eaf6',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  buttonTestText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  buttonSave: {
    backgroundColor: '#2e7d32',
  },
  buttonSaveText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Info box
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#1565c0',
  },
  infoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1565c0',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
  },
  infoCode: {
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});
