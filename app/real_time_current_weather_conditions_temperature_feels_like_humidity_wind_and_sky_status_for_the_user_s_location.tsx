import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

type Unit = 'celsius' | 'fahrenheit';
type IconName = keyof typeof Ionicons.glyphMap;

interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  isDay: boolean;
  fetchedAt: number;
  placeName: string;
  usingFallback: boolean;
}

const CACHE_KEY = 'weather-now:current';
const UNIT_KEY = 'weather-now:unit';
const FALLBACK = { latitude: 37.7749, longitude: -122.4194, name: 'San Francisco' };
const PRIMARY = '#0EA5E9';

function describeSky(code: number, isDay: boolean): { label: string; icon: IconName; bg: string } {
  if (code === 0) return { label: 'Clear sky', icon: isDay ? 'sunny' : 'moon', bg: isDay ? '#0EA5E9' : '#1E293B' };
  if (code <= 2) return { label: 'Partly cloudy', icon: isDay ? 'partly-sunny' : 'cloudy-night', bg: isDay ? '#38BDF8' : '#334155' };
  if (code === 3) return { label: 'Overcast', icon: 'cloudy', bg: '#64748B' };
  if (code === 45 || code === 48) return { label: 'Foggy', icon: 'cloudy', bg: '#94A3B8' };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: 'rainy', bg: '#475569' };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: 'rainy', bg: '#3B82F6' };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: 'snow', bg: '#7DD3FC' };
  if (code >= 80 && code <= 82) return { label: 'Rain showers', icon: 'rainy', bg: '#2563EB' };
  if (code >= 85 && code <= 86) return { label: 'Snow showers', icon: 'snow', bg: '#60A5FA' };
  if (code >= 95) return { label: 'Thunderstorm', icon: 'thunderstorm', bg: '#312E81' };
  return { label: 'Unknown', icon: 'help-circle', bg: '#64748B' };
}

function compass(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(deg / 45) % 8];
}

async function resolvePosition(): Promise<{ latitude: number; longitude: number; name: string; fallback: boolean }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { ...FALLBACK, fallback: true };
    const pos =
      (await Location.getLastKnownPositionAsync()) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    const { latitude, longitude } = pos.coords;
    let name = 'Current location';
    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const p = places[0];
      if (p) name = p.city ?? p.subregion ?? p.region ?? name;
    } catch {
      // reverse geocoding is optional
    }
    return { latitude, longitude, name, fallback: false };
  } catch {
    return { ...FALLBACK, fallback: true };
  }
}

