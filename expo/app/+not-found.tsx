import { Link, Stack } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page not found" }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Corporate Decoder</Text>
          <Text style={styles.title}>That page doesn&apos;t exist.</Text>
          <Text style={styles.description}>
            Return to the decoder workspace to analyze or rewrite your message.
          </Text>
          <Link href="/" asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Return to decoder</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F5F7",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#D9E0E6",
    padding: 24,
    gap: 12,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: "#6D7A86",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0F1720",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: "#5B6670",
  },
  button: {
    marginTop: 8,
    backgroundColor: "#0F1720",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: "center",
  },
  buttonText: {
    color: "#F7FAFC",
    fontSize: 15,
    fontWeight: "700",
  },
});
