import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallProductInventoryHistoryAtSummaryTransformer {
  export type Payload =
    Prisma.shopping_mall_product_inventory_historiesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        quantity_change: true,
        reason: true,
        created_at: true,
        variant: {
          select: {
            inventoryHistories: {
              select: {
                quantity_change: true,
                created_at: true,
              },
            } satisfies Prisma.shopping_mall_product_inventory_historiesFindManyArgs,
          },
        } satisfies Prisma.shopping_mall_product_variantsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_product_inventory_historiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallProductInventoryHistory.ISummary> {
    const runningBalance = input.variant.inventoryHistories
      .filter((h) => h.created_at <= input.created_at)
      .reduce((sum, h) => sum + h.quantity_change, 0);
    return {
      id: input.id,
      quantityChange: input.quantity_change,
      reason: input.reason,
      runningBalance: runningBalance,
      createdAt: input.created_at.toISOString(),
    };
  }
}
