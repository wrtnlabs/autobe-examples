import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_order_id: true,
        shopping_mall_product_variant_id: true,
        seller_snapshot_id: true,
        shopping_mall_shipment_id: true,
        seller_price_at_purchase: true,
        quantity: true,
        line_item_status: true,
        placed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem.ISummary> {
    return {
      id: input.id,
      shopping_mall_order_id: input.shopping_mall_order_id,
      shopping_mall_product_variant_id: input.shopping_mall_product_variant_id,
      seller_snapshot_id: input.seller_snapshot_id,
      shopping_mall_shipment_id: input.shopping_mall_shipment_id ?? null,
      seller_price_at_purchase: input.seller_price_at_purchase,
      quantity: input.quantity,
      line_item_status: input.line_item_status,
      placed_at: input.placed_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
