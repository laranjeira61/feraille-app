import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Keyboard } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawingCanvasRef {
  clear: () => void;
  readSignature: () => void;
  setEraseMode: (erase: boolean) => void;
  setPenColor: (color: string) => void;
  setPenThickness: (min: number, max: number) => void;
}

interface DrawingCanvasProps {
  onSave: (dataUri: string) => void;
  onEmpty?: () => void;
  dataURL?: string;
  disabled?: boolean;
  initialPenColor?: string;
  initialPenMin?: number;
  initialPenMax?: number;
}

// ─── Webview style injected into the signature canvas ────────────────────────

const webStyle = `
  html, body {
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden;
    background: #fafafa;
  }
  .m-signature-pad {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    box-shadow: none;
    border: none;
    background: #fafafa;
    width: 100%;
    height: 100%;
  }
  .m-signature-pad--body {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    border: none;
    background: #fafafa;
  }
  .m-signature-pad--footer {
    display: none;
  }
  canvas {
    width: 100% !important;
    height: 100% !important;
    background: #fafafa !important;
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  ({ onSave, onEmpty, dataURL, disabled = false,
     initialPenColor = '#1a1a2e', initialPenMin = 2, initialPenMax = 5 }, ref) => {
    const sigRef = useRef<any>(null);
    const [canvasHeight, setCanvasHeight] = useState(0);
    const [eraseMode, setEraseModeState] = useState(false);

    // Use refs to avoid stale closures in imperative methods
    const eraseModeRef = useRef(false);
    const penColorRef = useRef(initialPenColor);
    const penMinRef = useRef(initialPenMin);
    const penMaxRef = useRef(initialPenMax);

    useImperativeHandle(ref, () => ({
      clear: () => { sigRef.current?.clearSignature(); },
      readSignature: () => { sigRef.current?.readSignature(); },

      setEraseMode: (erase: boolean) => {
        eraseModeRef.current = erase;
        setEraseModeState(erase);
        if (erase) {
          sigRef.current?.changePenColor('rgba(250,250,250,1)');
          sigRef.current?.changePenSize(12, 24);
        } else {
          sigRef.current?.changePenColor(penColorRef.current);
          sigRef.current?.changePenSize(penMinRef.current, penMaxRef.current);
        }
      },

      setPenColor: (color: string) => {
        penColorRef.current = color;
        // Selecting a color exits erase mode automatically
        eraseModeRef.current = false;
        setEraseModeState(false);
        sigRef.current?.changePenColor(color);
        sigRef.current?.changePenSize(penMinRef.current, penMaxRef.current);
      },

      setPenThickness: (min: number, max: number) => {
        penMinRef.current = min;
        penMaxRef.current = max;
        if (!eraseModeRef.current) {
          sigRef.current?.changePenSize(min, max);
        }
      },
    }));

    const handleLayout = (e: LayoutChangeEvent) => {
      setCanvasHeight(e.nativeEvent.layout.height);
    };

    const handleBegin = () => {
      Keyboard.dismiss();
    };

    const handleEnd = () => {
      sigRef.current?.readSignature();
    };

    const handleOK = (dataUri: string) => {
      onSave(dataUri);
    };

    const handleEmpty = () => {
      onEmpty?.();
      onSave('');
    };

    return (
      <View style={styles.container} onLayout={handleLayout}>
        <SignatureCanvas
          ref={sigRef}
          onBegin={handleBegin}
          onEnd={handleEnd}
          onOK={handleOK}
          onEmpty={handleEmpty}
          webStyle={webStyle}
          backgroundColor="rgba(250,250,250,1)"
          penColor={eraseMode ? 'rgba(250,250,250,1)' : initialPenColor}
          minWidth={eraseMode ? 12 : initialPenMin}
          maxWidth={eraseMode ? 24 : initialPenMax}
          scrollable={false}
          autoClear={false}
          dataURL={dataURL ?? ''}
          style={canvasHeight > 0 ? { height: canvasHeight } : { flex: 1 }}
        />
        {disabled && (
          <View style={styles.disabledOverlay} pointerEvents="box-only" />
        )}
      </View>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

export default DrawingCanvas;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200,200,200,0.45)',
    borderRadius: 10,
  },
});
