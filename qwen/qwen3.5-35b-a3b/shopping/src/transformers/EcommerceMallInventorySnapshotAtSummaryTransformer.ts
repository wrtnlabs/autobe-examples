import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EcommerceMallInventoryRecordAtSummaryTransformer } from "./EcommerceMallInventoryRecordAtSummaryTransformer";

export namespace EcommerceMallInventorySnapshotAtSummaryTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        variant_id: true,
        quantity: true,
        reserved_quantity: true,
        reason: true,
        notes: true,
        created_at: true,
        inventoryRecord:
          EcommerceMallInventoryRecordAtSummaryTransformer.select(),
      },
    } satisfies Prisma.ecommerce_mall_inventory_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventorySnapshot.ISummary> {
    return {
      id: input.id,
      inventoryRecord:
        await EcommerceMallInventoryRecordAtSummaryTransformer.transform(
          input.inventoryRecord,
        ),
      variantId: input.variant_id,
      quantity: input.quantity,
      reservedQuantity: input.reserved_quantity,
      reason: input.reason ?? null,
      notes: input.notes ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
