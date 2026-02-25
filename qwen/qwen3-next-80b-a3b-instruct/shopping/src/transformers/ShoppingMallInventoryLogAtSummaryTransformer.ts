import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryLog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryLogAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_inventory_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        change_quantity: true,
        reason: true,
        reference_id: true,
        notes: true,
        created_at: true,
        updated_at: true,
        variant: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_inventory_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryLog.ISummary> {
    return {
      id: input.id,
      variant_id: input.variant.id,
      change_quantity: Number(input.change_quantity),
      reason: input.reason as any satisfies
        | "restock"
        | "order"
        | "cancellation"
        | "refund"
        | "adjustment"
        | "loss" as
        | "restock"
        | "order"
        | "cancellation"
        | "refund"
        | "adjustment"
        | "loss",
      reference_id: input.reference_id ?? undefined,
      notes: input.notes ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
    };
  }
}
