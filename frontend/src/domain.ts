type ThemePreference = "system" | "light" | "dark";

function calculateStraightLineBookValue(
  purchaseCost: number,
  annualRate: number,
  ageYears: number,
): number {
  const cost = Math.max(0, Number(purchaseCost) || 0);
  const rate = Math.min(100, Math.max(0, Number(annualRate) || 0)) / 100;
  const age = Math.max(0, Number(ageYears) || 0);
  return Math.max(
    0,
    Math.round((cost * (1 - Math.min(1, rate * age)) + Number.EPSILON) * 100) /
      100,
  );
}

function resolveTheme(
  preference: ThemePreference,
  prefersDark: boolean,
): "light" | "dark" {
  return preference === "system"
    ? prefersDark
      ? "dark"
      : "light"
    : preference;
}

function parseApiErrorMessage(value: unknown): string {
  const raw = value && typeof value === "object" && "message" in value
    ? String((value as { message: unknown }).message)
    : String(value ?? "");
  const text = raw.replace(/^API Error \d+:\s*/, "");
  try {
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error || text || "Something went wrong.";
  } catch {
    return text || "Something went wrong.";
  }
}

const FrontendDomain = {
  calculateStraightLineBookValue,
  resolveTheme,
  parseApiErrorMessage,
};