async function fetchWeather(unit: Unit): Promise<CurrentWeather> {
  const pos = await resolvePosition();
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${pos.latitude}&longitude=${pos.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,is_day` +
    `&temperature_unit=${unit}&wind_speed_unit=${unit === 'celsius' ? 'kmh' : 'mph'}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather service error (${res.status})`);
  const json = (await res.json()) as {
    current: {
      temperature_2m: number;
      relative_humidity_2m: number;
      apparent_temperature: number;
      weather_code: number;
      wind_speed_10m: number;
      wind_direction_10m: number;
      is_day: number;
    };
  };
  const c = json.current;
  return {
    temperature: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    weatherCode: c.weather_code,
    isDay: c.is_day === 1,
    fetchedAt: Date.now(),
    placeName: pos.name,
    usingFallback: pos.fallback,
  };
}

function StatCard({ icon, label, value, sub, index }: { icon: IconName; label: string; value: string; sub?: string; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(150 + index * 80)} className="w-[48%] mb-4 rounded-2xl bg-white p-4 border border-slate-100 shadow-lg">
      <View className="h-10 w-10 rounded-xl bg-sky-50 items-center justify-center mb-3">
        <Ionicons name={icon} size={20} color={PRIMARY} />
      </View>
      <Text className="text-xs text-gray-400 font-medium uppercase">{label}</Text>
      <Text className="text-2xl font-semibold text-slate-900 mt-1">{value}</Text>
      {sub ? <Text className="text-xs text-gray-400 mt-1">{sub}</Text> : null}
    </Animated.View>
  );
}

export default function RealTimeCurrentWeatherConditionsTemperatureFeelsLikeHumidityWindAndSkyStatusForTheUserSLocation() {
  const [unit, setUnit] = useState<Unit>('celsius');
  const [weather, setWeather] = useState<CurrentWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (u: Unit) => {
    setError(null);
    try {
      const data = await fetchWeather(u);
      setWeather(data);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ unit: u, data }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load weather');
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      let u: Unit = 'celsius';
      try {
        const savedUnit = await AsyncStorage.getItem(UNIT_KEY);
        if (savedUnit === 'fahrenheit' || savedUnit === 'celsius') u = savedUnit;
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached && active) {
          const parsed = JSON.parse(cached) as { unit: Unit; data: CurrentWeather };
          if (parsed.unit === u) setWeather(parsed.data);
        }
      } catch {
        // cache is best-effort
      }
      if (!active) return;
      setUnit(u);
      await load(u);
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(unit);
    setRefreshing(false);
  }, [load, unit]);

  const toggleUnit = useCallback(async () => {
    const next: Unit = unit === 'celsius' ? 'fahrenheit' : 'celsius';
    setUnit(next);
    await AsyncStorage.setItem(UNIT_KEY, next).catch(() => undefined);
    setRefreshing(true);
    await load(next);
    setRefreshing(false);
  }, [load, unit]);

  const sky = useMemo(() => (weather ? describeSky(weather.weatherCode, weather.isDay) : null), [weather]);
  const deg = unit === 'celsius' ? '°C' : '°F';
  const speed = unit === 'celsius' ? 'km/h' : 'mph';

  if (loading && !weather) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Stack.Screen options={{ title: 'Current Conditions' }} />
        <ActivityIndicator size="large" color={PRIMARY} />
        <Text className="text-base text-gray-500 mt-4">Finding your location…</Text>
      </View>
    );
  }

  if (!weather || !sky) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Stack.Screen options={{ title: 'Current Conditions' }} />
        <Ionicons name="cloud-offline" size={72} color="#94A3B8" />
        <Text className="text-2xl font-semibold text-slate-900 mt-4">No weather data</Text>
        <Text className="text-base text-gray-500 text-center mt-2">{error ?? 'Check your connection and try again.'}</Text>
        <TouchableOpacity activeOpacity={0.75} onPress={onRefresh} className="mt-6 rounded-xl px-6 py-3" style={{ backgroundColor: PRIMARY }}>
          <Text className="text-white font-semibold text-base">Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const updated = new Date(weather.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={{ backgroundColor: sky.bg }} className="rounded-b-[36px] pb-10">
          <SafeAreaView edges={['top']}>
            <View className="flex-row items-center justify-between px-6 pt-2">
              <View className="flex-row items-center flex-1">
                <Ionicons name={weather.usingFallback ? 'location-outline' : 'location'} size={18} color="#fff" />
                <Text className="text-white text-lg font-semibold ml-1" numberOfLines={1}>{weather.placeName}</Text>
              </View>
              <TouchableOpacity activeOpacity={0.75} onPress={toggleUnit} className="rounded-full bg-white/20 px-4 py-2">
                <Text className="text-white font-semibold">{deg}</Text>
              </TouchableOpacity>
            </View>
            <Animated.View entering={FadeInDown} className="items-center mt-8 px-6">
              <Ionicons name={sky.icon} size={96} color="#fff" />
              <Text className="text-white font-bold mt-2" style={{ fontSize: 80, lineHeight: 92 }}>
                {Math.round(weather.temperature)}°
              </Text>
              <Text className="text-white text-2xl font-semibold">{sky.label}</Text>
              <Text className="text-white/80 text-base mt-1">Feels like {Math.round(weather.feelsLike)}{deg}</Text>
              <Text className="text-white/60 text-xs font-medium mt-3">Updated {updated} · Pull to refresh</Text>
            </Animated.View>
          </SafeAreaView>
        </View>

        {weather.usingFallback ? (
          <View className="mx-6 mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 flex-row items-center">
            <Ionicons name="information-circle" size={22} color="#D97706" />
            <Text className="text-sm text-amber-800 ml-2 flex-1">
              Location access unavailable — showing {FALLBACK.name}. Enable location to see your local weather.
            </Text>
          </View>
        ) : null}

        {error ? (
          <View className="mx-6 mt-5 rounded-2xl bg-rose-50 border border-rose-200 p-4 flex-row items-center">
            <Ionicons name="warning" size={20} color="#E11D48" />
            <Text className="text-sm text-rose-700 ml-2 flex-1">Showing cached data: {error}</Text>
          </View>
        ) : null}

        <View className="px-6 mt-6">
          <Text className="text-2xl font-semibold text-slate-900 mb-4">Details</Text>
          <View className="flex-row flex-wrap justify-between">
            <StatCard index={0} icon="thermometer" label="Temperature" value={`${Math.round(weather.temperature)}${deg}`} />
            <StatCard index={1} icon="body" label="Feels like" value={`${Math.round(weather.feelsLike)}${deg}`}
              sub={weather.feelsLike < weather.temperature ? 'Cooler than actual' : weather.feelsLike > weather.temperature ? 'Warmer than actual' : 'Same as actual'} />
            <StatCard index={2} icon="water" label="Humidity" value={`${Math.round(weather.humidity)}%`}
              sub={weather.humidity > 70 ? 'Humid' : weather.humidity < 30 ? 'Dry' : 'Comfortable'} />
            <StatCard index={3} icon="navigate" label="Wind" value={`${Math.round(weather.windSpeed)} ${speed}`}
              sub={`From ${compass(weather.windDirection)} (${Math.round(weather.windDirection)}°)`} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}