import { Transaction } from "@iota/iota-sdk/transactions";
import type { Ed25519Keypair } from "@iota/iota-sdk/keypairs/ed25519";
import { client } from "./client";
import { PACKAGE_ID, SENSOR_HUB_ID } from "../config";

/**
 * Build a Programmable Transaction Block that records a single sensor reading.
 * Calls sensor::new_sensor_reading(hub, temp, humidity) and transfers the
 * returned SensorData object to `recipient`.
 */
export function buildSendReadingTx(
  temperature: number,
  humidity: number,
  recipient: string,
): Transaction {
  const tx = new Transaction();

  const [reading] = tx.moveCall({
    target: `${PACKAGE_ID}::sensor::new_sensor_reading`,
    arguments: [
      tx.object(SENSOR_HUB_ID),
      tx.pure.u64(BigInt(Math.round(temperature))),
      tx.pure.u64(BigInt(Math.round(humidity))),
    ],
  });

  tx.transferObjects([reading], tx.pure.address(recipient));
  return tx;
}

/**
 * Build a Programmable Transaction Block that records N sensor readings in
 * a single transaction. The hub counter is incremented N times, and N
 * SensorData objects are created and transferred together.
 *
 * One wallet signature, N anchors. This is the key UX win for auto-mode.
 */
export function buildBatchSendTx(
  readings: { temperature: number; humidity: number }[],
  recipient: string,
): Transaction {
  if (readings.length === 0) {
    throw new Error("buildBatchSendTx: readings array is empty");
  }

  const tx = new Transaction();

  const created = readings.map(({ temperature, humidity }) => {
    const [reading] = tx.moveCall({
      target: `${PACKAGE_ID}::sensor::new_sensor_reading`,
      arguments: [
        tx.object(SENSOR_HUB_ID),
        tx.pure.u64(BigInt(Math.round(temperature))),
        tx.pure.u64(BigInt(Math.round(humidity))),
      ],
    });
    return reading;
  });

  tx.transferObjects(created, tx.pure.address(recipient));
  return tx;
}

/**
 * Sign and submit a transaction. Returns the transaction response with
 * effects, object changes, and balance changes populated.
 */
export async function signAndSend(tx: Transaction, signer: Ed25519Keypair) {
  return client.signAndExecuteTransaction({
    transaction: tx,
    signer,
    options: {
      showEffects: true,
      showObjectChanges: true,
      showBalanceChanges: true,
    },
  });
}