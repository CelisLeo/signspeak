import { useState, useRef, useEffect } from 'react'
import './App.css'

const ALPHABET = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'LL', 
  'M', 'N', 'Ñ', 'O', 'P', 'Q', 'R', 'RR', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
];

interface VocabItem {
  id: number;
  word: string;
  icon: string;
}

const LSM_VOCABULARY: VocabItem[] = [
  { id: 1, word: 'Hola', icon: '👋' },
  { id: 2, word: 'Gracias', icon: '🙏' },
  { id: 3, word: 'Por favor', icon: '🤲' },
  { id: 4, word: 'Sí', icon: '👍' },
  { id: 5, word: 'No', icon: '👎' },
  { id: 6, word: 'Bien', icon: '👌' },
  { id: 7, word: 'Mal', icon: '👎' },
  { id: 8, word: 'Agua', icon: '💧' },
  { id: 9, word: 'Comida', icon: '🍎' },
  { id: 10, word: 'Baño', icon: '🚻' },
  { id: 11, word: 'Ayuda', icon: '🆘' },
  { id: 12, word: 'Amigo', icon: '🤝' },
  { id: 13, word: 'Familia', icon: '👨‍👩‍👧' },
  { id: 14, word: 'Amor', icon: '❤️' },
  { id: 15, word: 'Casa', icon: '🏠' },
];

// 🔥 NUEVO ORDEN: Inicio · Cámara · Traducir · Letras
const NAV_ITEMS = [
  { id: 'home', icon: '🏡', label: 'Inicio' },
  { id: 'camera', icon: '📷', label: 'Cámara' },
  { id: 'translate', icon: '💬', label: 'Traducir' },
  { id: 'letters', icon: '📚', label: 'Letras' },
];

