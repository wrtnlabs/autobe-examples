import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderAtSummaryTransformer } from "./ShoppingMallOrderAtSummaryTransformer";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "./ShoppingMallProductSnapshotAtSummaryTransformer";
import { ShoppingMallProductVariantSnapshotAtSummaryTransformer } from "./ShoppingMallProductVariantSnapshotAtSummaryTransformer";
import { ShoppingMallSellerAtSummaryTransformer } from "./ShoppingMallSellerAtSummaryTransformer";

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
        status: true,
        created_at: true,
        order: ShoppingMallOrderAtSummaryTransformer.select(),
        productSnapshot:
          ShoppingMallProductSnapshotAtSummaryTransformer.select(),
        productVariantSnapshot:
          ShoppingMallProductVariantSnapshotAtSummaryTransformer.select(),
        seller: ShoppingMallSellerAtSummaryTransformer.select(),
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
      status: typia.assert<
        "PAID" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED"
      >(input.status),
      created_at: toISOStringSafe(input.created_at),
      order: await ShoppingMallOrderAtSummaryTransformer.transform(input.order),
      productSnapshot:
        await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
          input.productSnapshot,
        ),
      productVariantSnapshot:
        await ShoppingMallProductVariantSnapshotAtSummaryTransformer.transform(
          input.productVariantSnapshot,
        ),
      seller: await ShoppingMallSellerAtSummaryTransformer.transform(
        input.seller,
      ),
    };
  }
}
