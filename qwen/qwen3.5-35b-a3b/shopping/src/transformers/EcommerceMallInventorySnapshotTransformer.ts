import { IEcommerceMallInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallInventorySnapshotTransformer {
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
        inventoryRecord: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_mall_inventory_recordsFindManyArgs,
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
      quantity: input.quantity,
      reserved_quantity: input.reserved_quantity,
      reason: input.reason ?? undefined,
      notes: input.notes ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
