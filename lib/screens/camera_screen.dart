import 'dart:io';
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';
import 'package:permission_handler/permission_handler.dart';

import '../main.dart';
import '../widgets/face_overlay_painter.dart';

class CameraScreen extends StatefulWidget {
  const CameraScreen({super.key, required this.overlayImageFile});

  final File overlayImageFile;

  @override
  State<CameraScreen> createState() => _CameraScreenState();
}

class _CameraScreenState extends State<CameraScreen> {
  CameraController? _controller;
  final FaceDetector _faceDetector = FaceDetector(
    options: FaceDetectorOptions(
      performanceMode: FaceDetectorMode.fast,
      enableLandmarks: true,
    ),
  );

  ui.Image? _overlayImage;
  List<Face> _faces = [];
  bool _isProcessingFrame = false;
  bool _permissionDenied = false;
  String? _errorMessage;

  static const _orientations = {
    DeviceOrientation.portraitUp: 0,
    DeviceOrientation.landscapeLeft: 90,
    DeviceOrientation.portraitDown: 180,
    DeviceOrientation.landscapeRight: 270,
  };

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    final status = await Permission.camera.request();
    if (!status.isGranted) {
      setState(() => _permissionDenied = true);
      return;
    }

    final bytes = await widget.overlayImageFile.readAsBytes();
    final decoded = await decodeImageFromList(Uint8List.fromList(bytes));

    final frontCamera = availableCamerasList.firstWhere(
      (c) => c.lensDirection == CameraLensDirection.front,
      orElse: () => availableCamerasList.first,
    );

    final controller = CameraController(
      frontCamera,
      ResolutionPreset.medium,
      enableAudio: false,
      imageFormatGroup:
          Platform.isAndroid ? ImageFormatGroup.nv21 : ImageFormatGroup.bgra8888,
    );

    try {
      await controller.initialize();
    } catch (e) {
      setState(() => _errorMessage = 'Erro ao iniciar câmera: $e');
      return;
    }

    if (!mounted) return;

    setState(() {
      _controller = controller;
      _overlayImage = decoded;
    });

