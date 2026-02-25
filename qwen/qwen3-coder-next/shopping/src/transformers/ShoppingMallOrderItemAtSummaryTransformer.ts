import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
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
import { ShoppingMallOrderProductSnapshotsAtSummaryTransformer } from "./ShoppingMallOrderProductSnapshotsAtSummaryTransformer";
import { ShoppingMallOrderSellerProfileSnapshotsAtSummaryTransformer } from "./ShoppingMallOrderSellerProfileSnapshotsAtSummaryTransformer";
import { ShoppingMallOrderVariantSnapshotsAtSummaryTransformer } from "./ShoppingMallOrderVariantSnapshotsAtSummaryTransformer";

export namespace ShoppingMallOrderItemAtSummaryTransformer {
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
  ): Promise<IShoppingMallOrderItem.ISummary> {
    return {
      id: input.id,
      quantity: input.quantity,
      unit_price: input.unit_price,
      total_price: input.total_price,
      item_status: input.item_status as any,
      original_product_name: input.original_product_name,
      original_variant_options: input.original_variant_options,
      created_at: toISOStringSafe(input.created_at),
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
