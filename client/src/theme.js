/**
 * Snack Smart — dark theme (charcoal + gold accents)
 */
export const theme = {
    bg: "#0b0e14",
    surface: "#161b26",
    surfaceHover: "#1c2333",
    border: "#2a3142",
    borderSubtle: "#232a3a",
    gold: "#f9c851",
    goldDark: "#e6b93d",
    text: "#ffffff",
    textMuted: "#94a3b8",
    textDim: "#64748b",
    success: "#22c55e",
    successMuted: "rgba(34, 197, 94, 0.15)",
    danger: "#ef4444",
    onGold: "#0b0e14",
    radius: "12px",
    radiusSm: "8px",
    radiusPill: "999px",
    shadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
};

const headerChipBase = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "100px",
    boxSizing: "border-box",
    color: theme.gold,
    fontSize: "14px",
    fontWeight: "600",
    padding: "8px 14px",
    borderRadius: theme.radiusPill,
    border: `1px solid ${theme.gold}`,
    backgroundColor: "transparent",
    lineHeight: 1.2,
    fontFamily: "inherit",
};

export const headerChipLinkStyle = {
    ...headerChipBase,
    textDecoration: "none",
    cursor: "pointer",
};

export const logoutButtonStyle = {
    ...headerChipBase,
    cursor: "pointer",
};
