import React, { useRef, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrawingCanvasRef {
  /** Clears the canvas */
  clear: () => void;
  /** Reads the current drawing as a base64 PNG data URI */
  readSignature: () => void;
  /** Toggles eraser mode — true = eraser, false = pen */
  setEraserMode: (active: boolean) => void;
}

interface DrawingCanvasProps {
  /** Called with the base64 PNG data URI when readSignature() is triggered */
  onSave: (dataUri: string) => void;
  /** Called when the canvas is cleared or empty */
  onEmpty?: () => void;
  /** Pen color (CSS color string). Defaults to '#000000' */
  penColor?: string;
}

// ─── Webview style injected into the signature canvas ────────────────────────

const webStyle = `
  .m-signature-pad {
    box-shadow: none;
    border: none;
    background: #fafafa;
  }
  .m-signature-pad--body {
    border: none;
    background: #fafafa;
  }
  .m-signature-pad--footer {
    display: none;
  }
  body {
    background: #fafafa;
    margin: 0;
    padding: 0;
  }
  canvas {
    background: #fafafa !important;
  }
`;

// ─── Component ────────────────────────────────────────────────────────────────

const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  ({ onSave, onEmpty, penColor = '#000000' }, ref) => {
    const sigRef = useRef<any>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        sigRef.current?.clearSignature();
      },
      readSignature: () => {
        sigRef.current?.readSignature();
      },
      setEraserMode: (active: boolean) => {
        const color = active ? '#fafafa' : '#000000';
        sigRef.current?.injectJavaScript(
          `window.signaturePad && (window.signaturePad.penColor = '${color}'); true;`
        );
      },
    }));

    // Inject JS to update pen color whenever the penColor prop changes
    useEffect(() => {
      sigRef.current?.injectJavaScript(
        `window.signaturePad && (window.signaturePad.penColor = '${penColor}'); true;`
      );
    }, [penColor]);

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
      <View style={styles.container}>
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
          // Prevent scroll bounce interfering with drawing
          scrollable={false}
          // Auto-read on every stroke end is handled in onEnd
          autoClear={false}
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
