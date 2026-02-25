import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryHistoryAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_inventory_historiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        metadata: true,
        variant: {
          select: { id: true },
        },
        orderItem: {
          select: { id: true },
        },
        seller: {
          select: { id: true },
        },
      },
    } satisfies Prisma.shopping_mall_inventory_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryHistory.ISummary> {
    return {
      id: input.id,
      quantity_change: input.quantity_change,
      reason: input.reason,
      created_at: toISOStringSafe(input.created_at),
      metadata: input.metadata ?? undefined,
      shopping_mall_product_variant_id: input.variant.id,
      shopping_mall_order_item_id: input.orderItem?.id ?? null,
      shopping_mall_seller_id: input.seller?.id ?? null,
    };
  }
}
