import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer } from "./ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer";

export namespace ShoppingMallOrderItemSnapshotAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_order_item_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        product_name: true,
        price: true,
        seller_shop_name: true,
        seller_logo_image: true,
        created_at: true,
        variantOptions:
          ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot.ISummary> {
    return {
      id: input.id,
      product_name: input.product_name,
      price: input.price,
      seller_shop_name: input.seller_shop_name,
      seller_logo_image: input.seller_logo_image ?? null,
      variant_options: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallOrderItemSnapshotVariantOptionAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
    };
  }
}
