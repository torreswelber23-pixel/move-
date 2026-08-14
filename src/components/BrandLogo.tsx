export function BrandLogo({
  className = "",
  size = "text-5xl",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <span
      className={`font-display tracking-tight leading-none ${size} ${className}`}
      style={{ letterSpacing: "-0.03em" }}
    >
      <span className="text-white">Água</span>{" "}
      <span className="text-move-yellow">Premiada</span>
    </span>
  );
}
