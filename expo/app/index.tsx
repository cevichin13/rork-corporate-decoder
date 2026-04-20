import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
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
  shortLabel: string;
  title: string;
  subtitle: string;
  placeholder: string;
  accent: string;
  accentSoft: string;
  icon: React.ComponentType<{ color?: string; size?: number }>;
  actionLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  loadingLabel: string;
  resultLabel: string;
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
const LOADING_DELAY_MS = 850;

const MODES: ModeConfig[] = [
  {
    id: "humanize",
    label: "Humanize",
    shortLabel: "Humanize",
    title: "Rewrite corporate language in plain English",
    subtitle: "Remove office jargon and make the message sound clear, direct, and human.",
    placeholder: "Paste a memo, update, or email full of workplace phrasing.",
    accent: "#285C64",
    accentSoft: "#E7F1F1",
    icon: ScanText,
    actionLabel: "Humanize text",
    emptyTitle: "Plain-language rewrite will appear here.",
    emptyDescription: "Use Humanize to turn inflated workplace writing into something clearer and easier to read.",
    loadingLabel: "Rewriting in plain language",
    resultLabel: "Humanized result",
    examples: [
      {
        label: "Roadmap update",
        value:
          "We are continuing to socialize the revised roadmap and align stakeholders around near-term execution priorities before operationalizing the next phase.",
      },
      {
        label: "Meeting follow-up",
        value: "Let’s take this offline, pressure-test the assumptions, and circle back with a scalable path forward by EOD Thursday.",
      },
      {
        label: "Leadership note",
        value: "Our goal is to unlock synergies across the org and create a more durable value narrative for the business moving forward.",
      },
    ],
  },
  {
    id: "corporatize",
    label: "Corporatize",
    shortLabel: "Corporatize",
    title: "Polish blunt writing for work",
    subtitle: "Keep the point, but make the delivery sound measured, professional, and manager-safe.",
    placeholder: "Paste a direct Slack message, rough feedback note, or candid draft.",
    accent: "#385D96",
    accentSoft: "#E9EEF7",
    icon: Sparkles,
    actionLabel: "Corporatize text",
    emptyTitle: "Professional rewrite will appear here.",
    emptyDescription: "Use Corporatize to soften blunt language without losing the substance of the message.",
    loadingLabel: "Polishing workplace tone",
    resultLabel: "Professional result",
    examples: [
      {
        label: "Slack reply",
        value: "This deck is messy and nobody can tell what you want people to do.",
      },
      {
        label: "Manager feedback",
        value: "You missed the brief again and I had to fix it myself at the last minute.",
      },
      {
        label: "Team email",
        value: "We can’t keep redoing this because people show up unprepared.",
      },
    ],
  },
  {
    id: "smoke",
    label: "Smoke Meter",
    shortLabel: "Smoke",
    title: "Score how much corporate fluff is in the text",
    subtitle: "Flag vague strategic phrasing, buzzword density, and low-information language.",
    placeholder: "Paste an announcement, strategy note, or polished company copy.",
    accent: "#7A5F2C",
    accentSoft: "#F6F0E4",
    icon: Gauge,
    actionLabel: "Analyze smoke level",
    emptyTitle: "Smoke score will appear here.",
    emptyDescription: "Use Smoke Meter to estimate how much polished language is hiding a lack of concrete meaning.",
    loadingLabel: "Scoring buzzword density",
    resultLabel: "Smoke analysis",
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
    label: "Passive Aggressive Meter",
    shortLabel: "Passive Aggressive",
    title: "Read the tension underneath polite wording",
    subtitle: "Estimate how much the message signals irritation, blame, or pointed restraint.",
    placeholder: "Paste a follow-up, email, or internal message with subtle edge.",
    accent: "#8B4E57",
    accentSoft: "#F7EAEE",
    icon: ShieldAlert,
    actionLabel: "Analyze tone",
    emptyTitle: "Tone readout will appear here.",
    emptyDescription: "Use Passive Aggressive Meter to surface veiled frustration in polished workplace messaging.",
    loadingLabel: "Reading the subtext",
    resultLabel: "Tone analysis",
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
        label: "Project note",
        value: "I went ahead and finished it since we were running out of time.",
      },
    ],
  },
];

