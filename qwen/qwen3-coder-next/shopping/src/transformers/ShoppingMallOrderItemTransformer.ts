import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallOrderProductSnapshotsAtSummaryTransformer } from "./ShoppingMallOrderProductSnapshotsAtSummaryTransformer";
import { ShoppingMallOrderSellerProfileSnapshotsAtSummaryTransformer } from "./ShoppingMallOrderSellerProfileSnapshotsAtSummaryTransformer";
import { ShoppingMallOrderVariantSnapshotsAtSummaryTransformer } from "./ShoppingMallOrderVariantSnapshotsAtSummaryTransformer";

export namespace ShoppingMallOrderItemTransformer {
  export type Payload = Prisma.shopping_mall_order_itemsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        quantity: true,
        unit_price: true,
        total_price: true,
        item_status: true,
        original_product_name: true,
        original_variant_options: true,
        created_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        productSnapshot:
          ShoppingMallOrderProductSnapshotsAtSummaryTransformer.select(),
        variantSnapshot:
          ShoppingMallOrderVariantSnapshotsAtSummaryTransformer.select(),
        sellerProfileSnapshot:
          ShoppingMallOrderSellerProfileSnapshotsAtSummaryTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_itemsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItem> {
    return {
      id: input.id,
      quantity: input.quantity,
      unitPrice: input.unit_price,
      totalPrice: input.total_price,
      itemStatus: input.item_status as IShoppingMallOrderItem["itemStatus"],
      originalProductName: input.original_product_name,
      originalVariantOptions: input.original_variant_options,
      createdAt: toISOStringSafe(input.created_at),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      productSnapshot:
        await ShoppingMallOrderProductSnapshotsAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      variantSnapshot:
        await ShoppingMallOrderVariantSnapshotsAtSummaryTransformer.transform(
          input.variantSnapshot,
        ),
      sellerProfileSnapshot:
        await ShoppingMallOrderSellerProfileSnapshotsAtSummaryTransformer.transform(
          input.sellerProfileSnapshot,
        ),
    };
  }
}
