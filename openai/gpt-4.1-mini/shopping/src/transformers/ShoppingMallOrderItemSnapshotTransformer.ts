import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        shopping_mall_order_item_id: true,
        shopping_mall_order_id: true,
        product_name: true,
        variant_sku: true,
        variant_option_values: true,
        unit_price: true,
        quantity: true,
        item_status: true,
        seller_shop_name: true,
        seller_logo_uri: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        orderItem: true,
        order: true,
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot> {
    return {
      id: input.id,
      shoppingMallOrderItemId: input.shopping_mall_order_item_id,
      shoppingMallOrderId: input.shopping_mall_order_id,
      productName: input.product_name,
      variantSku: input.variant_sku,
      variantOptionValues: input.variant_option_values,
      unitPrice: input.unit_price,
      quantity: input.quantity,
      itemStatus: input.item_status,
      sellerShopName: input.seller_shop_name,
      sellerLogoUri: input.seller_logo_uri ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