function App() {
  const [currentTab, setCurrentTab] = useState('home');
  const [bluetoothStatus, setBluetoothStatus] = useState<'Desconectado' | 'Conectando...' | 'Conectado'>('Desconectado');
  const [dailyLetter, setDailyLetter] = useState('S');
  const [inputText, setInputText] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [detectedSign, setDetectedSign] = useState<string | null>(null);
  const [libraryMode, setLibraryMode] = useState<'alphabet' | 'vocabulary'>('alphabet');
  const [letterBag, setLetterBag] = useState<string[]>([]);
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (isCameraActive && currentTab === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(e => console.error("Error al reproducir:", e));
    }
  }, [isCameraActive, currentTab]);

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);
      setDetectedSign(null);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }, 
          audio: false 
        });
        streamRef.current = stream;
        setIsCameraActive(true);
        
        setTimeout(() => {
          setDetectedSign('Hola');
          speakText('Hola');
        }, 3000);
      } catch (error: any) {
        console.error('Error de cámara:', error);
        let msg = 'No se pudo acceder a la cámara.\n\n';
        if (error.name === 'NotAllowedError') msg += 'Permiso denegado.';
        else if (error.name === 'NotFoundError') msg += 'No hay cámara.';
        else if (error.name === 'NotReadableError') msg += 'Cámara en uso.';
        else msg += 'Error: ' + error.message;
        alert(msg);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 🔥 FIX: Confirmación antes de desconectar
  const handleConnect = () => {
    if (bluetoothStatus === 'Conectado') {
      if (confirm('¿Quieres desconectar el guante? 📡')) {
        setBluetoothStatus('Desconectado');
        setToast('Guante desconectado');
      }
      return;
    }
    setBluetoothStatus('Conectando...');
    setTimeout(() => setBluetoothStatus('Conectado'), 1500);
  };

  const handleTranslate = () => {
    const trimmed = inputText.trim();
    if (trimmed === '') return;
    
    const newItem = trimmed.toUpperCase();
    const existingIndex = history.indexOf(newItem);
    
    if (existingIndex !== -1) {
      setSelectedHistoryIndex(existingIndex);
      speakText(trimmed);
      setInputText('');
      setToast('Ya está en el historial ✨');
      return;
    }
    
    setHistory([newItem, ...history]);
    setSelectedHistoryIndex(0);
    speakText(trimmed);
    setInputText('');
  };

  const handleHistoryClick = (item: string, index: number) => {
    setSelectedHistoryIndex(index);
    speakText(item);
  };

  const clearHistory = () => {
    if (history.length === 0) return;
    if (confirm('¿Borrar todo el historial?')) {
      setHistory([]);
      setSelectedHistoryIndex(0);
      setInputText('');
      setToast('Historial borrado');
    }
  };

  const openLetterModal = (letter: string) => {
    setSelectedLetter(letter);
    speakText(letter);
  };

  const renderSignCards = (text: string) => {
    const upperText = text.toUpperCase().trim();
    if (!upperText) return null;

    const tokens: string[] = [];
    let i = 0;
    while (i < upperText.length) {
      const twoChars = upperText.substring(i, i + 2);
      if (twoChars === 'LL' || twoChars === 'RR') {
        tokens.push(twoChars);
        i += 2;
      } else {
        tokens.push(upperText[i]);
        i += 1;
      }
    }

    return tokens.map((token, idx) => {
      if (token === ' ') return <div key={idx} className="sign-spacer" />;
      
      if (ALPHABET.includes(token)) {
        return (
          <div 
            key={idx} 
            className="sign-image-card" 
            onClick={() => openLetterModal(token)}
          >
            <img src={`${import.meta.env.BASE_URL}letras/${token}.png`} alt={token} />
            <span>{token}</span>
          </div>
        );
      }
      return <div key={idx} className="sign-image-card unknown">{token}</div>;
    });
  };

  const generateNewLetter = () => {
    let bag = [...letterBag];
    if (bag.length === 0) {
      bag = [...ALPHABET].sort(() => Math.random() - 0.5);
    }
    const nextLetter = bag.pop()!;
    setLetterBag(bag);
    setDailyLetter(nextLetter);
    speakText(nextLetter);
  };

  const activeIndex = NAV_ITEMS.findIndex(item => item.id === currentTab);

  const renderScreen = () => {
    switch (currentTab) {
        case 'home':
        return (
          <div className="screen fade-in">
            {/* 🔥 Brand header (todo integrado) */}
            <header className="brand-header">
              <div className="brand-logo-img">
                <img src={`${import.meta.env.BASE_URL}logo.png`} alt="SignSpeak Logo" />
              </div>
              <div className="brand-text">
                <h1 className="brand-name">
                  Sign<span className="brand-accent">Speak</span>
                </h1>
                <p className="brand-tagline">Tu traductor de Lengua de Señas Mexicana</p>
              </div>
            </header>

            {/* 🔥 Estado del guante - compacto */}
            <div className="status-card">
              <div className="status-icon">📡</div>
              <div className="status-info">
                <h3>Guante</h3>
                <p className={bluetoothStatus === 'Conectado' ? 'text-success' : 'text-muted'}>
                  {bluetoothStatus === 'Conectado' ? 'Conectado · 88%' : bluetoothStatus}
                </p>
              </div>
              <button 
                className={`btn-connect ${bluetoothStatus === 'Conectado' ? 'connected danger' : ''}`} 
                onClick={handleConnect}
              >
                <span className={`dot ${bluetoothStatus === 'Conectado' ? 'live' : ''}`}></span>
                {bluetoothStatus === 'Conectado' ? 'Desconectar' : 'Conectar'}
              </button>
            </div>
            
            {/* 🔥 Letra del día */}
            <div className="card highlight-card">
              <h3>Letra del Día</h3>
              <div className="letter-display" onClick={() => openLetterModal(dailyLetter)}>
                <img 
                  src={`${import.meta.env.BASE_URL}letras/${dailyLetter}.png`} 
                  alt={`Seña ${dailyLetter}`} 
                  className="letter-img-large" 
                />
              </div>
              <button className="btn-primary" onClick={generateNewLetter}>
                <span>✨ Generar nueva letra</span>
              </button>
            </div>
          </div>
        );
      case 'camera':
        return (
          <div className="screen fade-in">
            <header className="screen-header">
              <h1>AI Camera</h1>
              <p>Detección en tiempo real</p>
            </header>

            <div className="camera-view">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline 
                muted 
                className="video-feed"
                style={{ display: isCameraActive ? 'block' : 'none' }}
              />
              
              {!isCameraActive && (
                <div className="camera-offline">
                  <div className="camera-offline-icon">📷</div>
                  <p>Cámara apagada</p>
                </div>
              )}
              
              {isCameraActive && (
                <div className="camera-overlay">
                  <div className={`bounding-box ${detectedSign ? 'active' : ''}`}>
                    {detectedSign && <span className="detected-text">{detectedSign}</span>}
                  </div>
                </div>
              )}
              
              {isCameraActive && (
                <div className="live-badge">
                  <span className="live-dot"></span> LIVE
                </div>
              )}
            </div>

            <button className="btn-primary" onClick={toggleCamera}>
              {isCameraActive ? '⏹ Apagar Cámara' : '▶ Encender Cámara'}
            </button>

            {detectedSign && (
              <div className="detection-result">
                <div>
                  <span className="detection-label">Seña detectada</span>
                  <p className="detection-word">{detectedSign}</p>
                </div>
                <button className="btn-icon" onClick={() => speakText(detectedSign)}>🔊</button>
              </div>
            )}

            <div className="diagnostics-panel">
              <h3>Diagnósticos en Vivo</h3>
              <div className="sensor-row">
                <span>Flex Index</span>
                <div className="progress-bar"><div className="progress" style={{ width: isCameraActive ? '70%' : '0%' }}></div></div>
              </div>
              <div className="sensor-row">
                <span>Flex Middle</span>
                <div className="progress-bar"><div className="progress" style={{ width: isCameraActive ? '40%' : '0%' }}></div></div>
              </div>
            </div>
          </div>
        );
      case 'letters':
        return (
          <div className="screen fade-in">
            <header className="screen-header">
              <h1>Sign Library</h1>
              <p>Dactilología y Vocabulario LSM</p>
            </header>

            <div className="library-toggle">
              <button 
                className={libraryMode === 'alphabet' ? 'active' : ''} 
                onClick={() => setLibraryMode('alphabet')}
              >
                Abecedario
              </button>
              <button 
                className={libraryMode === 'vocabulary' ? 'active' : ''} 
                onClick={() => setLibraryMode('vocabulary')}
              >
                15 Señas
              </button>
            </div>

            {libraryMode === 'alphabet' ? (
              <div className="letters-grid">
                {ALPHABET.map((letter) => (
                  <div 
                    key={letter} 
                    className="letter-card" 
                    onClick={() => openLetterModal(letter)}
                  >
                    <img src={`${import.meta.env.BASE_URL}letras/${letter}.png`} alt={`Seña ${letter}`} className="letter-img-grid" />
                    <span className="letter-char">{letter}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="letters-grid">
                {LSM_VOCABULARY.map((sign) => (
                  <div key={sign.id} className="letter-card vocab-card" onClick={() => speakText(sign.word)}>
                    <span className="vocab-icon">{sign.icon}</span>
                    <span className="letter-char">{sign.word}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'translate':
        return (
          <div className="screen fade-in">
            <header className="screen-header">
              <h1>Text to Sign</h1>
              <p>Traduce texto a lenguaje de señas</p>
            </header>
            
            <div className="translate-form">
              <textarea 
                placeholder="Escribe una palabra o frase..." 
                className="input-text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                maxLength={30}
              />
              <div className="input-footer">
                <span className="char-count">{inputText.length}/30</span>
                <button className="btn-primary" onClick={handleTranslate}>
                  ✨ Traducir y Reproducir
                </button>
              </div>
            </div>

            {history.length > 0 && (
              <div className="sign-visualizer">
                <h3>Traducción visual</h3>
                <div className="sign-cards-container">
                  {renderSignCards(history[selectedHistoryIndex] || history[0])}
                </div>
                <p className="visualizer-hint">👆 Toca una letra para verla en grande</p>
              </div>
            )}

            <div className="history-section">
              <div className="history-header">
                <h3>Historial reciente</h3>
                {history.length > 0 && (
                  <button className="btn-clear" onClick={clearHistory}>
                    🗑️ Limpiar
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="empty-state">
                  <span>📭</span>
                  <p>No hay traducciones aún</p>
                </div>
              ) : (
                history.map((item, index) => (
                  <div 
                    key={index} 
                    className={`history-item ${selectedHistoryIndex === index ? 'selected' : ''}`}
                    onClick={() => handleHistoryClick(item, index)}
                  >
                    <span>{item}</span>
                    {selectedHistoryIndex === index && <span className="history-check">✓</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      default:
        return <div>Pantalla no encontrada</div>;
    }
  };

  return (
    <div className="app-wrapper">
      <div className="app-container">
        <main className="main-content">
          {renderScreen()}
        </main>

        <nav className="bottom-nav">
          <div 
            className="nav-indicator" 
            style={{ transform: `translateX(${activeIndex * 100}%)` }}
          />
          {NAV_ITEMS.map((item) => (
            <button 
              key={item.id}
              className={`nav-item ${currentTab === item.id ? 'active' : ''}`} 
              onClick={() => setCurrentTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <small>{item.label}</small>
            </button>
          ))}
        </nav>
      </div>

      {toast && (
        <div className="toast">{toast}</div>
      )}

      {selectedLetter && (
        <div className="modal-overlay" onClick={() => setSelectedLetter(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedLetter(null)}>✕</button>
            <div 
              className="modal-image-container clickable"
              onClick={() => speakText(selectedLetter)}
            >
              <img src={`${import.meta.env.BASE_URL}letras/${selectedLetter}.png`} alt={selectedLetter} />
            </div>
            <h2>{selectedLetter}</h2>
            <p className="modal-hint">👆 Presiona la imagen para escuchar</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App