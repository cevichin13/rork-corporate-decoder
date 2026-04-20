import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowRight, Copy, Eraser, Gauge, ScanText, ShieldAlert, Sparkles } from "lucide-react-native";

type ModeId = "humanize" | "corporatize" | "smoke" | "passive";

interface ExampleItem {
  label: string;
  value: string;
}

interface ModeConfig {
  id: ModeId;
  label: string;
  title: string;
  subtitle: string;
  placeholder: string;
  accent: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  actionLabel: string;
  examples: ExampleItem[];
}

interface ResultContent {
  title: string;
  body: string;
  footer: string;
  scoreLabel?: string;
  scoreValue?: string;
}

const MAX_CHARACTERS = 800;
const MIN_CHARACTERS = 8;
const LOADING_DELAY_MS = 750;

const MODES: ModeConfig[] = [
  {
    id: "humanize",
    label: "Humanize",
    title: "Make corporate writing sound clear and human.",
    subtitle: "Strip out jargon and rewrite it in plain language.",
    placeholder: "Paste a status update, memo, or email full of workplace language.",
    accent: "#245B63",
    icon: ScanText,
    actionLabel: "Humanize",
    examples: [
      {
        label: "Status update",
        value:
          "We are continuing to socialize the revised roadmap and align stakeholders around near-term execution priorities before operationalizing the next phase.",
      },
      {
        label: "Meeting note",
        value: "Let’s take this offline, pressure-test the assumptions, and circle back with a scalable path forward by EOD Thursday.",
      },
      {
        label: "Leadership memo",
        value: "Our goal is to unlock synergies across the org and create a more durable value narrative for the business moving forward.",
      },
    ],
  },
  {
    id: "corporatize",
    label: "Corporatize",
    title: "Make direct writing sound polished and professional.",
    subtitle: "Refine blunt language without losing the message.",
    placeholder: "Paste a rough Slack message, note, or candid draft.",
    accent: "#355A95",
    icon: Sparkles,
    actionLabel: "Corporatize",
    examples: [
      {
        label: "Slack reply",
        value: "This deck is messy and nobody can tell what you want people to do.",
      },
      {
        label: "Manager note",
        value: "You missed the brief again and I had to fix it myself at the last minute.",
      },
      {
        label: "Cross-team email",
        value: "We can’t keep redoing this because people show up unprepared.",
      },
    ],
  },
  {
    id: "smoke",
    label: "Smoke",
    title: "Measure how much buzzword smoke is in the text.",
    subtitle: "Score vague, inflated language against concrete meaning.",
    placeholder: "Paste strategic messaging, a company update, or business copy.",
    accent: "#7A5C23",
    icon: Gauge,
    actionLabel: "Analyze smoke",
    examples: [
      {
        label: "Town hall",
        value: "We are doubling down on strategic leverage points to unlock durable momentum and create a future-ready operating model.",
      },
      {
        label: "Consulting slide",
        value: "This initiative will drive transformational value creation through agile enablement and integrated stakeholder alignment.",
      },
      {
        label: "Policy draft",
        value: "Our intent is to streamline cross-functional touchpoints in service of more holistic decision velocity.",
      },
    ],
  },
  {
    id: "passive",
    label: "Passive Aggressive",
    title: "Read the subtext in polished but tense messages.",
    subtitle: "Spot restrained frustration, blame, or pointed politeness.",
    placeholder: "Paste a note, email, or internal message.",
    accent: "#8A4A55",
    icon: ShieldAlert,
    actionLabel: "Analyze tone",
    examples: [
      {
        label: "Follow-up",
        value: "Just checking whether you saw the invite this time.",
      },
      {
        label: "Email nudge",
        value: "No worries if this wasn’t a priority, I just wasn’t sure why nobody responded.",
      },
      {
        label: "Project update",
        value: "I went ahead and finished it since we were running out of time.",
      },
    ],
  },
];

