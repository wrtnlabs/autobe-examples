import { IEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallInventorySnapshotTransformer {
  export type Payload = Prisma.ecommerce_mall_inventory_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        inventoryRecord: { select: { id: true } },
        variant_id: true,
        quantity: true,
        reserved_quantity: true,
        reason: true,
        notes: true,
        created_at: true,
      },
    } satisfies Prisma.ecommerce_mall_inventory_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEcommerceMallInventorySnapshot> {
    return {
      id: input.id,
      inventory_record_id: input.inventoryRecord.id,
      variant_id: input.variant_id,
      quantity: Number(input.quantity),
      reserved_quantity: Number(input.reserved_quantity),
      reason: input.reason ?? undefined,
      notes: input.notes ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
