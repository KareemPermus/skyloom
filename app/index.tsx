import React, { useCallback, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { loadCachedWeather, unitLabels } from '../src/api/client';
import { colors, gradients } from '../src/theme';
import type { CurrentWeather } from '../src/types';

const CURRENT_ROUTE =
  '/real_time_current_weather_conditions_temperature_feels_like_humidity_wind_and_sky_status_for_the_user_s_location';

export default function Home() {
  const router = useRouter();
  const [cached, setCached] = useState<CurrentWeather | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadCachedWeather().then((w) => {
        if (active) setCached(w);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const go = () => router.push(CURRENT_ROUTE as never);

  return (
    <LinearGradient colors={gradients.brand} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1 px-6 py-4">
        <Animated.View entering={FadeInDown.duration(500)} className="mt-10 items-center">
          <View className="h-24 w-24 items-center justify-center rounded-3xl bg-white/20">
            <Ionicons name="partly-sunny" size={56} color={colors.white} />
          </View>
          <Text className="mt-6 text-4xl font-bold text-white">Weather Now</Text>
          <Text className="mt-2 text-center text-base text-white/80">
            Real-time conditions for wherever you are, at a glance.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(500)} className="mt-10">
          {cached ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={go}
              className="rounded-2xl bg-white/15 p-5 border border-white/25"
            >
              <Text className="text-xs font-medium uppercase text-white/70">Last checked</Text>
              <View className="mt-2 flex-row items-center justify-between">
                <View>
                  <Text className="text-5xl font-bold text-white">
                    {Math.round(cached.temperature)}
                    {unitLabels(cached.units).temp}
                  </Text>
                  <Text className="text-base text-white/85">{cached.sky.label}</Text>
                  {cached.placeName ? (
                    <Text className="mt-1 text-xs text-white/70">{cached.placeName}</Text>
                  ) : null}
                </View>
                <Ionicons
                  name={cached.sky.icon as keyof typeof Ionicons.glyphMap}
                  size={64}
                  color={colors.white}
                />
              </View>
            </TouchableOpacity>
          ) : (
            <View className="rounded-2xl bg-white/15 p-5 border border-white/25">
              {[
                { icon: 'thermometer-outline', text: 'Temperature & feels-like' },
                { icon: 'water-outline', text: 'Humidity' },
                { icon: 'speedometer-outline', text: 'Wind speed & direction' },
                { icon: 'cloud-outline', text: 'Sky conditions' },
              ].map((row) => (
                <View key={row.text} className="flex-row items-center py-2">
                  <Ionicons name={row.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.white} />
                  <Text className="ml-3 text-base text-white">{row.text}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        <View className="flex-1" />

        <Animated.View entering={FadeInDown.delay(300).duration(500)}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={go}
            className="flex-row items-center justify-center rounded-xl bg-white py-4"
          >
            <Ionicons name="navigate" size={20} color={colors.primaryDark} />
            <Text className="ml-2 text-lg font-semibold text-sky-700">Check my weather</Text>
          </TouchableOpacity>
          <Text className="mt-3 text-center text-xs font-medium text-white/70">
            Uses your location only while the app is open
          </Text>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}