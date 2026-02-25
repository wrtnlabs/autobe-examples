import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallInventoryHistoryTransformer {
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
          select: {
            id: true,
          },
        },
        orderItem: {
          select: {
            id: true,
          },
        },
        seller: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_inventory_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallInventoryHistory> {
    return {
      reason: [input.reason],
      created_at_start: toISOStringSafe(input.created_at),
      created_at_end: toISOStringSafe(input.created_at),
      variant_id: input.variant.id,
      order_item_id: input.orderItem?.id,
      seller_id: input.seller?.id,
      search: input.metadata ?? undefined,
      page: 1,
      limit: 20,
      sort_by: "created_at",
      sort_order: "desc",
    };
  }
}
