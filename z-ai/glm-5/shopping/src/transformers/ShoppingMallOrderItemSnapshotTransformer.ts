import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemSnapshotAtVariantOptionTransformer } from "./ShoppingMallOrderItemSnapshotAtVariantOptionTransformer";

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
        price: true,
        seller_shop_name: true,
        seller_logo_image: true,
        created_at: true,
        variantOptions:
          ShoppingMallOrderItemSnapshotAtVariantOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot> {
    return {
      id: input.id,
      productName: input.product_name,
      productDescription: input.product_description,
      price: input.price,
      sellerShopName: input.seller_shop_name,
      sellerLogoImage: input.seller_logo_image ?? null,
      variantOptions: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallOrderItemSnapshotAtVariantOptionTransformer.transform,
      ),
      createdAt: input.created_at.toISOString(),
    };
  }
}
