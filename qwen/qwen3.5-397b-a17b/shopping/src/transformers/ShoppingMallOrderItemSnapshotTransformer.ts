import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer } from "./ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer";

export namespace ShoppingMallOrderItemSnapshotTransformer {
  export type Payload = Prisma.shopping_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        product_description: true,
        variant_sku_code: true,
        variant_price: true,
        seller_shop_name: true,
        seller_shop_logo: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        variantOptions:
          ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot> {
    return {
      id: input.id,
      orderItemId: input.orderItem.id,
      productName: input.product_name,
      productDescription: input.product_description,
      variantSkuCode: input.variant_sku_code,
      variantPrice: input.variant_price,
      sellerShopName: input.seller_shop_name,
      sellerShopLogo: input.seller_shop_logo ?? null,
      createdAt: toISOStringSafe(input.created_at),
      variantOptions: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer.transform,
      ),
    };
  }
}