const MOCK_RESULTS: Record<ModeId, (input: string) => ResultContent> = {
  humanize: (input: string) => ({
    title: "Plain-language rewrite",
    body: "We’re reviewing the updated plan with the people involved, agreeing on the next priorities, and then moving into the next phase.",
    footer: `Rewritten from ${input.length} characters of corporate phrasing into a clearer, more natural update.`,
  }),
  corporatize: (input: string) => ({
    title: "Professional rewrite",
    body: "The draft would be stronger with a clearer structure and more explicit next steps. Tightening the message and clarifying the requested actions would make it more effective for the audience.",
    footer: `Refined ${input.length} characters into a more polished workplace tone without changing the core point.`,
  }),
  smoke: (input: string) => ({
    title: "Smoke score",
    body: "This reads as polished but abstract. It leans on strategic phrasing and broad business language rather than naming concrete actions, owners, or outcomes.",
    footer: "Best fix: replace broad phrases with specifics, timelines, and clearer accountability.",
    scoreLabel: "Smoke level",
    scoreValue: `${Math.min(94, 58 + Math.round(input.length / 18))}/100`,
  }),
  passive: (input: string) => ({
    title: "Tone read",
    body: "The wording stays polite on the surface, but it implies frustration and criticism indirectly. The tension comes from what is suggested rather than said outright.",
    footer: "Best fix: make the request explicit and remove wording that signals blame, impatience, or score-settling.",
    scoreLabel: "Passive-aggressive",
    scoreValue: `${Math.min(92, 41 + Math.round(input.length / 20))}/100`,
  }),
};

