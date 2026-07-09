"use client";

import { useEffect, useState } from "react";
import QRCodeLib from "qrcode";

export function QRCode({
  value,
  size = 120,
}: {
  value: string;
  size?: number;
}) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCodeLib.toDataURL(value, {
      width: size * 2,
      margin: 1,
      color: { dark: "#0a0a0a", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className="animate-pulse rounded-md bg-neutral-800"
        style={{ width: size, height: size }}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={dataUrl}
      alt="QR code"
      width={size}
      height={size}
      className="rounded-md bg-white"
    />
  );
}
