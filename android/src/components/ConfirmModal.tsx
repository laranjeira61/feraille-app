import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalType = 'success' | 'error' | null;

interface ConfirmModalProps {
  visible: boolean;
  type: ModalType;
  message: string;
  /** Called when user taps the close button */
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  type,
  message,
  onClose,
}) => {
  const isSuccess = type === 'success';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            isSuccess ? styles.cardSuccess : styles.cardError,
          ]}
        >
          {/* Icon area */}
          <View
            style={[
              styles.iconCircle,
              isSuccess ? styles.iconCircleSuccess : styles.iconCircleError,
            ]}
          >
            <Text style={styles.iconText}>{isSuccess ? '✓' : '✕'}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isSuccess ? 'Fiche envoyée !' : 'Erreur'}
          </Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Close button — only shown on error; success auto-closes */}
          {!isSuccess && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          )}

          {/* Success auto-close hint */}
          {isSuccess && (
            <Text style={styles.autoCloseHint}>
              Fermeture automatique dans 3 secondes…
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ConfirmModal;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 420,
    borderRadius: 20,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  cardSuccess: {
    backgroundColor: '#ffffff',
    borderTopWidth: 6,
    borderTopColor: '#2e7d32',
  },
  cardError: {
    backgroundColor: '#ffffff',
    borderTopWidth: 6,
    borderTopColor: '#c62828',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircleSuccess: {
    backgroundColor: '#2e7d32',
  },
  iconCircleError: {
    backgroundColor: '#c62828',
  },
  iconText: {
    color: '#ffffff',
    fontSize: 40,
    fontWeight: 'bold',
    lineHeight: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  closeButton: {
    backgroundColor: '#c62828',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  autoCloseHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
