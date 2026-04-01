import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallOrderItemSnapshotAtSummaryTransformer {
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
        orderItem: true,
        variantOptions: true,
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot.ISummary> {
    return {
      id: input.id,
      productName: input.product_name,
      variantSkuCode: input.variant_sku_code,
      variantPrice: input.variant_price,
      sellerShopName: input.seller_shop_name,
      sellerShopLogo: input.seller_shop_logo ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
