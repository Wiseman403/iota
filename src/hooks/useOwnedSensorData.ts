import { useQuery } from "@tanstack/react-query";
import { client } from "../iota/client";
import { PACKAGE_ID } from "../config";

/**
 * One SensorData reading, parsed and ready to render.
 * `version` is used as a sort key — IOTA versions are monotonically increasing,
 * so the newest object owned by the user has the highest version.
 */
export interface SensorReading {
  objectId: string;
  version: string;
  digest: string;
  temperature: number;
  humidity: number;
}

interface MoveObjectFields {
  id: { id: string };
  temperature: string;
  humidity: string;
}

/**
 * Fetch every SensorData object owned by `owner`. Returns them sorted
 * newest-first (highest version first). Auto-refetches every 30 seconds
 * and is invalidated by the QuickSendCard after a successful send.
 */
export function useOwnedSensorData(owner: string | null) {
  return useQuery({
    queryKey: ["ownedSensorData", owner],
    enabled: Boolean(owner),
    queryFn: async (): Promise<SensorReading[]> => {
      const readings: SensorReading[] = [];
      let cursor: string | null = null;
      let hasNextPage = true;

      // Paginate through all owned objects matching our SensorData type.
      while (hasNextPage) {
        const page = await client.getOwnedObjects({
          owner: owner!,
          filter: { StructType: `${PACKAGE_ID}::sensor::SensorData` },
          options: { showType: true, showContent: true },
          cursor,
        });

        for (const item of page.data) {
          const content = item.data?.content;
          if (content?.dataType === "moveObject") {
            const fields = content.fields as unknown as MoveObjectFields;
            readings.push({
              objectId: item.data!.objectId,
              version: item.data!.version,
              digest: item.data!.digest,
              temperature: Number(fields.temperature),
              humidity: Number(fields.humidity),
            });
          }
        }

        hasNextPage = page.hasNextPage;
        cursor = page.nextCursor ?? null;
      }

      // Sort newest-first.
      readings.sort((a, b) => {
        const av = BigInt(a.version);
        const bv = BigInt(b.version);
        if (av > bv) return -1;
        if (av < bv) return 1;
        return 0;
      });

      return readings;
    },
    refetchInterval: 30_000,
  });
}