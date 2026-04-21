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
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import DrawingCanvas, { DrawingCanvasRef } from '../components/DrawingCanvas';
import EmployeePicker from '../components/EmployeePicker';
import ConfirmModal, { ModalType } from '../components/ConfirmModal';
import { getEmployes, createFiche, getApiUrl, getTabletName, Employe } from '../services/api';
import { formatDateLong, formatTime } from '../utils/date';

// ─── Component ────────────────────────────────────────────────────────────────

const FicheScreen: React.FC = () => {
  useKeepAwake();
  const navigation = useNavigation<any>();
  const canvasRef = useRef<DrawingCanvasRef>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPageRef = useRef(0);
  // Stable initial dataURL — only updates on page change, not on every stroke save
  const canvasInitialDataRef = useRef('');
  const lastKnownPageRef = useRef(-1);

  // ── Clock state ────────────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState<string>(formatTime());
  const today = formatDateLong();

  // ── API & employees state ──────────────────────────────────────────────────
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [loadingEmployes, setLoadingEmployes] = useState(false);
  const [errorEmployes, setErrorEmployes] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(true);
  const [tabletName, setTabletName] = useState('Tablette');

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null);
  const [client, setClient] = useState('');
  const [typeFiche, setTypeFiche] = useState<'FACTURE' | 'PROJET'>('FACTURE');

  // ── Drawing pages ──────────────────────────────────────────────────────────
  const [drawingPages, setDrawingPages] = useState<string[]>(['']);
  const [currentPage, setCurrentPage] = useState(0);
  const [eraseMode, setEraseMode] = useState(false);

  // ── Submission state ───────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalMessage, setModalMessage] = useState('');

  // ── Title long-press (access Settings) ────────────────────────────────────
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Clock ticker ───────────────────────────────────────────────────────────
  useEffect(() => {
    clockRef.current = setInterval(() => setCurrentTime(formatTime()), 1000);
    return () => { if (clockRef.current) clearInterval(clockRef.current); };
  }, []);

  // Keep ref in sync with state (avoids stale closures in callbacks)
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  // ── Check API config & load employees when screen is focused ───────────────
  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        const url = await getApiUrl();
        if (!url) { setApiConfigured(false); setErrorEmployes(true); return; }
        setApiConfigured(true);
        const name = await getTabletName();
        setTabletName(name.trim() || 'Tablette');
        loadEmployes();
      };
      init();
    }, [])
  );

  const loadEmployes = async () => {
    setLoadingEmployes(true);
    setErrorEmployes(false);
    try {
      setEmployes(await getEmployes());
    } catch {
      setErrorEmployes(true);
    } finally {
      setLoadingEmployes(false);
    }
  };

  // ── Drawing page handlers ──────────────────────────────────────────────────

  const handleCanvasSave = useCallback((data: string) => {
    setDrawingPages(prev => {
      const updated = [...prev];
      updated[currentPageRef.current] = data;
      return updated;
    });
  }, []);

  const handleCanvasEmpty = useCallback(() => {
    setDrawingPages(prev => {
      const updated = [...prev];
      updated[currentPageRef.current] = '';
      return updated;
    });
  }, []);

  const addPage = useCallback(() => {
    setDrawingPages(prev => [...prev, '']);
    setCurrentPage(prev => prev + 1);
    // canvas remounts via key change — no need to call clear()
  }, []);

  const goToPrevPage = useCallback(() => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => prev + 1);
  }, []);

  // ── Form reset ─────────────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setSelectedEmploye(null);
    setClient('');
    setTypeFiche('FACTURE');
    setDrawingPages(['']);
    setCurrentPage(0);
    currentPageRef.current = 0;
    canvasRef.current?.clear();
  }, []);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!apiConfigured) {
      Alert.alert('API non configurée', 'Appuyez longuement sur "TicketPro" pour accéder aux paramètres.');
      return;
    }
    if (!selectedEmploye) {
      Alert.alert('Agent manquant', 'Veuillez sélectionner un agent.');
      return;
    }
    if (!client.trim()) {
      Alert.alert('Client manquant', 'Veuillez entrer le nom du client.');
      return;
    }

    canvasRef.current?.readSignature();
    setSubmitting(true);
    try {
      await createFiche({
        date: new Date().toISOString().split('T')[0],
        employe_id: selectedEmploye.id,
        employe_nom: selectedEmploye.nom,
        client: client.trim(),
        notes_dessin: JSON.stringify(drawingPages),
        source: tabletName,
        type_fiche: typeFiche,
      });

      setModalType('success');
      setModalMessage(`Fiche pour ${client.trim()} enregistrée avec succès.`);
      setModalVisible(true);
      setTimeout(() => { setModalVisible(false); resetForm(); }, 3000);
    } catch (err: any) {
      const message = err?.response?.data?.message ?? err?.message ?? 'Une erreur est survenue.';
      setModalType('error');
      setModalMessage(message);
      setModalVisible(true);
    } finally {
      setSubmitting(false);
    }
  }, [apiConfigured, selectedEmploye, client, drawingPages, resetForm]);

  // ── Title long-press handlers ──────────────────────────────────────────────
  const handleTitlePressIn = () => {
    longPressTimer.current = setTimeout(() => navigation.navigate('Settings'), 2000);
  };
  const handleTitlePressOut = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const isLastPage = currentPage === drawingPages.length - 1;

  // Synchronously update canvasInitialDataRef when page changes (not during drawing)
  if (lastKnownPageRef.current !== currentPage) {
    lastKnownPageRef.current = currentPage;
    canvasInitialDataRef.current = drawingPages[currentPage] || '';
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden />

      {/* ════════════════════════════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPressIn={handleTitlePressIn}
          onPressOut={handleTitlePressOut}
          activeOpacity={1}
          style={styles.titleTouchable}
        >
          <Text style={styles.headerTitle}>TicketPro</Text>
        </TouchableOpacity>
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
            <Text style={styles.noBannerBold}>TicketPro</Text> pour accéder aux paramètres.
          </Text>
        </View>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT  (Left form  +  Right canvas)
      ════════════════════════════════════════════════════════════════════ */}
      <View style={styles.content}>

        {/* ── LEFT: Form panel ─────────────────────────────────────────── */}
        {/* Outer View handles flex sizing; ScrollView fills it */}
        <View style={styles.formPanelWrapper}>
          <ScrollView
            style={styles.formPanel}
            contentContainerStyle={styles.formPanelContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Agent */}
            <Text style={styles.fieldLabel}>Agent</Text>
            <EmployeePicker
              employes={employes}
              selectedId={selectedEmploye?.id ?? null}
              onSelect={setSelectedEmploye}
              loading={loadingEmployes}
              error={errorEmployes}
            />

            {errorEmployes && apiConfigured && (
              <TouchableOpacity style={styles.retryButton} onPress={loadEmployes} activeOpacity={0.8}>
                <Text style={styles.retryButtonText}>↻  Recharger les agents</Text>
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

            <View style={styles.fieldSpacer} />

            {/* Type de fiche */}
            <Text style={styles.fieldLabel}>Type de fiche</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, typeFiche === 'FACTURE' && styles.typeBtnActive]}
                onPress={() => setTypeFiche('FACTURE')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, typeFiche === 'FACTURE' && styles.typeBtnTextActive]}>
                  Facture
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, typeFiche === 'PROJET' && styles.typeBtnActive]}
                onPress={() => setTypeFiche('PROJET')}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeBtnText, typeFiche === 'PROJET' && styles.typeBtnTextActive]}>
                  Projet
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formButtonsSpacer} />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitButton, (!selectedEmploye || submitting) && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={!selectedEmploye || submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Text style={styles.submitButtonText}>ENVOYER LA FICHE</Text>
              )}
            </TouchableOpacity>

            <View style={styles.fieldSpacer} />

            {/* Reset */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                Alert.alert('Nouvelle fiche', 'Effacer le formulaire et recommencer ?', [
                  { text: 'Annuler', style: 'cancel' },
                  { text: 'Effacer', style: 'destructive', onPress: resetForm },
                ]);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.resetButtonText}>Nouvelle fiche</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ── RIGHT: Drawing canvas ────────────────────────────────────── */}
        <View style={styles.canvasPanel}>

          {/* Canvas header: label + controls */}
          <View style={styles.canvasHeader}>
            <Text style={styles.fieldLabel}>Notes (écrire au doigt)</Text>

            <View style={styles.canvasControls}>
              {/* Page navigation — only shown when > 1 page */}
              {drawingPages.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.pageNavBtn, currentPage === 0 && styles.pageNavBtnDisabled]}
                    onPress={goToPrevPage}
                    disabled={currentPage === 0}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pageNavText}>‹</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageLabel}>
                    Page {currentPage + 1} / {drawingPages.length}
                  </Text>
                  <TouchableOpacity
                    style={[styles.pageNavBtn, isLastPage && styles.pageNavBtnDisabled]}
                    onPress={goToNextPage}
                    disabled={isLastPage}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.pageNavText}>›</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Add page — only on active last page */}
              {isLastPage && (
                <TouchableOpacity style={styles.addPageBtn} onPress={addPage} activeOpacity={0.8}>
                  <Text style={styles.addPageBtnText}>+ Page</Text>
                </TouchableOpacity>
              )}

              {/* Eraser toggle — only on active last page */}
              {isLastPage && (
                <TouchableOpacity
                  style={[styles.clearButton, eraseMode && styles.eraseModeActive]}
                  onPress={() => {
                    const next = !eraseMode;
                    setEraseMode(next);
                    canvasRef.current?.setEraseMode(next);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.clearButtonText, eraseMode && styles.eraseModeActiveText]}>
                    {eraseMode ? '✏️ Stylo' : '🧹 Gomme'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Clear — only on active last page */}
              {isLastPage && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => { canvasRef.current?.clear(); handleCanvasEmpty(); setEraseMode(false); canvasRef.current?.setEraseMode(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.clearButtonText}>Effacer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Active last page: editable canvas */}
          {isLastPage ? (
            <DrawingCanvas
              key={`canvas-page-${currentPage}`}
              ref={canvasRef}
              onSave={handleCanvasSave}
              onEmpty={handleCanvasEmpty}
              dataURL={canvasInitialDataRef.current}
              disabled={!selectedEmploye}
            />
          ) : (
            /* Previous pages: read-only image */
            <View style={styles.savedPageContainer}>
              {drawingPages[currentPage] ? (
                <Image
                  source={{ uri: drawingPages[currentPage] }}
                  style={styles.savedPageImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={styles.emptyPageText}>Page vide</Text>
              )}
              <View style={styles.readOnlyBadge}>
                <Text style={styles.readOnlyText}>
                  Lecture seule — appuyez sur › pour revenir au dessin
                </Text>
              </View>
            </View>
          )}
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
  headerRight: { alignItems: 'flex-end' },
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
  noBannerText: { fontSize: 16, color: '#856404' },
  noBannerBold: { fontWeight: '700' },

  // ── Main layout ──────────────────────────────────────────────────────────
  content: {
    flex: 1,
    flexDirection: 'row',
  },

  // ── Form panel (left ~28%) — outer View handles flex; ScrollView fills ──
  formPanelWrapper: {
    flex: 28,
  },
  formPanel: {
    flex: 1,
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
  fieldSpacer: { height: 12 },
  formButtonsSpacer: { flex: 1, minHeight: 24 },

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
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  typeBtnActive: {
    borderColor: '#1a1a2e',
    backgroundColor: '#1a1a2e',
  },
  typeBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
  },
  typeBtnTextActive: {
    color: '#fff',
  },
  retryButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#e8eaf6',
    alignSelf: 'flex-start',
  },
  retryButtonText: { fontSize: 16, color: '#1a1a2e', fontWeight: '600' },

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
  submitButtonDisabled: { backgroundColor: '#81c784', elevation: 0, shadowOpacity: 0 },
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
  resetButtonText: { color: '#555', fontSize: 18, fontWeight: '600' },

  // ── Canvas panel (right ~72%) ────────────────────────────────────────────
  canvasPanel: {
    flex: 72,
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
  canvasControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Page navigation buttons
  pageNavBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageNavBtnDisabled: { backgroundColor: '#ccc' },
  pageNavText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  pageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 90,
    textAlign: 'center',
  },
  addPageBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#1565c0',
  },
  addPageBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Clear button
  clearButton: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  eraseModeActive: { backgroundColor: '#1565c0' },
  eraseModeActiveText: { color: '#ffffff' },

  // Saved page (read-only)
  savedPageContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  savedPageImage: {
    flex: 1,
    width: '100%',
  },
  emptyPageText: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#bbb',
    fontSize: 18,
  },
  readOnlyBadge: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  readOnlyText: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    color: '#fff',
    fontSize: 14,
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
