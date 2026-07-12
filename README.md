# Face Overlay AR — Estudo

Aplicativo Flutter (Android/iOS) para estudo de visão computacional e AR:
detecta o rosto do próprio usuário em tempo real pela câmera frontal e
sobrepõe uma selfie escolhida por ele mesmo, como um filtro estilo AR.

## Stack

- **Flutter** — app multiplataforma (Android/iOS)
- **camera** — acesso à câmera e stream de frames
- **google_mlkit_face_detection** — detecção de landmarks faciais em tempo real
- **image_picker** — seleção da selfie de origem (câmera ou galeria)
- **permission_handler** — permissão de câmera em tempo de execução

## Como funciona

1. Na tela inicial (`lib/screens/home_screen.dart`), o usuário escolhe uma
   selfie própria (tirada na hora ou da galeria).
2. Na tela de câmera (`lib/screens/camera_screen.dart`), a câmera frontal é
   aberta e cada frame é processado pelo ML Kit para detectar rosto e
   landmarks (olhos).
3. `lib/widgets/face_overlay_painter.dart` desenha a selfie escolhida sobre
   a região do rosto detectado, ajustando posição, escala e rotação com
   base na bounding box e na posição dos olhos.

## Rodando localmente

```bash
flutter pub get
flutter run
```

## Build via GitHub Actions

O workflow `.github/workflows/build.yml` roda `flutter analyze`,
`flutter test` e gera um APK de release a cada push, disponível como
artifact da execução (aba *Actions* do repositório) para download.

## Escopo do estudo

Este projeto usa apenas a **própria selfie do usuário** como imagem de
origem — é um filtro AR pessoal (tipo Snapchat), não uma ferramenta para
substituir o rosto de terceiros sem consentimento.
