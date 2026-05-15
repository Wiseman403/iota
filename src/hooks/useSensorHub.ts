import { useQuery } from "@tanstack/react-query";
import { client } from "../iota/client";
import { SENSOR_HUB_ID } from "../config";

export interface SensorHubData {
  /** The on-chain readings counter, as a string (u64). */
  readingsRecorded: string;
}

/**
 * Live read of the deployed SensorHub object. Auto-refetches every 15 seconds
 * and is invalidated by the QuickSendCard after a successful send so the
 * counter visibly increments.
 */
export function useSensorHub() {
  return useQuery({
    queryKey: ["sensorHub", SENSOR_HUB_ID],
    queryFn: async (): Promise<SensorHubData> => {
      const obj = await client.getObject({
        id: SENSOR_HUB_ID,
        options: { showContent: true },
      });
      const content = obj.data?.content;
      if (content && content.dataType === "moveObject") {
        const fields = content.fields as { readings_recorded: string };
        return { readingsRecorded: fields.readings_recorded };
      }
      throw new Error("SensorHub object missing or not a Move object");
    },
    refetchInterval: 15_000,
  });
}