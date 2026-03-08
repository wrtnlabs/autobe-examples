import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemAtSummaryTransformer } from "./ShoppingMallOrderItemAtSummaryTransformer";
import { ShoppingMallOrderItemSnapshotVariantOptionTransformer } from "./ShoppingMallOrderItemSnapshotVariantOptionTransformer";

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
        orderItem: ShoppingMallOrderItemAtSummaryTransformer.select(),
        variantOptions:
          ShoppingMallOrderItemSnapshotVariantOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot> {
    return {
      id: input.id,
      variant_options: await ArrayUtil.asyncMap(
        input.variantOptions,
        ShoppingMallOrderItemSnapshotVariantOptionTransformer.transform,
      ),
      order_item: await ShoppingMallOrderItemAtSummaryTransformer.transform(
        input.orderItem,
      ),
      product_name: input.product_name,
      product_description: input.product_description,
      price: input.price,
      seller_shop_name: input.seller_shop_name,
      seller_logo_image: input.seller_logo_image ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
