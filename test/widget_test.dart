import 'package:flutter_test/flutter_test.dart';

import 'package:face_overlay_ar/main.dart';

void main() {
  testWidgets('Home screen renders selfie picker', (WidgetTester tester) async {
    await tester.pumpWidget(const FaceOverlayApp());

    expect(find.text('Filtro de Rosto AR — Estudo'), findsOneWidget);
    expect(find.text('Tirar selfie'), findsOneWidget);
    expect(find.text('Escolher da galeria'), findsOneWidget);
  });
}
