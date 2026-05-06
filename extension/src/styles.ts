const TIER_COLORS: Record<string, string> = {
  iron:        "#a0a0a0",
  bronze:      "#cd7f32",
  silver:      "#c0c0c0",
  gold:        "#ffd700",
  platinum:    "#00c0b0",
  emerald:     "#50c878",
  diamond:     "#b9f2ff",
  master:      "#9d48e0",
  grandmaster: "#e05c5c",
  challenger:  "#f4c874",
};

const CSS = `
.trb-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  letter-spacing: 0.3px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  pointer-events: none;
  z-index: 10;
  line-height: 18px;
  border-left: 3px solid var(--trb-color, #9147ff);
}
${Object.entries(TIER_COLORS)
  .map(
    ([tier, color]) =>
      `.trb-badge[data-tier="${tier}"] { --trb-color: ${color}; }`
  )
  .join("\n")}
`;

export function injectStyles() {
  if (document.getElementById("trb-styles")) return;
  const style = document.createElement("style");
  style.id = "trb-styles";
  style.textContent = CSS;
  document.head.appendChild(style);
}
