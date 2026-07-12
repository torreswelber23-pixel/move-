import 'package:camera/camera.dart';
import 'package:flutter/material.dart';

/// Converte uma coordenada X do espaço da imagem da câmera (usada pelo
/// ML Kit) para o espaço de desenho do CustomPainter, espelhando quando a
/// câmera é a frontal (pois a preview da câmera frontal é espelhada).
double translateX(
  double x,
  Size canvasSize,
  Size imageSize,
  CameraLensDirection cameraLensDirection,
) {
  final scaleX = canvasSize.width / imageSize.width;
  if (cameraLensDirection == CameraLensDirection.front) {
    return canvasSize.width - (x * scaleX);
  }
  return x * scaleX;
}

double translateY(double y, Size canvasSize, Size imageSize) {
  final scaleY = canvasSize.height / imageSize.height;
  return y * scaleY;
}