function ScoreBadge({ scoreLabel, scoreValue, accentSoft }: { scoreLabel?: string; scoreValue?: string; accentSoft: string }) {
  if (!scoreLabel || !scoreValue) {
    return null;
  }

  return (
    <View style={[styles.scoreBadge, { backgroundColor: accentSoft }]}>
      <Text style={styles.scoreLabel}>{scoreLabel}</Text>
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
  const translateAnim = useRef<Animated.Value>(new Animated.Value(12)).current;
  const loadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mode = useMemo<ModeConfig>(() => {
    return MODES.find((item) => item.id === activeMode) ?? MODES[0];
  }, [activeMode]);

  useEffect(() => {
    console.log("[CorporateDecoder] activeModeChanged", activeMode);
    setInput(mode.examples[0]?.value ?? "");
    setResult(null);
    setErrorMessage("");
    setIsLoading(false);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, [activeMode, mode.examples]);

  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  const animateResultIn = useCallback(() => {
    fadeAnim.setValue(0);
    translateAnim.setValue(12);
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
      setErrorMessage("Paste or type some text to analyze.");
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
    setResult(null);

    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
    }

    loadingTimeoutRef.current = setTimeout(() => {
      const nextResult = MOCK_RESULTS[activeMode](trimmed);
      console.log("[CorporateDecoder] resultReady", nextResult.title);
      setResult(nextResult);
      setIsLoading(false);
      loadingTimeoutRef.current = null;
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
    setIsLoading(false);
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
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
      <LinearGradient colors={["#F6F8FA", "#EEF2F5", "#E7ECF0"]} style={styles.background}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            style={styles.keyboardWrap}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              showsVerticalScrollIndicator={false}
              testID="home-screen"
            >
              <View style={styles.heroBlock}>
                <Text style={styles.eyebrow}>Corporate Decoder</Text>
                <Text style={styles.heroTitle}>Decode workplace language.</Text>
                <Text style={styles.heroSubtitle}>A single focused workspace for rewriting, scoring, and reading tone.</Text>
              </View>

              <View style={styles.segmentedControl} testID="mode-tabs">
                <View style={styles.segmentGrid}>
                  {MODES.map((item) => {
                    const ModeIcon = item.icon;
                    const isActive = item.id === activeMode;

                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setActiveMode(item.id)}
                        style={({ pressed }) => [
                          styles.segment,
                          isActive ? [styles.segmentActive, { borderColor: item.accent, backgroundColor: item.accent }] : null,
                          pressed ? styles.pressed : null,
                        ]}
                        testID={`mode-${item.id}`}
                      >
                        <ModeIcon color={isActive ? "#F8FAFC" : item.accent} size={16} />
                        <View style={styles.segmentTextWrap}>
                          <Text style={[styles.segmentText, isActive ? styles.segmentTextActive : null]}>{item.shortLabel}</Text>
                          <Text style={[styles.segmentSubtext, isActive ? styles.segmentSubtextActive : null]} numberOfLines={1}>
                            {item.resultLabel}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.surfaceCard}>
                <View style={styles.modeHeader}>
                  <View style={[styles.modeIconWrap, { backgroundColor: mode.accentSoft, borderColor: `${mode.accent}24` }]}>
                    <Icon color={mode.accent} size={18} />
                  </View>
                  <View style={styles.modeHeaderText}>
                    <Text style={styles.modeTitle}>{mode.title}</Text>
                    <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                  </View>
                </View>

                <View style={styles.examplesBlock}>
                  <Text style={styles.examplesLabel}>Examples</Text>
                  <View style={styles.examplesRow}>
                    {mode.examples.map((example) => (
                      <Pressable
                        key={example.label}
                        onPress={() => handleUseExample(example.value)}
                        style={({ pressed }) => [styles.exampleChip, { backgroundColor: mode.accentSoft }, pressed ? styles.pressed : null]}
                        testID={`example-${mode.id}-${example.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Text style={styles.exampleChipText}>{example.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.inputShell}>
                  <Text style={styles.inputLabel}>Input</Text>
                  <TextInput
                    multiline
                    scrollEnabled
                    value={input}
                    onChangeText={setInput}
                    placeholder={mode.placeholder}
                    placeholderTextColor="#8A96A1"
                    style={styles.input}
                    textAlignVertical="top"
                    maxLength={MAX_CHARACTERS + 40}
                    returnKeyType="default"
                    blurOnSubmit={false}
                    testID="decoder-input"
                  />
                  <View style={styles.inputMetaRow}>
                    <Text style={styles.inputMetaText}>Use real workplace drafts, messages, or internal updates.</Text>
                    <Text style={[styles.counterText, isOverLimit ? styles.counterTextDanger : null]} testID="character-counter">
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
                    <Text style={styles.primaryButtonText}>{isLoading ? mode.loadingLabel : mode.actionLabel}</Text>
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
                    opacity: result ? fadeAnim : 1,
                    transform: [{ translateY: result ? translateAnim : 0 }],
                  },
                ]}
                testID="result-card"
              >
                {isLoading ? (
                  <View style={styles.loadingState} testID="loading-state">
                    <View style={[styles.loadingIconWrap, { backgroundColor: mode.accentSoft }]}> 
                      <ActivityIndicator color={mode.accent} />
                    </View>
                    <Text style={styles.resultEyebrow}>Processing</Text>
                    <Text style={styles.loadingTitle}>{mode.loadingLabel}</Text>
                    <Text style={styles.loadingText}>Generating a realistic mock output for this mode.</Text>
                  </View>
                ) : result ? (
                  <>
                    <View style={styles.resultHeader}>
                      <View style={styles.resultHeadingBlock}>
                        <Text style={styles.resultEyebrow}>{mode.resultLabel}</Text>
                        <Text style={styles.resultTitle}>{result.title}</Text>
                      </View>
                      <ScoreBadge scoreLabel={result.scoreLabel} scoreValue={result.scoreValue} accentSoft={mode.accentSoft} />
                    </View>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={styles.resultScroll} contentContainerStyle={styles.resultScrollContent}>
                      <Text style={styles.resultBody}>{result.body}</Text>
                      <View style={styles.resultFooterCard}>
                        <Text style={styles.resultFooter}>{result.footer}</Text>
                      </View>
                    </ScrollView>
                  </>
                ) : (
                  <View style={styles.emptyState} testID="empty-state">
                    <View style={[styles.emptyIconWrap, { backgroundColor: mode.accentSoft }]}> 
                      <Icon color={mode.accent} size={18} />
                    </View>
                    <Text style={styles.resultEyebrow}>{mode.resultLabel}</Text>
                    <Text style={styles.resultPlaceholderTitle}>{mode.emptyTitle}</Text>
                    <Text style={styles.resultPlaceholderText}>{mode.emptyDescription}</Text>
                  </View>
                )}
              </Animated.View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#E7ECF0",
  },
  background: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardWrap: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 18,
  },
  heroBlock: {
    gap: 8,
    paddingHorizontal: 2,
  },
  eyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#6D7984",
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
    color: "#5F6B76",
    maxWidth: 440,
  },
  segmentedControl: {
    backgroundColor: "#EAF0F3",
    borderRadius: 26,
    borderWidth: 1,
    borderColor: "#D6DEE5",
    padding: 8,
  },
  segmentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  segment: {
    width: "48.5%",
    minHeight: 72,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#D6DEE5",
    backgroundColor: "#F7FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  segmentActive: {
    shadowColor: "#111827",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  segmentTextWrap: {
    flex: 1,
    gap: 2,
  },
  segmentText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: "#16222E",
  },
  segmentTextActive: {
    color: "#F8FAFC",
  },
  segmentSubtext: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
    color: "#6D7984",
  },
  segmentSubtextActive: {
    color: "#D9E4EA",
  },
  surfaceCard: {
    backgroundColor: "#FCFDFE",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#D7DEE5",
    padding: 18,
    gap: 18,
    shadowColor: "#111827",
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  modeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  modeHeaderText: {
    flex: 1,
    gap: 5,
  },
  modeTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#101820",
  },
  modeSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: "#63707B",
  },
  examplesBlock: {
    gap: 10,
  },
  examplesLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6D7984",
  },
  examplesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  exampleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D5DDE4",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  exampleChipText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "600",
    color: "#31404B",
  },
  inputShell: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#D7DEE5",
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#6D7984",
  },
  input: {
    minHeight: 220,
    maxHeight: 320,
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
    opacity: 0.88,
  },
  primaryButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 18,
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
    backgroundColor: "#EEF2F5",
    borderWidth: 1,
    borderColor: "#D9E0E6",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    borderWidth: 1,
    borderColor: "#D7DEE5",
    padding: 18,
    minHeight: 250,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  resultHeadingBlock: {
    flex: 1,
    gap: 6,
  },
  resultEyebrow: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#6B7985",
  },
  resultTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "700",
    color: "#101820",
  },
  resultScroll: {
    maxHeight: 280,
  },
  resultScrollContent: {
    gap: 14,
    paddingBottom: 2,
  },
  resultBody: {
    fontSize: 17,
    lineHeight: 28,
    color: "#1B2A35",
  },
  resultFooterCard: {
    borderRadius: 18,
    backgroundColor: "#F3F6F8",
    padding: 14,
  },
  resultFooter: {
    fontSize: 14,
    lineHeight: 21,
    color: "#63707B",
  },
  resultPlaceholderTitle: {
    marginTop: 6,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#16222E",
    textAlign: "center",
  },
  resultPlaceholderText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#66727D",
    textAlign: "center",
    maxWidth: 360,
  },
  scoreBadge: {
    minWidth: 110,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "flex-start",
    gap: 4,
  },
  scoreLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#5C6872",
  },
  scoreValue: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "700",
    color: "#101820",
  },
  emptyState: {
    minHeight: 214,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingState: {
    minHeight: 214,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    color: "#16222E",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#66727D",
    textAlign: "center",
    maxWidth: 320,
  },
  pressed: {
    opacity: 0.84,
  },
});
