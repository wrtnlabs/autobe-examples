import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryRecordAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_inventory_recordsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        reference_id: true,
        created_at: true,
        variant: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_inventory_recordsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryRecord.ISummary> {
    return {
      id: input.id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      reference_id: input.reference_id ?? undefined,
      created_at: input.created_at.toISOString(),
    };
  }
}