const MOCK_RESULTS: Record<ModeId, (input: string) => ResultContent> = {
  humanize: (input: string) => ({
    title: "Plain-language rewrite",
    body: "We’re reviewing the plan with the people involved, agreeing on the next priorities, and then starting the next phase.",
    footer: `Rewritten from ${input.length} characters into a clearer, more natural update.`,
  }),
  corporatize: (input: string) => ({
    title: "Professional rewrite",
    body: "The draft would benefit from a clearer structure and more explicit next steps. Tightening the narrative and clarifying the requested actions would make it more effective for the audience.",
    footer: `Refined ${input.length} characters into a more polished workplace tone.`,
  }),
  smoke: (input: string) => ({
    title: "Smoke score",
    body: "This reads as polished but abstract. It leans on strategic phrasing and broad business language instead of naming concrete actions, owners, or outcomes.",
    footer: "Best fix: replace generic phrases with specifics, timelines, and clear accountability.",
    scoreLabel: "Smoke level",
    scoreValue: `${Math.min(94, 58 + Math.round(input.length / 18))}/100`,
  }),
  passive: (input: string) => ({
    title: "Tone read",
    body: "The message avoids direct confrontation, but the wording implies frustration and criticism beneath a polite surface.",
    footer: "Best fix: make the request explicit and remove wording that signals blame or impatience.",
    scoreLabel: "Passive-aggressive",
    scoreValue: `${Math.min(92, 41 + Math.round(input.length / 20))}/100`,
  }),
};

