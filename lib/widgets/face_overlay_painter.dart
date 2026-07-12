import 'dart:math' as math;
import 'dart:ui' as ui;

import 'package:camera/camera.dart';
import 'package:flutter/material.dart';
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

import '../utils/coordinate_translator.dart';

/// Desenha a imagem de origem (selfie escolhida pelo usuário) sobre cada
/// rosto detectado pelo ML Kit, posicionada, rotacionada e escalada de
/// acordo com a bounding box e os landmarks dos olhos.
class FaceOverlayPainter extends CustomPainter {
  FaceOverlayPainter({
    required this.faces,
    required this.imageSize,
    required this.cameraLensDirection,
    required this.overlayImage,
  });

  final List<Face> faces;
  final Size imageSize;
  final CameraLensDirection cameraLensDirection;
  final ui.Image overlayImage;

  @override
  void paint(Canvas canvas, Size size) {
    for (final face in faces) {
      final rect = Rect.fromLTRB(
        translateX(face.boundingBox.left, size, imageSize, cameraLensDirection),
        translateY(face.boundingBox.top, size, imageSize),
        translateX(face.boundingBox.right, size, imageSize, cameraLensDirection),
        translateY(face.boundingBox.bottom, size, imageSize),
      );

      // Dá uma folga em torno do rosto (cabelo/queixo) para o overlay
      // cobrir a bounding box de forma mais natural.
      final expandedRect = Rect.fromCenter(
        center: rect.center,
        width: rect.width * 1.4,
        height: rect.height * 1.6,
      );

      double angle = 0;
      final leftEye = face.landmarks[FaceLandmarkType.leftEye]?.position;
      final rightEye = face.landmarks[FaceLandmarkType.rightEye]?.position;
      if (leftEye != null && rightEye != null) {
        final p1 = Offset(
          translateX(leftEye.x.toDouble(), size, imageSize, cameraLensDirection),
          translateY(leftEye.y.toDouble(), size, imageSize),
        );
        final p2 = Offset(
          translateX(rightEye.x.toDouble(), size, imageSize, cameraLensDirection),
          translateY(rightEye.y.toDouble(), size, imageSize),
        );
        // A câmera frontal é espelhada, então o par de olhos aparece
        // invertido (leftEye do rosto real fica à direita na tela).
        angle = math.atan2(p1.dy - p2.dy, p1.dx - p2.dx);
      }

      canvas.save();
      canvas.translate(expandedRect.center.dx, expandedRect.center.dy);
      canvas.rotate(angle);

      final destRect = Rect.fromCenter(
        center: Offset.zero,
        width: expandedRect.width,
        height: expandedRect.height,
      );

      canvas.clipPath(Path()..addOval(destRect));
      paintImage(
        canvas: canvas,
        rect: destRect,
        image: overlayImage,
        fit: BoxFit.cover,
      );
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant FaceOverlayPainter oldDelegate) {
    return oldDelegate.faces != faces || oldDelegate.overlayImage != overlayImage;
  }
}
