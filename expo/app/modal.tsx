import { Stack } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

const MODES = [
  {
    title: "Humanize",
    description: "Translate inflated internal language into plain, direct writing.",
  },
  {
    title: "Corporatize",
    description: "Turn blunt or casual writing into polished professional communication.",
  },
  {
    title: "Smoke Meter",
    description: "Estimate how much buzzword haze and empty business language is present.",
  },
  {
    title: "Passive Aggressive Meter",
    description: "Surface hidden tension, indirect blame, and polite-but-sharp phrasing.",
  },
];

export default function ModalScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "About Corporate Decoder" }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>Writing Utility</Text>
          <Text style={styles.title}>A focused writing tool for modern workplace language.</Text>
          <Text style={styles.description}>
            Corporate Decoder helps you clean up vague messaging, sharpen intent, and understand the tone beneath polite phrasing.
          </Text>
        </View>

        {MODES.map((mode) => (
          <View key={mode.title} style={styles.card}>
            <Text style={styles.cardTitle}>{mode.title}</Text>
            <Text style={styles.cardDescription}>{mode.description}</Text>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F5F7",
  },
  content: {
    padding: 20,
    gap: 14,
  },
  hero: {
    backgroundColor: "#11181F",
    borderRadius: 28,
    padding: 24,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.3,
    textTransform: "uppercase",
    color: "#8EA3B5",
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: "#F5F7FA",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#C5D0D8",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "#D9E0E6",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F1720",
  },
  cardDescription: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5B6670",
  },
});
