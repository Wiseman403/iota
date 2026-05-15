/**
 * Mock sensor data generator.
 * Box-Muller transform for normal-distributed values + optional anomaly
 * injection (10% chance to widen the standard deviation 4×, simulating a
 * faulty reading that the UC2 visual highlight should flag).
 */

export interface GeneratorConfig {
  tempMean: number;
  tempStd: number;
  humidityMean: number;
  humidityStd: number;
  injectAnomalies: boolean;
}

export interface MockReading {
  temperature: number;
  humidity: number;
}

/** Standard Box-Muller — returns a sample from N(mean, std). */
function gaussian(mean: number, std: number): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function generateReading(config: GeneratorConfig): MockReading {
  const isAnomaly = config.injectAnomalies && Math.random() < 0.1;
  const tStd = isAnomaly ? config.tempStd * 4 : config.tempStd;
  const hStd = isAnomaly ? config.humidityStd * 4 : config.humidityStd;

  // Clamp to physically plausible ranges for our sliders.
  const temperature = Math.max(0, Math.min(50, Math.round(gaussian(config.tempMean, tStd))));
  const humidity = Math.max(0, Math.min(100, Math.round(gaussian(config.humidityMean, hStd))));

  return { temperature, humidity };
}

export function generateBatch(
  config: GeneratorConfig,
  size: number,
): MockReading[] {
  const out: MockReading[] = [];
  for (let i = 0; i < size; i++) out.push(generateReading(config));
  return out;
}