    await controller.startImageStream(_processCameraImage);
  }

  Future<void> _processCameraImage(CameraImage image) async {
    if (_isProcessingFrame || _controller == null) return;
    _isProcessingFrame = true;

    try {
      final inputImage = _buildInputImage(image, _controller!.description);
      if (inputImage != null) {
        final faces = await _faceDetector.processImage(inputImage);
        if (mounted) {
          setState(() => _faces = faces);
        }
      }
    } catch (e) {
      debugPrint('Erro ao processar frame: $e');
    } finally {
      _isProcessingFrame = false;
    }
  }

  InputImageRotation? _rotationFor(CameraDescription camera) {
    final sensorOrientation = camera.sensorOrientation;
    if (Platform.isIOS) {
      return InputImageRotationValue.fromRawValue(sensorOrientation);
    }
    final deviceOrientation = _controller!.value.deviceOrientation;
    var rotationCompensation = _orientations[deviceOrientation] ?? 0;
    if (camera.lensDirection == CameraLensDirection.front) {
      rotationCompensation = (sensorOrientation + rotationCompensation) % 360;
    } else {
      rotationCompensation =
          (sensorOrientation - rotationCompensation + 360) % 360;
    }
    return InputImageRotationValue.fromRawValue(rotationCompensation);
  }

  InputImage? _buildInputImage(CameraImage image, CameraDescription camera) {
    final rotation = _rotationFor(camera);
    if (rotation == null) return null;

    if (Platform.isIOS) {
      final format = InputImageFormatValue.fromRawValue(image.format.raw);
      if (format != InputImageFormat.bgra8888 || image.planes.length != 1) {
        return null;
      }
      final plane = image.planes.first;
      return InputImage.fromBytes(
        bytes: plane.bytes,
        metadata: InputImageMetadata(
          size: Size(image.width.toDouble(), image.height.toDouble()),
          rotation: rotation,
          format: InputImageFormat.bgra8888,
          bytesPerRow: plane.bytesPerRow,
        ),
      );
    }

    // Android: o ML Kit espera NV21. Alguns aparelhos entregam um único plano
    // já em NV21; outros entregam YUV_420_888 em 3 planos — nesse caso a gente
    // converte para NV21 em vez de descartar o frame (o que dava a impressão de
    // "nenhum rosto detectado" em muitos celulares).
    final Uint8List nv21Bytes = image.planes.length == 1
        ? image.planes.first.bytes
        : _yuv420ToNv21(image);
    return InputImage.fromBytes(
      bytes: nv21Bytes,
      metadata: InputImageMetadata(
        size: Size(image.width.toDouble(), image.height.toDouble()),
        rotation: rotation,
        format: InputImageFormat.nv21,
        bytesPerRow: image.width,
      ),
    );
  }

  /// Converte um frame YUV_420_888 (3 planos) para NV21 (Y seguido de V/U
  /// intercalados), respeitando os strides de linha e de pixel de cada plano.
  static Uint8List _yuv420ToNv21(CameraImage image) {
    final width = image.width;
    final height = image.height;
    final yPlane = image.planes[0];
    final uPlane = image.planes[1];
    final vPlane = image.planes[2];

    final nv21 = Uint8List(width * height + (width * height) ~/ 2);

    var pos = 0;
    final yRowStride = yPlane.bytesPerRow;
    final yPixelStride = yPlane.bytesPerPixel ?? 1;
    for (var row = 0; row < height; row++) {
      var yIndex = row * yRowStride;
      for (var col = 0; col < width; col++) {
        nv21[pos++] = yPlane.bytes[yIndex];
        yIndex += yPixelStride;
      }
    }

    final uRowStride = uPlane.bytesPerRow;
    final uPixelStride = uPlane.bytesPerPixel ?? 2;
    final vRowStride = vPlane.bytesPerRow;
    final vPixelStride = vPlane.bytesPerPixel ?? 2;
    final chromaHeight = height ~/ 2;
    final chromaWidth = width ~/ 2;
    for (var row = 0; row < chromaHeight; row++) {
      var uIndex = row * uRowStride;
      var vIndex = row * vRowStride;
      for (var col = 0; col < chromaWidth; col++) {
        nv21[pos++] = vPlane.bytes[vIndex];
        nv21[pos++] = uPlane.bytes[uIndex];
        uIndex += uPixelStride;
        vIndex += vPixelStride;
      }
    }
    return nv21;
  }

  @override
  void dispose() {
    _controller?.stopImageStream();
    _controller?.dispose();
    _faceDetector.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_permissionDenied) {
      return const Scaffold(
        body: Center(
          child: Text('Permissão de câmera negada. Habilite nas configurações do app.'),
        ),
      );
    }
    if (_errorMessage != null) {
      return Scaffold(body: Center(child: Text(_errorMessage!)));
    }
    final controller = _controller;
    if (controller == null || !controller.value.isInitialized || _overlayImage == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final camera = controller.description;
    final rotation = _rotationFor(camera);
    final previewSize = controller.value.previewSize ?? const Size(0, 0);
    final swapped = rotation == InputImageRotation.rotation90deg ||
        rotation == InputImageRotation.rotation270deg;
    final imageSize =
        swapped ? Size(previewSize.height, previewSize.width) : previewSize;

    return Scaffold(
      appBar: AppBar(title: const Text('Câmera AR — Estudo')),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final canvasSize = Size(constraints.maxWidth, constraints.maxHeight);
          return Stack(
            fit: StackFit.expand,
            children: [
              CameraPreview(controller),
              CustomPaint(
                size: canvasSize,
                painter: FaceOverlayPainter(
                  faces: _faces,
                  imageSize: imageSize,
                  cameraLensDirection: camera.lensDirection,
                  overlayImage: _overlayImage!,
                ),
              ),
              Positioned(
                bottom: 24,
                left: 0,
                right: 0,
                child: Center(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.black54,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      _faces.isEmpty
                          ? 'Nenhum rosto detectado'
                          : '${_faces.length} rosto(s) detectado(s)',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
