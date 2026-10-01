import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ApiError, Coordinates, CurrentWeather, SkyStatus, Units } from '../types';

// Open-Meteo is free and keyless, so the app works in preview with no env vars.
const BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_KEY = 'weather-now:last';
const UNITS_KEY = 'weather-now:units';

export function describeWeatherCode(code: number, isDay: boolean): SkyStatus {
  if (code === 0) return { condition: 'clear', label: 'Clear sky', icon: isDay ? 'sunny' : 'moon' };
  if (code === 1 || code === 2)
    return { condition: 'partly_cloudy', label: 'Partly cloudy', icon: isDay ? 'partly-sunny' : 'cloudy-night' };
  if (code === 3) return { condition: 'cloudy', label: 'Overcast', icon: 'cloudy' };
  if (code === 45 || code === 48) return { condition: 'fog', label: 'Fog', icon: 'reorder-three' };
  if (code >= 51 && code <= 57) return { condition: 'drizzle', label: 'Drizzle', icon: 'rainy-outline' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return { condition: 'rain', label: 'Rain', icon: 'rainy' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return { condition: 'snow', label: 'Snow', icon: 'snow' };
  if (code >= 95) return { condition: 'thunderstorm', label: 'Thunderstorm', icon: 'thunderstorm' };
  return { condition: 'unknown', label: 'Unknown', icon: 'help-circle-outline' };
}

export function unitLabels(units: Units): { temp: string; wind: string } {
  return units === 'metric' ? { temp: '°C', wind: 'km/h' } : { temp: '°F', wind: 'mph' };
}

export function windDirectionLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    weather_code: number;
    is_day: number;
  };
}

export async function fetchCurrentWeather(
  coords: Coordinates,
  units: Units = 'metric',
  placeName: string | null = null,
): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: String(coords.latitude),
    longitude: String(coords.longitude),
    current:
      'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day',
    temperature_unit: units === 'metric' ? 'celsius' : 'fahrenheit',
    wind_speed_unit: units === 'metric' ? 'kmh' : 'mph',
    timezone: 'auto',
  });

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}?${params.toString()}`);
  } catch {
    throw { message: 'Network unavailable. Check your connection.' } satisfies ApiError;
  }
  if (!res.ok) {
    throw { message: `Weather service error (${res.status})`, status: res.status } satisfies ApiError;
  }
  const data = (await res.json()) as OpenMeteoResponse;
  const c = data.current;
  if (!c) throw { message: 'No weather data returned.' } satisfies ApiError;

  const isDay = c.is_day === 1;
  const weather: CurrentWeather = {
    coords,
    placeName,
    temperature: c.temperature_2m,
    feelsLike: c.apparent_temperature,
    humidity: c.relative_humidity_2m,
    windSpeed: c.wind_speed_10m,
    windDirection: c.wind_direction_10m,
    weatherCode: c.weather_code,
    isDay,
    sky: describeWeatherCode(c.weather_code, isDay),
    units,
    observedAt: c.time,
    fetchedAt: Date.now(),
  };
  await saveCachedWeather(weather);
  return weather;
}

export async function saveCachedWeather(w: CurrentWeather): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(w));
  } catch {
    // cache write is best-effort
  }
}

export async function loadCachedWeather(): Promise<CurrentWeather | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CurrentWeather) : null;
  } catch {
    return null;
  }
}

export async function loadUnits(): Promise<Units> {
  try {
    const v = await AsyncStorage.getItem(UNITS_KEY);
    return v === 'imperial' ? 'imperial' : 'metric';
  } catch {
    return 'metric';
  }
}

export async function saveUnits(units: Units): Promise<void> {
  try {
    await AsyncStorage.setItem(UNITS_KEY, units);
  } catch {
    // best-effort
  }
}

export function toApiError(e: unknown): ApiError {
  if (e && typeof e === 'object' && 'message' in e) {
    return { message: String((e as { message: unknown }).message) };
  }
  return { message: 'Something went wrong.' };
}