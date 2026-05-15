import { useMemo } from "react";
import { useOwnedSensorData } from "./useOwnedSensorData";

export interface ReadingStats {
  count: number;
  avgTemperature: number | null;
  avgHumidity: number | null;
  minTemperature: number | null;
  maxTemperature: number | null;
  highTempCount: number;
  loading: boolean;
  error: boolean;
}

/**
 * Aggregate stats computed from the user's owned SensorData.
 * Wraps useOwnedSensorData and reduces the array to scalars for the StatsCard.
 *
 * - avgTemperature / avgHumidity: arithmetic mean across all readings.
 * - minTemperature / maxTemperature: range observed.
 * - highTempCount: number of readings ≥ highTempThreshold (UC2 visual highlight).
 */
export function useReadingStats(
  owner: string | null,
  highTempThreshold = 30,
): ReadingStats {
  const query = useOwnedSensorData(owner);

  return useMemo<ReadingStats>(() => {
    const readings = query.data ?? [];
    const loading = query.isLoading;
    const error = Boolean(query.error);

    if (readings.length === 0) {
      return {
        count: 0,
        avgTemperature: null,
        avgHumidity: null,
        minTemperature: null,
        maxTemperature: null,
        highTempCount: 0,
        loading,
        error,
      };
    }

    let sumT = 0;
    let sumH = 0;
    let minT = Number.POSITIVE_INFINITY;
    let maxT = Number.NEGATIVE_INFINITY;
    let highCount = 0;

    for (const r of readings) {
      sumT += r.temperature;
      sumH += r.humidity;
      if (r.temperature < minT) minT = r.temperature;
      if (r.temperature > maxT) maxT = r.temperature;
      if (r.temperature >= highTempThreshold) highCount += 1;
    }

    return {
      count: readings.length,
      avgTemperature: sumT / readings.length,
      avgHumidity: sumH / readings.length,
      minTemperature: minT,
      maxTemperature: maxT,
      highTempCount: highCount,
      loading,
      error,
    };
  }, [query.data, query.isLoading, query.error, highTempThreshold]);
}