function ScoreBadge({ scoreLabel, scoreValue, accent }: { scoreLabel?: string; scoreValue?: string; accent: string }) {
  if (!scoreLabel || !scoreValue) {
    return null;
  }

  return (
    <View style={[styles.scoreBadge, { borderColor: `${accent}30`, backgroundColor: `${accent}12` }]}>
      <Text style={[styles.scoreLabel, { color: accent }]}>{scoreLabel}</Text>
      <Text style={styles.scoreValue}>{scoreValue}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [activeMode, setActiveMode] = useState<ModeId>("humanize");
  const [input, setInput] = useState<string>(MODES[0]?.examples[0]?.value ?? "");
  const [result, setResult] = useState<ResultContent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const fadeAnim = useRef<Animated.Value>(new Animated.Value(0)).current;
  const translateAnim = useRef<Animated.Value>(new Animated.Value(10)).current;

  const mode = useMemo<ModeConfig>(() => {
    return MODES.find((item) => item.id === activeMode) ?? MODES[0];
  }, [activeMode]);

  useEffect(() => {
    console.log("[CorporateDecoder] activeModeChanged", activeMode);
    setInput(mode.examples[0]?.value ?? "");
    setResult(null);
    setErrorMessage("");
  }, [activeMode, mode.examples]);

  const animateResultIn = useCallback(() => {
    fadeAnim.setValue(0);
    translateAnim.setValue(10);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateAnim]);

  const characterCount = input.length;
  const isOverLimit = characterCount > MAX_CHARACTERS;
  const Icon = mode.icon;

  const handleAnalyze = useCallback(() => {
    console.log("[CorporateDecoder] handleAnalyze", { activeMode, characterCount: input.length });
    const trimmed = input.trim();

    if (!trimmed) {
      setErrorMessage("Enter some text to analyze.");
      setResult(null);
      return;
    }

    if (trimmed.length < MIN_CHARACTERS) {
      setErrorMessage(`Enter at least ${MIN_CHARACTERS} characters for a useful result.`);
      setResult(null);
      return;
    }

    if (trimmed.length > MAX_CHARACTERS) {
      setErrorMessage(`Keep it under ${MAX_CHARACTERS} characters for now.`);
      setResult(null);
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    setTimeout(() => {
      const nextResult = MOCK_RESULTS[activeMode](trimmed);
      console.log("[CorporateDecoder] resultReady", nextResult.title);
      setResult(nextResult);
      setIsLoading(false);
      animateResultIn();
    }, LOADING_DELAY_MS);
  }, [activeMode, animateResultIn, input]);

  const handleUseExample = useCallback((value: string) => {
    console.log("[CorporateDecoder] exampleSelected", value.slice(0, 48));
    setInput(value);
    setErrorMessage("");
    setResult(null);
    Haptics.selectionAsync();
  }, []);

  const handleClear = useCallback(() => {
    console.log("[CorporateDecoder] clearPressed");
    setInput("");
    setErrorMessage("");
    setResult(null);
    Haptics.selectionAsync();
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result) {
      return;
    }

    const payload = [result.title, result.body, result.footer, result.scoreValue ? `${result.scoreLabel}: ${result.scoreValue}` : ""]
      .filter(Boolean)
      .join("\n\n");

    try {
      await Clipboard.setStringAsync(payload);
      Haptics.selectionAsync();
      console.log("[CorporateDecoder] resultCopied");
      Alert.alert("Copied", "Result copied to clipboard.");
    } catch (error) {
      console.log("[CorporateDecoder] copyFailed", error);
      Alert.alert("Copy failed", "Could not copy the result. Please try again.");
    }
  }, [result]);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#F7F8FA", "#F1F4F7", "#EBEFF3"]} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            testID="home-screen"
          >
            <View style={styles.heroBlock}>
              <Text style={styles.eyebrow}>Corporate Decoder</Text>
              <Text style={styles.heroTitle}>Decode workplace language.</Text>
              <Text style={styles.heroSubtitle}>One sharp tool for rewriting, scoring, and reading tone.</Text>
            </View>

            <View style={styles.segmentedControl}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentedRow}>
                {MODES.map((item) => {
                  const ModeIcon = item.icon;
                  const isActive = item.id === activeMode;

                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setActiveMode(item.id)}
                      style={({ pressed }) => [
                        styles.segment,
                        isActive ? [styles.segmentActive, { backgroundColor: item.accent, borderColor: item.accent }] : null,
                        pressed ? styles.pressed : null,
                      ]}
                      testID={`mode-${item.id}`}
                    >
                      <ModeIcon color={isActive ? "#F7FAFC" : "#5F6B76"} size={16} />
                      <Text style={[styles.segmentText, isActive ? styles.segmentTextActive : null]}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.surfaceCard}>
              <View style={styles.modeHeader}>
                <View style={[styles.modeIconWrap, { backgroundColor: `${mode.accent}12`, borderColor: `${mode.accent}24` }]}>
                  <Icon color={mode.accent} size={18} />
                </View>
                <View style={styles.modeHeaderText}>
                  <Text style={styles.modeTitle}>{mode.title}</Text>
                  <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                </View>
              </View>

              <View style={styles.examplesRow}>
                {mode.examples.map((example) => (
                  <Pressable
                    key={example.label}
                    onPress={() => handleUseExample(example.value)}
                    style={({ pressed }) => [styles.exampleChip, pressed ? styles.pressed : null]}
                    testID={`example-${mode.id}-${example.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Text style={styles.exampleChipText}>{example.label}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.inputShell}>
                <TextInput
                  multiline
                  value={input}
                  onChangeText={setInput}
                  placeholder={mode.placeholder}
                  placeholderTextColor="#8B96A0"
                  style={styles.input}
                  textAlignVertical="top"
                  maxLength={MAX_CHARACTERS + 40}
                  testID="decoder-input"
                />
                <View style={styles.inputMetaRow}>
                  <Text style={styles.inputMetaText}>Use real drafts, emails, messages, or internal updates.</Text>
                  <Text style={[styles.counterText, isOverLimit ? styles.counterTextDanger : null]}>
                    {characterCount}/{MAX_CHARACTERS}
                  </Text>
                </View>
              </View>

              {errorMessage ? (
                <View style={styles.errorCard} testID="error-state">
                  <Text style={styles.errorTitle}>Input issue</Text>
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={handleAnalyze}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: mode.accent },
                  pressed || isLoading ? styles.primaryButtonPressed : null,
                ]}
                testID="analyze-button"
              >
                <View style={styles.primaryButtonContent}>
                  {isLoading ? <ActivityIndicator color="#F8FAFC" /> : null}
                  <Text style={styles.primaryButtonText}>{isLoading ? "Analyzing" : mode.actionLabel}</Text>
                  {!isLoading ? <ArrowRight color="#F8FAFC" size={18} /> : null}
                </View>
              </Pressable>

              <View style={styles.secondaryActionsRow}>
                <Pressable onPress={handleClear} style={({ pressed }) => [styles.secondaryButton, pressed ? styles.pressed : null]} testID="clear-button">
                  <Eraser color="#16222E" size={16} />
                  <Text style={styles.secondaryButtonText}>Clear</Text>
                </Pressable>
                <Pressable
                  onPress={handleCopy}
                  disabled={!result}
                  style={({ pressed }) => [styles.secondaryButton, !result ? styles.secondaryButtonDisabled : null, pressed && result ? styles.pressed : null]}
                  testID="copy-button"
                >
                  <Copy color={result ? "#16222E" : "#A2ABB4"} size={16} />
                  <Text style={[styles.secondaryButtonText, !result ? styles.secondaryButtonTextDisabled : null]}>Copy</Text>
                </Pressable>
              </View>
            </View>

            <Animated.View
              style={[
                styles.resultCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: translateAnim }],
                },
              ]}
              testID="result-card"
            >
              {result ? (
                <>
                  <View style={styles.resultHeader}>
                    <View style={styles.resultHeadingBlock}>
                      <Text style={styles.resultEyebrow}>Result</Text>
                      <Text style={styles.resultTitle}>{result.title}</Text>
                    </View>
                    <ScoreBadge scoreLabel={result.scoreLabel} scoreValue={result.scoreValue} accent={mode.accent} />
                  </View>
                  <Text style={styles.resultBody}>{result.body}</Text>
                  <Text style={styles.resultFooter}>{result.footer}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.resultEyebrow}>Result</Text>
                  <Text style={styles.resultPlaceholderTitle}>The output appears here.</Text>
                  <Text style={styles.resultPlaceholderText}>Run the selected mode to see the rewrite, score, or tone readout.</Text>
                </>
              )}
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#EBEFF3",
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    gap: 16,
  },
  heroBlock: {
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 6,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#66727D",
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
    color: "#101820",
    maxWidth: 420,
  },
  heroSubtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: "#5E6974",
    maxWidth: 440,
  },
  segmentedControl: {
    backgroundColor: "#E7ECF0",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D5DDE4",
    padding: 6,
  },
  segmentedRow: {
    gap: 8,
  },
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "#F6F8FA",
  },
  segmentActive: {
    shadowColor: "#0B1320",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    color: "#5F6B76",
  },
  segmentTextActive: {
    color: "#F7FAFC",
  },
  surfaceCard: {
    backgroundColor: "#FCFDFD",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#D7DEE5",
    padding: 18,
    gap: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modeHeaderText: {
    flex: 1,
    gap: 4,
  },
  modeTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#101820",
  },
  modeSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#66727D",
  },
  examplesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exampleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D9E0E6",
    backgroundColor: "#F2F5F7",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  exampleChipText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: "#32414C",
  },
  inputShell: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#D6DEE5",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  input: {
    minHeight: 200,
    fontSize: 16,
    lineHeight: 25,
    color: "#10212D",
  },
  inputMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inputMetaText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#7A8791",
  },
  counterText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: "#66727D",
  },
  counterTextDanger: {
    color: "#B44554",
  },
  errorCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F2C4CB",
    backgroundColor: "#FCEBED",
    gap: 4,
  },
  errorTitle: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "700",
    color: "#8A2231",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8A2231",
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: {
    opacity: 0.9,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  secondaryActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9E0E6",
    backgroundColor: "#EEF2F5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  secondaryButtonDisabled: {
    backgroundColor: "#F4F6F8",
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: "#16222E",
  },
  secondaryButtonTextDisabled: {
    color: "#A2ABB4",
  },
  resultCard: {
    minHeight: 200,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#D7DEE5",
    backgroundColor: "#FFFFFF",
    padding: 18,
    gap: 14,
    shadowColor: "#111827",
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  resultHeadingBlock: {
    flex: 1,
  },
  resultEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: "#6B7985",
  },
  resultTitle: {
    marginTop: 6,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#101820",
  },
  resultBody: {
    fontSize: 17,
    lineHeight: 28,
    color: "#1A2A35",
  },
  resultFooter: {
    fontSize: 14,
    lineHeight: 21,
    color: "#66727D",
  },
  resultPlaceholderTitle: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#16222E",
  },
  resultPlaceholderText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#66727D",
  },
  scoreBadge: {
    minWidth: 110,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 4,
  },
  scoreLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scoreValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: "#101820",
  },
  pressed: {
    opacity: 0.82,
  },
});
