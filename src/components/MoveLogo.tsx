export function MoveLogo({
  className = "",
  size = "text-5xl",
}: {
  className?: string;
  size?: string;
}) {
  return (
    <span
      className={`font-display tracking-tight leading-none text-move-yellow ${size} ${className}`}
      style={{ letterSpacing: "-0.03em" }}
    >
      MOVE
      <sup className="text-[0.5em] align-super ml-0.5">+</sup>
    </span>
  );
}
