# 🤟 SignSpeak

## 📖 Descripción

SignSpeak es una aplicación web progresiva (PWA) diseñada para traducir la Lengua de Señas Mexicana (LSM) a texto y voz en tiempo real, utilizando un guante sensorial con sensores flexibles e inerciales, y un modelo de inteligencia artificial que se ejecuta directamente en el dispositivo móvil.

El proyecto busca reducir la barrera comunicativa entre las personas con discapacidad auditiva y la población oyente que desconoce la LSM, ofreciendo una alternativa portátil, económica y precisa que fomente la autonomía e inclusión del usuario.

## ✨ Características

### 🧤 Guante Sensorial

Dispositivo vestible equipado con cinco sensores flexores y un módulo inercial MPU-6050, montados sobre un guante elástico y gestionados por un microcontrolador Arduino Nano.

-   Lectura de flexión de cada dedo
-   Medición de aceleración y velocidad angular
-   Transmisión inalámbrica vía Bluetooth BLE
-   Alimentación autónoma con batería LiPo recargable

### 🤖 Inteligencia Artificial

Modelo de red neuronal LSTM entrenado con datos de 15 señas básicas de la LSM, optimizado para ejecutarse localmente en el teléfono.

-   Clasificación de 15 señas de uso cotidiano
-   Precisión objetivo: más del 85%
-   Ejecución offline (sin servidor)
-   Ventana de datos deslizante para detección en tiempo real

### 📱 Aplicación Web Progresiva (PWA)

Interfaz moderna y responsiva, instalable en dispositivos Android como una aplicación nativa.

-   Traducción de señas a texto y voz
-   Síntesis de voz en español (es-MX)
-   Biblioteca visual de dactilología LSM (A-Z)
-   Historial de traducciones con selección y resaltado
-   Diagnósticos en vivo de sensores
-   Diseño mobile-first

### 🎥 Pantallas de la App

-   **Inicio** - Estado del guante y letra del día
-   **AI Camera** - Detección visual en tiempo real con bounding box
-   **Text to Sign** - Conversión de texto a secuencia visual de dactilología
-   **Sign Library** - Abecedario completo y 15 señas básicas

## 🏋 Señas Disponibles

| Seña      | Icono | Seña    | Icono    |
| --------- | ----- | ------- | -------- |
| Hola      | 👋    | Agua    | 💧       |
| Gracias   | 🙏    | Comida  | 🍎       |
| Por favor | 🤲    | Baño    | 🚻       |
| Sí        | 👍    | Ayuda   | 🆘       |
| No        | 👎    | Amigo   | 🤝       |
| Bien      | 👌    | Familia | 👨‍👩‍👧 |
| Mal       | 👎    | Amor    | ❤️       |
| Casa      | 🏠    |         |          |

> La arquitectura del proyecto permite incorporar nuevas señas de forma sencilla y escalable.

## 🛠 Tecnologías Utilizadas

### Frontend

-   React 18
-   TypeScript
-   Vite
-   CSS3
-   Vite PWA

### Inteligencia Artificial

-   TensorFlow.js
-   TensorFlow / Keras (entrenamiento)
-   LiteRT (.tflite)

### Hardware

-   Arduino Nano (ATmega328P)
-   Sensores flexores
-   MPU-6050 (acelerómetro + giroscopio)
-   Módulo Bluetooth BLE
-   Batería LiPo 3.7V + TP4056

### APIs del Navegador

-   Web Bluetooth API
-   Web Speech API (TextToSpeech)
-   MediaDevices API (Cámara)

### Control de Versiones

-   Git
-   GitHub
-   GitHub Pages

## 📂 Estructura del Proyecto

text

signspeak/  
│  
├── public/  
│   ├── letras/  
│   ├── favicon.svg  
│   ├── icons.svg  
│   ├── logo.png  
│   ├── pwa-192x192.png  
│   └── pwa-512x512.png  
│  
├── src/  
│   ├── App.tsx  
│   ├── App.css  
│   ├── main.tsx  
│   └── index.css  
│  
├── index.html  
├── package.json  
├── vite.config.ts  
├── tsconfig.json  
└── README.md

## 🎯 Objetivo del Proyecto

Desarrollar un prototipo funcional de un guante sensorial que interprete vocabulario básico de la LSM y lo traduzca a texto y audio en un dispositivo móvil utilizando un modelo de inteligencia artificial, logrando una precisión superior al 85%.

### Objetivos Específicos

1.  Diseñar e integrar el circuito electrónico del guante con sensores flexibles y MPU-6050.
2.  Desarrollar el firmware del microcontrolador para lectura, filtrado y transmisión inalámbrica.
3.  Crear una aplicación móvil (PWA) para Android con interfaz accesible.
4.  Recopilar un dataset validado con al menos 15 señas básicas de LSM.
5.  Entrenar y evaluar un modelo LSTM optimizado para ejecución local en el teléfono.

## 📊 Alcances y Limitaciones

### Alcances

-   Traducción de 15 señas básicas de LSM (ejecución aislada)
-   Comunicación en un solo sentido: LSM → texto/voz
-   Prototipo funcional validado en entorno controlado
-   Aplicación solo para Android (PWA)
-   Precisión objetivo: >85%

### Limitaciones

-   Vocabulario reducido (15 señas)
-   Solo captura movimientos de una mano
-   Sin información de separación entre dedos ni orientación absoluta
-   Dataset con número reducido de participantes
-   Bluetooth BLE con alcance corto y sensible a interferencias

## 👨‍💻 Equipo de Desarrollo

| Nombre                       | Matrícula |
| ---------------------------- | --------- |
| Celis García Leonardo Miguel | 23200818  |
| Estrada Flores César         | 23200832  |
| Gómez Orta Enrique           | 23200842  |
| Fernández Emilio Sebastián   | 23200835  |
| Martínez Martínez Andy Gael  | 23200863  |
| Vidal Delgado Fernando       | 23200905  |

**Grupo:** A  
**Asignatura:** Taller de Investigación II  
**Docente:** Luis Mendoza Austria  
**Institución:** Tecnológico Nacional de México Campus Pachuca

## 📚 Referencias

-   Bangor, A., Kortum, P. T., & Miller, J. T. (2008). An empirical evaluation of the System Usability Scale. *International Journal of Human-Computer Interaction*, 24(6), 574-594.
-   Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In *Usability evaluation in industry* (pp. 189-194). Taylor & Francis.
-   Hochreiter, S., & Schmidhuber, J. (1997). Long short-term memory. *Neural Computation*, 9(8), 1735-1780.
-   INEGI. (2021). *Estadísticas a propósito del Día Internacional de las Personas con Discapacidad*.
-   Lee, B. G., & Lee, S. M. (2018). Smart wearable hand device for sign language interpretation system with sensors fusion. *IEEE Sensors Journal*, 18(3), 1224-1232.
-   Saggio, G., Riillo, F., Sbernini, L., & Quitadamo, L. R. (2016). Resistive flex sensors: A survey. *Smart Materials and Structures*, 25(1), 013001.
-   Zhou, Z., et al. (2020). Sign-to-speech translation using machine-learning-assisted stretchable sensor arrays. *Nature Electronics*, 3(9), 571-578.

> "La comunicación no tiene barreras cuando la tecnología habla por nosotros."

© 2026 SignSpeak • Traductor de Lengua de Señas Mexicana con IA  
Desarrollado con pasión por el equipo de Taller de Investigación II