import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [animationFinished, setAnimationFinished] = useState(false);

  // Animation values
  const iconScale = useRef(new Animated.Value(0.6)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const brandOpacity = useRef(new Animated.Value(0)).current;
  const brandTranslateY = useRef(new Animated.Value(15)).current;
  const creditOpacity = useRef(new Animated.Value(0)).current;
  const creditTranslateY = useRef(new Animated.Value(10)).current;
  const screenFadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    async function prepare() {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        // Ignore if splash screen was already dismissed
      }
    }
    prepare();

    const entranceAnimation = Animated.sequence([
      Animated.parallel([
        Animated.timing(iconOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(brandOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(brandTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(creditOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(creditTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),

      Animated.delay(900),
      Animated.timing(screenFadeOut, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]);

    entranceAnimation.start(() => {
      setAnimationFinished(true);
    });

    return () => {
      entranceAnimation.stop();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#06130e" />
      <View style={{ flex: 1, backgroundColor: "#06130e" }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>

        {!animationFinished && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              styles.splashContainer,
              { opacity: screenFadeOut },
            ]}
          >
            <View style={styles.centerContainer}>
              <Animated.View
                style={[
                  styles.iconGlowBox,
                  {
                    opacity: iconOpacity,
                    transform: [{ scale: iconScale }],
                  },
                ]}
              >
                <Text style={styles.kiteIcon}>➤</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.brandTextBox,
                  {
                    opacity: brandOpacity,
                    transform: [{ translateY: brandTranslateY }],
                  },
                ]}
              >
                <Text style={styles.appName}>Kite Ledger</Text>
                <Text style={styles.appTagline}>FINANCE & EXPENSE</Text>
              </Animated.View>
            </View>

            <Animated.View
              style={[
                styles.bottomCreditBox,
                {
                  opacity: creditOpacity,
                  transform: [{ translateY: creditTranslateY }],
                },
              ]}
            >
              <Text style={styles.creditLabel}>Designed and developed by</Text>
              <Text style={styles.creditName}>Tharun</Text>
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    backgroundColor: "#06130e",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 60,
    zIndex: 9999,
    elevation: 99,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconGlowBox: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#092218",
    borderWidth: 2,
    borderColor: "#34d399",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    shadowColor: "#34d399",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 12,
  },
  kiteIcon: {
    color: "#34d399",
    fontSize: 44,
    fontWeight: "700",
    transform: [{ rotate: "-45deg" }],
  },
  brandTextBox: {
    alignItems: "center",
  },
  appName: {
    color: "#f0fdf4",
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 0.8,
    fontFamily: "serif",
  },
  appTagline: {
    color: "#8da79c",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginTop: 6,
  },
  bottomCreditBox: {
    alignItems: "center",
    paddingBottom: 20,
  },
  creditLabel: {
    color: "#6e8a7e",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  creditName: {
    color: "#34d399",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
    letterSpacing: 0.6,
  },
});