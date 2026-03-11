import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallInventoryRecordAtHistoryListTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        timestamp: true,
        variant: { select: { id: true } },
      },
    } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IEcommerceMallInventoryRecord.IHistoryList> {
    // Transform records and compute running_total
    const records = input.map((record) => ({
      id: record.id,
      variant_id: record.variant.id,
      quantity_change: record.quantity_change,
      reason: typia.assert<
        "order" | "cancellation" | "refund" | "adjustment" | "restock" | "loss"
      >(record.reason),
      timestamp: toISOStringSafe(record.timestamp),
      running_total: 0, // placeholder, will be computed
    }));
    // Sort ascending by timestamp for cumulative sum calculation
    const sortedAscending = [...records].sort((a, b) =>
      toISOStringSafe(a.timestamp).localeCompare(toISOStringSafe(b.timestamp)),
    );
    // Compute running totals
    let runningSum = 0;
    const runningTotals = new Map<string, number>();
    for (const record of sortedAscending) {
      runningSum += record.quantity_change;
      runningTotals.set(record.id, runningSum);
    }
    // Map running totals back to original records
    const recordsWithRunningTotal = records.map((record) => ({
      ...record,
      running_total: runningTotals.get(record.id)!,
    }));
    return { records: recordsWithRunningTotal };
  }
}
