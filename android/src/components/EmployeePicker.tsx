import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Employe } from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmployeePickerProps {
  employes: Employe[];
  selectedId: number | null;
  onSelect: (employe: Employe) => void;
  loading: boolean;
  error: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

const EmployeePicker: React.FC<EmployeePickerProps> = ({
  employes,
  selectedId,
  onSelect,
  loading,
  error,
}) => {
  const [dropdownVisible, setDropdownVisible] = useState(false);

  const selectedEmploye = employes.find((e) => e.id === selectedId) ?? null;

  const handleSelect = (employe: Employe) => {
    onSelect(employe);
    setDropdownVisible(false);
  };

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.trigger, styles.triggerDisabled]}>
        <ActivityIndicator color="#1a1a2e" size="small" />
        <Text style={styles.triggerTextPlaceholder}>
          Chargement des agents…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.trigger, styles.triggerError]}>
        <Text style={styles.triggerTextError}>
          Erreur de chargement — vérifiez l'URL API
        </Text>
      </View>
    );
  }

  return (
    <>
      {/* ── Dropdown trigger button ─────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setDropdownVisible(true)}
        activeOpacity={0.8}
      >
        <Text
          style={
            selectedEmploye ? styles.triggerText : styles.triggerTextPlaceholder
          }
          numberOfLines={1}
        >
          {selectedEmploye ? selectedEmploye.nom : 'Sélectionner un agent…'}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      {/* ── Dropdown modal ──────────────────────────────────────────────── */}
      <Modal
        visible={dropdownVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.dropdownContainer}>
            {/* Header */}
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>
                Choisir un agent
              </Text>
              <TouchableOpacity
                onPress={() => setDropdownVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={styles.dropdownClose}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* List */}
            <FlatList
              data={employes}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        isSelected && styles.optionTextSelected,
                      ]}
                    >
                      {item.nom}
                    </Text>
                    {isSelected && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Aucun agent disponible</Text>
                </View>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default EmployeePicker;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ccc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 0,
    minHeight: 60,
    justifyContent: 'space-between',
  },
  triggerDisabled: {
    borderColor: '#ddd',
    backgroundColor: '#f5f5f5',
    gap: 10,
  },
  triggerError: {
    borderColor: '#c62828',
    backgroundColor: '#fff8f8',
  },
  triggerText: {
    fontSize: 20,
    color: '#1a1a2e',
    fontWeight: '600',
    flex: 1,
  },
  triggerTextPlaceholder: {
    fontSize: 18,
    color: '#999',
    flex: 1,
  },
  triggerTextError: {
    fontSize: 16,
    color: '#c62828',
    flex: 1,
  },
  arrow: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },

  // Dropdown modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: 420,
    maxHeight: 480,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dropdownHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  dropdownClose: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    minHeight: 64,
    backgroundColor: '#fff',
  },
  optionSelected: {
    backgroundColor: '#e8f5e9',
  },
  optionText: {
    fontSize: 20,
    color: '#1a1a2e',
  },
  optionTextSelected: {
    fontWeight: '700',
    color: '#2e7d32',
  },
  checkmark: {
    fontSize: 20,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
  },
});
