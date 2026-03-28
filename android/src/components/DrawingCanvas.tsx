import React, { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawingCanvasRef {
  /** Clears the canvas */
  clear: () => void;
  /** Reads the current drawing as a base64 PNG data URI */
  readSignature: () => void;
}

interface DrawingCanvasProps {
  /** Called with the base64 PNG data URI when readSignature() is triggered */
  onSave: (dataUri: string) => void;
  /** Called when the canvas is cleared or empty */
  onEmpty?: () => void;
  /** Pre-fill the canvas with an existing base64 PNG (used when returning to a saved page) */
  dataURL?: string;
}

// ─── Webview style injected into the signature canvas ────────────────────────
// Force the HTML canvas to fill the entire WebView viewport.
// Without this, the drawable area only covers the top ~40% of the view.

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
  ({ onSave, onEmpty, dataURL }, ref) => {
    const sigRef = useRef<any>(null);
    const [canvasHeight, setCanvasHeight] = useState(0);

    useImperativeHandle(ref, () => ({
      clear: () => {
        sigRef.current?.clearSignature();
      },
      readSignature: () => {
        sigRef.current?.readSignature();
      },
    }));

    const handleLayout = (e: LayoutChangeEvent) => {
      setCanvasHeight(e.nativeEvent.layout.height);
    };

    const handleBegin = () => {
      // Drawing started — nothing needed here
    };

    const handleEnd = () => {
      // Automatically read when stroke ends so parent can always get latest
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
          penColor="#1a1a2e"
          minWidth={2}
          maxWidth={5}
          scrollable={false}
          autoClear={false}
          dataURL={dataURL ?? ''}
          style={canvasHeight > 0 ? { height: canvasHeight } : { flex: 1 }}
        />
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
});
