export type Units = 'metric' | 'imperial';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export type SkyCondition =
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunderstorm'
  | 'unknown';

export interface SkyStatus {
  condition: SkyCondition;
  label: string;
  /** Ionicons glyph name */
  icon: string;
}

export interface CurrentWeather {
  coords: Coordinates;
  placeName: string | null;
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  weatherCode: number;
  isDay: boolean;
  sky: SkyStatus;
  units: Units;
  /** ISO timestamp of observation */
  observedAt: string;
  /** ms epoch when fetched */
  fetchedAt: number;
}

export type LoadState = 'idle' | 'loading' | 'success' | 'error';

export interface ApiError {
  message: string;
  status?: number;
}