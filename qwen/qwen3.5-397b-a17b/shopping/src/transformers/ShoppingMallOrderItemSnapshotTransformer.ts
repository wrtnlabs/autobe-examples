import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ShoppingMallOrderItemSnapshotOptionTransformer } from "./ShoppingMallOrderItemSnapshotOptionTransformer";

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
        variant_price: true,
        seller_shop_name: true,
        seller_logo_url: true,
        created_at: true,
        orderItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.shopping_mall_order_itemsFindManyArgs,
        options: ShoppingMallOrderItemSnapshotOptionTransformer.select(),
      },
    } satisfies Prisma.shopping_mall_order_item_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallOrderItemSnapshot> {
    return {
      id: input.id,
      shopping_mall_order_item_id: input.orderItem.id,
      product_name: input.product_name,
      product_description: input.product_description,
      variant_price: input.variant_price,
      seller_shop_name: input.seller_shop_name,
      seller_logo_url: input.seller_logo_url ?? undefined,
      created_at: input.created_at.toISOString(),
      options: await ArrayUtil.asyncMap(
        input.options,
        ShoppingMallOrderItemSnapshotOptionTransformer.transform,
      ),
    } satisfies IShoppingMallOrderItemSnapshot;
  }
}
