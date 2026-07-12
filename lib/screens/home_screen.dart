import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../main.dart';
import 'camera_screen.dart';

/// Tela inicial: o usuário escolhe uma selfie própria que será usada
/// como textura sobreposta ao rosto detectado na câmera (filtro AR de estudo).
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  File? _selectedImage;
  final ImagePicker _picker = ImagePicker();

  Future<void> _pickImage(ImageSource source) async {
    final XFile? picked = await _picker.pickImage(
      source: source,
      preferredCameraDevice: CameraDevice.front,
      imageQuality: 90,
    );
    if (picked == null) return;
    setState(() {
      _selectedImage = File(picked.path);
    });
  }

  void _startAr() {
    if (_selectedImage == null || availableCamerasList.isEmpty) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CameraScreen(overlayImageFile: _selectedImage!),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final noCamera = availableCamerasList.isEmpty;
    return Scaffold(
      appBar: AppBar(title: const Text('Filtro de Rosto AR — Estudo')),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Text(
              'Escolha uma selfie sua. Ela será sobreposta em tempo real '
              'sobre o seu rosto detectado pela câmera frontal, como um '
              'filtro estilo AR.',
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: Colors.deepPurple, width: 2),
                image: _selectedImage != null
                    ? DecorationImage(
                        image: FileImage(_selectedImage!),
                        fit: BoxFit.cover,
                      )
                    : null,
              ),
              child: _selectedImage == null
                  ? const Icon(Icons.face, size: 96, color: Colors.grey)
                  : null,
            ),
            const SizedBox(height: 24),
            Wrap(
              spacing: 12,
              alignment: WrapAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: () => _pickImage(ImageSource.camera),
                  icon: const Icon(Icons.camera_alt),
                  label: const Text('Tirar selfie'),
                ),
                OutlinedButton.icon(
                  onPressed: () => _pickImage(ImageSource.gallery),
                  icon: const Icon(Icons.photo_library),
                  label: const Text('Escolher da galeria'),
                ),
              ],
            ),
            const SizedBox(height: 32),
            if (noCamera)
              const Text(
                'Nenhuma câmera disponível neste dispositivo.',
                style: TextStyle(color: Colors.red),
              ),
            FilledButton.icon(
              onPressed: (_selectedImage != null && !noCamera) ? _startAr : null,
              icon: const Icon(Icons.play_arrow),
              label: const Text('Iniciar câmera AR'),
            ),
          ],
        ),
      ),
    );
  }
}
