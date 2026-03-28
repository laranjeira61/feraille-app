import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import DrawingCanvas, { DrawingCanvasRef } from '../components/DrawingCanvas';
import EmployeePicker from '../components/EmployeePicker';
import ConfirmModal, { ModalType } from '../components/ConfirmModal';
import { getEmployes, createFiche, getApiUrl, Employe } from '../services/api';
import { formatDateLong, formatTime } from '../utils/date';

// ─── Component ────────────────────────────────────────────────────────────────

const FicheScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Clock state ────────────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState<string>(formatTime());
  const today = formatDateLong(); // static — won't change during session

  // ── API & employees state ──────────────────────────────────────────────────
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loadingEmployes, setLoadingEmployes] = useState(false);
  const [errorEmployes, setErrorEmployes] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(true);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);
  const [client, setClient] = useState('');
  const [drawingData, setDrawingData] = useState<string>('');


  // ── Submission state ───────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalMessage, setModalMessage] = useState('');

  // ── Title long-press (access Settings) ────────────────────────────────────
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Clock ticker ───────────────────────────────────────────────────────────
  useEffect(() => {
    clockRef.current = setInterval(() => {
      setCurrentTime(formatTime());
    }, 1000);
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
    };
  }, []);

  // ── Check API config & load employees when screen is focused ───────────────
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const url = await getApiUrl();
        if (!url) {
          setApiConfigured(false);
          setErrorEmployes(true);
          return;
        }
        setApiConfigured(true);
        loadEmployes();
      };
      init();
    }, [])
  );

  const loadEmployes = async () => {
    setLoadingEmployes(true);
    setErrorEmployes(false);
    try {
      const data = await getEmployes();
      setEmployes(data);
    } catch {
      setErrorEmployes(true);
    } finally {
      setLoadingEmployes(false);
    }
  };

  // ── Form reset ─────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setSelectedEmploye(null);
    setClient('');
    setDrawingData('');
    canvasRef.current?.clear();
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!apiConfigured) {
      Alert.alert(
        'API non configurée',
        'Appuyez longuement sur "TicketPro" pour accéder aux paramètres.'
      );
      return;
    }
    if (!selectedEmploye) {
      Alert.alert('Employé manquant', 'Veuillez sélectionner un employé.');
      return;
    }
    if (!client.trim()) {
      Alert.alert('Client manquant', 'Veuillez entrer le nom du client.');
      return;
    }

    // Trigger canvas read to get latest drawing
    canvasRef.current?.readSignature();

    setSubmitting(true);
    try {
      await createFiche({
        employe_id: selectedEmploye.id,
        employe_nom: selectedEmploye.nom,
        client: client.trim(),
        notes_dessin: drawingData,
        source: 'TicketPro',
      });

      // Success
      setModalType('success');
      setModalMessage(
        `Fiche pour ${client.trim()} enregistrée avec succès.`
      );
      setModalVisible(true);

      // Auto-reset after 3 seconds
      setTimeout(() => {
        setModalVisible(false);
        resetForm();
      }, 3000);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        err?.message ??
        'Une erreur est survenue. Vérifiez la connexion au serveur.';
      setModalType('error');
      setModalMessage(message);
      setModalVisible(true);
    } finally {
      setSubmitting(false);
    }
  }, [apiConfigured, selectedEmploye, client, drawingData, resetForm]);

  // ── Title long-press handlers ──────────────────────────────────────────────
  const handleTitlePressIn = () => {
    longPressTimer.current = setTimeout(() => {
      navigation.navigate('Settings');
    }, 2000);
  };
  const handleTitlePressOut = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />

      {/* ════════════════════════════════════════════════════════════════════
          HEADER BAR
      ════════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        {/* App title — long press opens Settings */}
        <TouchableOpacity
          onPressIn={handleTitlePressIn}
          onPressOut={handleTitlePressOut}
          activeOpacity={1}
          style={styles.titleTouchable}
        >
          <Text style={styles.headerTitle}>TicketPro</Text>
        </TouchableOpacity>

        {/* Date & clock */}
        <View style={styles.headerRight}>
          <Text style={styles.headerDate}>{today}</Text>
          <Text style={styles.headerClock}>{currentTime}</Text>
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════════
          API NOT CONFIGURED BANNER
      ════════════════════════════════════════════════════════════════════ */}
      {!apiConfigured && (
        <View style={styles.noBanner}>
          <Text style={styles.noBannerText}>
            ⚠️  API non configurée — appuyez longuement sur{' '}
            <Text style={styles.noBannerBold}>TicketPro</Text> pour accéder aux
            paramètres.
          </Text>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT  (Left form  +  Right canvas)
      ════════════════════════════════════════════════════════════════════ */}
      <View style={styles.content}>
        {/* ── LEFT: Form ─────────────────────────────────────────────────── */}
        <ScrollView
          style={styles.formPanel}
          contentContainerStyle={styles.formPanelContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Employee */}
          <Text style={styles.fieldLabel}>Employé</Text>
          <EmployeePicker
            employes={employes}
            selectedId={selectedEmploye?.id ?? null}
            onSelect={setSelectedEmploye}
            loading={loadingEmployes}
            error={errorEmployes}
          />

          {/* Reload employees button */}
          {errorEmployes && apiConfigured && (
            <TouchableOpacity
              style={styles.retryButton}
              onPress={loadEmployes}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>↻  Recharger les employés</Text>
            </TouchableOpacity>
          )}

          <View style={styles.fieldSpacer} />

          {/* Client */}
          <Text style={styles.fieldLabel}>Client</Text>
          <TextInput
            style={styles.clientInput}
            value={client}
            onChangeText={setClient}
            placeholder="Nom du client…"
            placeholderTextColor="#bbb"
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View style={styles.formButtonsSpacer} />

          {/* Submit button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              submitting && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Text style={styles.submitButtonText}>ENVOYER LA FICHE</Text>
            )}
          </TouchableOpacity>

          <View style={styles.fieldSpacer} />

          {/* New fiche / reset button */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => {
              Alert.alert(
                'Nouvelle fiche',
                'Effacer le formulaire et recommencer ?',
                [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Effacer', style: 'destructive', onPress: resetForm },
                ]
              );
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.resetButtonText}>Nouvelle fiche</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── RIGHT: Drawing canvas ────────────────────────────────────── */}
        <View style={styles.canvasPanel}>
          <View style={styles.canvasHeader}>
            <Text style={styles.fieldLabel}>Notes (écrire au doigt)</Text>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                canvasRef.current?.clear();
                setDrawingData('');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.clearButtonText}>Effacer tout</Text>
            </TouchableOpacity>
          </View>

          <DrawingCanvas
            ref={canvasRef}
            onSave={(data) => setDrawingData(data)}
            onEmpty={() => setDrawingData('')}
          />
        </View>
      </View>

      {/* ════════════════════════════════════════════════════════════════════
          CONFIRM MODAL
      ════════════════════════════════════════════════════════════════════ */}
      <ConfirmModal
        visible={modalVisible}
        type={modalType}
        message={modalMessage}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
};

