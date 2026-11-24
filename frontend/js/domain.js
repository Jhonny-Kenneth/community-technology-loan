function calculateStraightLineBookValue(purchaseCost, annualRate, ageYears) {
    const cost = Math.max(0, Number(purchaseCost) || 0);
    const rate = Math.min(100, Math.max(0, Number(annualRate) || 0)) / 100;
    const age = Math.max(0, Number(ageYears) || 0);
    return Math.max(0, Math.round((cost * (1 - Math.min(1, rate * age)) + Number.EPSILON) * 100) /
        100);
}
function resolveTheme(preference, prefersDark) {
    return preference === "system"
        ? prefersDark
            ? "dark"
            : "light"
        : preference;
}
function parseApiErrorMessage(value) {
    const raw = value && typeof value === "object" && "message" in value
        ? String(value.message)
        : String(value ?? "");
    const text = raw.replace(/^API Error \d+:\s*/, "");
    try {
        const parsed = JSON.parse(text);
        return parsed.error || text || "Something went wrong.";
    }
    catch {
        return text || "Something went wrong.";
    }
}
const FrontendDomain = {
    calculateStraightLineBookValue,
    resolveTheme,
    parseApiErrorMessage,
};