export default FicheScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 28,
    paddingVertical: 0,
    height: 70,
  },
  titleTouchable: {
    paddingVertical: 10,
    paddingRight: 20,
    minHeight: 56,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
  headerLogo: {
    height: 44,
    width: 160,
    resizeMode: 'contain',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerDate: {
    color: '#c0c8e8',
    fontSize: 17,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  headerClock: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },

  // ── No API banner ────────────────────────────────────────────────────────
  noBanner: {
    backgroundColor: '#fff3cd',
    borderBottomWidth: 2,
    borderBottomColor: '#ffc107',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  noBannerText: {
    fontSize: 16,
    color: '#856404',
  },
  noBannerBold: {
    fontWeight: '700',
  },

  // ── Main layout ──────────────────────────────────────────────────────────
  content: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── Form panel (left ~27%) ───────────────────────────────────────────────
  formPanel: {
    width: '27%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  formPanelContent: {
    padding: 12,
    flexGrow: 1,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldSpacer: {
    height: 12,
  },
  formButtonsSpacer: {
    flex: 1,
    minHeight: 24,
  },

  clientInput: {
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    fontSize: 22,
    color: '#1a1a2e',
    backgroundColor: '#fafafa',
    minHeight: 64,
  },

  retryButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#e8eaf6',
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    fontSize: 16,
    color: '#1a1a2e',
    fontWeight: '600',
  },

  // Submit
  submitButton: {
    backgroundColor: '#2e7d32',
    borderRadius: 14,
    minHeight: 70,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2e7d32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonDisabled: {
    backgroundColor: '#81c784',
    elevation: 0,
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1.5,
  },

  // Reset
  resetButton: {
    borderWidth: 2,
    borderColor: '#bbb',
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  resetButtonText: {
    color: '#555',
    fontSize: 18,
    fontWeight: '600',
  },

  // ── Canvas panel (right ~60%) ────────────────────────────────────────────
  canvasPanel: {
    flex: 1,
    backgroundColor: '#f7f8fa',
    padding: 20,
    flexDirection: 'column',
  },
  canvasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  clearButton: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
  },
});
